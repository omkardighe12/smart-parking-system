const Parking = require("../models/Parking");

// GET all parking locations
exports.getAllParking = async (req, res) => {
    try {
        const parkings = await Parking.find();
        res.json(parkings);
    } catch (error) {
        console.error("GET PARKING ERROR:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// GET single parking by ID
exports.getParkingById = async (req, res) => {
    try {
        const parking = await Parking.findById(req.params.id);
        if (!parking) return res.status(404).json({ message: "Parking not found" });
        res.json(parking);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

// POST create parking (admin only)
exports.createParking = async (req, res) => {
    try {
        const { name, location, totalSlots, availableSlots, pricePerHour } = req.body;
        if (!name || !location || !totalSlots)
            return res.status(400).json({ message: "name, location, and totalSlots are required" });

        const slots = availableSlots !== undefined ? availableSlots : totalSlots;
        const status = slots === 0 ? "full" : slots <= totalSlots * 0.2 ? "almost-full" : "available";

        const parking = await Parking.create({ name, location, totalSlots, availableSlots: slots, pricePerHour: pricePerHour || 40, status });
        res.status(201).json(parking);
    } catch (error) {
        console.error("CREATE PARKING ERROR:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// PUT update parking (admin only)
exports.updateParking = async (req, res) => {
    try {
        const parking = await Parking.findById(req.params.id);
        if (!parking) return res.status(404).json({ message: "Parking not found" });

        Object.assign(parking, req.body);

        // Recalculate status
        if (parking.availableSlots === 0) parking.status = "full";
        else if (parking.availableSlots <= parking.totalSlots * 0.2) parking.status = "almost-full";
        else parking.status = "available";

        await parking.save();
        res.json(parking);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

// DELETE parking (admin only)
exports.deleteParking = async (req, res) => {
    try {
        const parking = await Parking.findByIdAndDelete(req.params.id);
        if (!parking) return res.status(404).json({ message: "Parking not found" });
        res.json({ message: "Parking deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

// GET daily stats for admin dashboard
exports.getDailyStats = async (req, res) => {
    try {
        const Booking = require("../models/Booking");
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const totalBookings = await Booking.countDocuments({ createdAt: { $gte: today, $lt: tomorrow } });
        const activeBookings = await Booking.countDocuments({ status: "active" });
        const totalRevenue = await Booking.aggregate([
            { $match: { createdAt: { $gte: today, $lt: tomorrow }, status: { $ne: "cancelled" } } },
            { $group: { _id: null, total: { $sum: "$totalCost" } } }
        ]);
        const totalParkings = await Parking.countDocuments();
        const availableParkings = await Parking.countDocuments({ status: "available" });

        res.json({
            todayBookings: totalBookings,
            activeBookings,
            todayRevenue: totalRevenue[0]?.total || 0,
            totalParkings,
            availableParkings
        });
    } catch (error) {
        console.error("DAILY STATS ERROR:", error);
        res.status(500).json({ message: "Server error" });
    }
};
