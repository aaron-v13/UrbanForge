const Building = require("../models/Building");
const { getDbStatus } = require("../config/db");
const fs = require("fs/promises");
const path = require("path");

const BUILDINGS_FILE = path.join(__dirname, "../../data/buildings.json");

async function readBuildingsFile() {
    try {
        const content = await fs.readFile(BUILDINGS_FILE, "utf8");
        return JSON.parse(content || "[]");
    } catch {
        return [];
    }
}

async function writeBuildingsFile(data) {
    try {
        await fs.mkdir(path.dirname(BUILDINGS_FILE), { recursive: true });
        await fs.writeFile(BUILDINGS_FILE, JSON.stringify(data, null, 2), "utf8");
    } catch (err) {
        console.error("Error writing buildings file:", err);
    }
}

// ---------------------------------------------
// GET ALL BUILDINGS FOR USER
// ---------------------------------------------
async function getBuildings(req, res) {
    try {
        const userId = req.session?.userId || "guest";

        if (getDbStatus()) {
            const buildings = await Building.find({ userId });
            return res.json({ success: true, buildings, storage: "MongoDB" });
        } else {
            const all = await readBuildingsFile();
            const userBuildings = all.filter(b => b.userId === userId);
            return res.json({ success: true, buildings: userBuildings, storage: "JSON File" });
        }
    } catch (error) {
        console.error("Get buildings error:", error);
        res.status(500).json({ success: false, message: "Could not load buildings." });
    }
}

// ---------------------------------------------
// SAVE NEW / UPDATE BUILDING
// ---------------------------------------------
async function addBuilding(req, res) {
    try {
        const userId = req.session?.userId || "guest";
        const { buildingId, assetId, assetName, modelPath, scale, position, rotation } = req.body;

        if (!buildingId || !modelPath) {
            return res.status(400).json({ success: false, message: "Missing buildingId or modelPath." });
        }

        const buildingData = {
            userId,
            buildingId,
            assetId: assetId || "building",
            assetName: assetName || "Building",
            modelPath,
            scale: scale ?? 1,
            position: position || { x: 0, y: 0, z: 0 },
            rotation: rotation || { x: 0, y: 0, z: 0 }
        };

        if (getDbStatus()) {
            const saved = await Building.findOneAndUpdate(
                { buildingId, userId },
                buildingData,
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
            console.log(`[MongoDB] Building saved: ${buildingId} (${assetName})`);
            return res.status(201).json({ success: true, message: "Building saved to MongoDB!", building: saved });
        } else {
            const all = await readBuildingsFile();
            const idx = all.findIndex(b => b.buildingId === buildingId && b.userId === userId);
            if (idx >= 0) {
                all[idx] = buildingData;
            } else {
                all.push(buildingData);
            }
            await writeBuildingsFile(all);
            console.log(`[JSON File] Building saved: ${buildingId} (${assetName})`);
            return res.status(201).json({ success: true, message: "Building saved to JSON file!", building: buildingData });
        }
    } catch (error) {
        console.error("Save building error:", error);
        res.status(500).json({ success: false, message: "Could not save building." });
    }
}

// ---------------------------------------------
// DELETE BUILDING
// ---------------------------------------------
async function deleteBuilding(req, res) {
    try {
        const userId = req.session?.userId || "guest";
        const { buildingId } = req.params;

        if (!buildingId) {
            return res.status(400).json({ success: false, message: "buildingId parameter required." });
        }

        if (getDbStatus()) {
            const deleted = await Building.findOneAndDelete({ buildingId, userId });
            console.log(`[MongoDB] Building deleted: ${buildingId}`);
            return res.json({ success: true, message: "Building deleted from MongoDB!", deleted });
        } else {
            const all = await readBuildingsFile();
            const filtered = all.filter(b => !(b.buildingId === buildingId && b.userId === userId));
            await writeBuildingsFile(filtered);
            console.log(`[JSON File] Building deleted: ${buildingId}`);
            return res.json({ success: true, message: "Building deleted from JSON file!" });
        }
    } catch (error) {
        console.error("Delete building error:", error);
        res.status(500).json({ success: false, message: "Could not delete building." });
    }
}

module.exports = { getBuildings, addBuilding, deleteBuilding };
