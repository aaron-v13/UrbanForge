const mongoose = require("mongoose");

const BuildingSchema = new mongoose.Schema(
    {
        userId: {
            type: String,
            default: "guest",
            index: true
        },
        buildingId: {
            type: String,
            required: true,
            unique: true
        },
        assetId: {
            type: String,
            required: true
        },
        assetName: {
            type: String,
            default: "Building"
        },
        modelPath: {
            type: String,
            required: true
        },
        scale: {
            type: Number,
            default: 1
        },
        position: {
            x: { type: Number, default: 0 },
            y: { type: Number, default: 0 },
            z: { type: Number, default: 0 }
        },
        rotation: {
            x: { type: Number, default: 0 },
            y: { type: Number, default: 0 },
            z: { type: Number, default: 0 }
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Building", BuildingSchema);
