const mongoose = require("mongoose");

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000;

const connectDB = async (retryCount = 0) => {
    if (!process.env.MONGO_URI) {
        console.error("❌ MONGO_URI is not defined in the .env file.");
        process.exit(1);
    }

    try {
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 8000,
            socketTimeoutMS: 45000,
            connectTimeoutMS: 10000,
            heartbeatFrequencyMS: 10000,
        });
        console.log(`✅ MongoDB Connected`);
    } catch (err) {
        console.error(`❌ MongoDB connection error: ${err.message}`);

        if (retryCount < MAX_RETRIES) {
            console.log(`🔄 Retrying in ${RETRY_DELAY_MS / 1000}s... (${retryCount + 1}/${MAX_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
            return connectDB(retryCount + 1);
        }

        console.error("💥 Could not connect to MongoDB after multiple attempts. Exiting.");
        process.exit(1);
    }
};

// Auto-reconnect when MongoDB drops (transient DNS / network issue)
let isReconnecting = false;
mongoose.connection.on("disconnected", () => {
    console.warn("⚠️  MongoDB disconnected. Attempting to reconnect...");
    if (!isReconnecting) {
        isReconnecting = true;
        setTimeout(async () => {
            try {
                await mongoose.connect(process.env.MONGO_URI, {
                    serverSelectionTimeoutMS: 8000,
                    socketTimeoutMS: 45000,
                });
                console.log("✅ MongoDB reconnected.");
            } catch (err) {
                console.error("❌ Reconnect failed:", err.message);
            } finally {
                isReconnecting = false;
            }
        }, 3000);
    }
});

mongoose.connection.on("reconnected", () => {
    console.log("✅ MongoDB reconnected successfully.");
    isReconnecting = false;
});

mongoose.connection.on("error", (err) => {
    console.error("❌ MongoDB error:", err.message);
});

module.exports = connectDB;
