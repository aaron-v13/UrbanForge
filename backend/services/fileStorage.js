const fs = require("fs/promises");
const path = require("path");

const DATA_DIR = path.join(__dirname, "../../data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

async function ensureUsersFile() {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
        await fs.access(USERS_FILE);
    } catch (error) {
        if (error.code !== "ENOENT") throw error;
        await fs.writeFile(USERS_FILE, "[]", "utf8");
    }
}

async function readUsers() {
    await ensureUsersFile();
    try {
        const content = await fs.readFile(USERS_FILE, "utf8");
        const trimmed = content.trim();
        if (!trimmed) {
            await fs.writeFile(USERS_FILE, "[]", "utf8");
            return [];
        }
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error("Error reading users.json:", error.message);
        await fs.writeFile(USERS_FILE, "[]", "utf8");
        return [];
    }
}

async function writeUsers(data) {
    await ensureUsersFile();
    await fs.writeFile(USERS_FILE, JSON.stringify(data, null, 2), "utf8");
}

module.exports = { ensureUsersFile, readUsers, writeUsers, USERS_FILE };
