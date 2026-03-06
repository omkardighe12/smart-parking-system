const mongoose = require("mongoose");

const parkingSchema = new mongoose.Schema({
    name: { type: String, required: true },
    location: { type: String, required: true },
    totalSlots: { type: Number, required: true },
    availableSlots: { type: Number, required: true },
    pricePerHour: { type: Number, default: 40 },
    status: {
        type: String,
        enum: ["available", "almost-full", "full"],
        default: "available"
    }
}, { timestamps: true });

module.exports = mongoose.model("Parking", parkingSchema);
