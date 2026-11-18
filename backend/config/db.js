const mongoose = require("mongoose");

async function connectDB() {
    const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/urbanforge";
    try {
        await mongoose.connect(mongoUri, {
            serverSelectionTimeoutMS: 2000 // Don't hang forever if local mongo is off
        });
        console.log(`[MongoDB] Connected successfully to ${mongoUri}`);
    } catch (error) {
        console.warn(`[MongoDB] Could not connect to MongoDB (${error.message}). Operating with JSON file fallback.`);
    }
}

function getDbStatus() {
    return mongoose.connection.readyState === 1;
}

module.exports = { connectDB, getDbStatus };
