const User = require("../models/User");
const Booking = require("../models/Booking");
const Parking = require("../models/Parking");

// Middleware: check admin
exports.isAdmin = (req, res, next) => {
    // req.user is set by protect middleware
    // We need to verify the user is actually admin in DB
    User.findById(req.user.id).then(user => {
        if (!user || !user.isAdmin)
            return res.status(403).json({ message: "Admin access required" });
        req.adminUser = user;
        next();
    }).catch(() => res.status(500).json({ message: "Server error" }));
};

// GET /api/admin/users — list all users
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select("-password").sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

// GET /api/admin/stats — dashboard overview stats
exports.getStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalBookings = await Booking.countDocuments();
        const activeBookings = await Booking.countDocuments({ status: "active" });
        const cancelledBookings = await Booking.countDocuments({ status: "cancelled" });
        const totalParkings = await Parking.countDocuments();

        const revenueData = await Booking.aggregate([
            { $match: { status: { $ne: "cancelled" } } },
            { $group: { _id: null, total: { $sum: "$totalCost" } } }
        ]);
        const totalRevenue = revenueData[0]?.total || 0;

        // Today's stats
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayBookings = await Booking.countDocuments({ createdAt: { $gte: today, $lt: tomorrow } });
        const todayRevenueData = await Booking.aggregate([
            { $match: { createdAt: { $gte: today, $lt: tomorrow }, status: { $ne: "cancelled" } } },
            { $group: { _id: null, total: { $sum: "$totalCost" } } }
        ]);
        const todayRevenue = todayRevenueData[0]?.total || 0;

        res.json({
            totalUsers,
            totalBookings,
            activeBookings,
            cancelledBookings,
            totalParkings,
            totalRevenue,
            todayBookings,
            todayRevenue
        });
    } catch (error) {
        console.error("STATS ERROR:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// DELETE /api/admin/users/:id — remove user
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found" });
        res.json({ message: "User deleted" });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};
