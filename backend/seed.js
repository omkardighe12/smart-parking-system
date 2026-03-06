const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Parking = require("./models/Parking");
const parkingData = require("./parkingData");

dotenv.config();

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected to MongoDB for seeding");

        // Clear existing data
        await Parking.deleteMany();
        console.log("🗑️ Existing parking data cleared");

        // Add new data
        const formattedData = parkingData.map(p => {
            const status = p.availableSlots === 0 ? "full" : p.availableSlots <= p.totalSlots * 0.2 ? "almost-full" : "available";
            return { ...p, status };
        });

        await Parking.insertMany(formattedData);
        console.log("✨ Parking data seeded successfully");

        process.exit();
    } catch (err) {
        console.error("❌ Seeding error:", err);
        process.exit(1);
    }
};

seedData();
