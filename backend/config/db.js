const dns = require("dns");
const mongoose = require("mongoose");

// Fix for Windows / ISP DNS blocking MongoDB SRV queries (querySrv ECONNREFUSED)
try {
    dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);
} catch (e) {
    // Keep default DNS if setServers is restricted
}

async function connectDB() {
    const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/urbanforge";
    try {
        await mongoose.connect(mongoUri, {
            serverSelectionTimeoutMS: 5000 // 5 seconds timeout
        });
        console.log(`[MongoDB] Connected successfully to Atlas/Mongo: ${mongoUri.replace(/:([^@]+)@/, ":****@")}`);
    } catch (error) {
        console.warn(`[MongoDB] Could not connect to MongoDB (${error.message}). Operating with JSON file fallback.`);
    }
}

function getDbStatus() {
    return mongoose.connection.readyState === 1;            // tells whether mongoDB is connected or not 
}

module.exports = { connectDB, getDbStatus };                // makes these function available for other files too 
