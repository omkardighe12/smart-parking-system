const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    parking: { type: mongoose.Schema.Types.ObjectId, ref: "Parking", required: true },
    parkingName: { type: String },
    vehicleNumber: { type: String, required: true },
    inTime: { type: String, required: true },
    outTime: { type: String, required: true },
    duration: { type: Number },      // hours
    totalCost: { type: Number },     // INR
    status: {
        type: String,
        enum: ["active", "completed", "cancelled"],
        default: "active"
    }
}, { timestamps: true });

module.exports = mongoose.model("Booking", bookingSchema);
