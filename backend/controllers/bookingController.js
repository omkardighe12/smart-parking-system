const Booking = require("../models/Booking");
const Parking = require("../models/Parking");

// Helper: recalculate parking status
const updateParkingStatus = async (parking) => {
    if (parking.availableSlots <= 0) parking.status = "full";
    else if (parking.availableSlots <= parking.totalSlots * 0.2) parking.status = "almost-full";
    else parking.status = "available";
    await parking.save();
};

// POST /api/bookings — Create a booking
exports.createBooking = async (req, res) => {
    try {
        const { parkingId, vehicleNumber, inTime, outTime } = req.body;
        const userId = req.user.id;

        if (!parkingId || !vehicleNumber || !inTime || !outTime)
            return res.status(400).json({ message: "All fields are required" });

        const parking = await Parking.findById(parkingId);
        if (!parking) return res.status(404).json({ message: "Parking location not found" });
        if (parking.availableSlots <= 0) return res.status(400).json({ message: "No slots available" });

        // Calculate duration & cost
        const inDate = new Date(inTime);
        const outDate = new Date(outTime);
        if (outDate <= inDate) return res.status(400).json({ message: "Out time must be after in time" });

        const durationMs = outDate - inDate;
        const duration = Math.ceil(durationMs / (1000 * 60 * 60)); // hours, rounded up
        const totalCost = duration * (parking.pricePerHour || 40);

        // Create booking
        const booking = await Booking.create({
            user: userId,
            parking: parkingId,
            parkingName: parking.name,
            vehicleNumber,
            inTime,
            outTime,
            duration,
            totalCost,
            status: "active"
        });

        // Reduce available slots
        parking.availableSlots -= 1;
        await updateParkingStatus(parking);

        res.status(201).json({
            message: "Booking confirmed!",
            booking: {
                id: booking._id,
                parkingName: parking.name,
                location: parking.location,
                vehicleNumber,
                inTime,
                outTime,
                duration,
                totalCost,
                status: booking.status
            }
        });
    } catch (error) {
        console.error("CREATE BOOKING ERROR:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// GET /api/bookings/my — Get logged-in user's bookings
exports.getUserBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({ user: req.user.id })
            .populate("parking", "name location pricePerHour")
            .sort({ createdAt: -1 });

        res.json(bookings);
    } catch (error) {
        console.error("GET BOOKINGS ERROR:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// GET /api/bookings — Get all bookings (admin)
exports.getAllBookings = async (req, res) => {
    try {
        const bookings = await Booking.find()
            .populate("user", "name email")
            .populate("parking", "name location")
            .sort({ createdAt: -1 });
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

// PUT /api/bookings/:id/cancel — Cancel booking
exports.cancelBooking = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ message: "Booking not found" });
        if (booking.user.toString() !== req.user.id)
            return res.status(403).json({ message: "Not authorized" });
        if (booking.status !== "active")
            return res.status(400).json({ message: "Only active bookings can be cancelled" });

        booking.status = "cancelled";
        await booking.save();

        // Restore slot
        const parking = await Parking.findById(booking.parking);
        if (parking) {
            parking.availableSlots = Math.min(parking.availableSlots + 1, parking.totalSlots);
            await updateParkingStatus(parking);
        }

        res.json({ message: "Booking cancelled successfully" });
    } catch (error) {
        console.error("CANCEL BOOKING ERROR:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// PUT /api/bookings/:id/extend — Extend booking
exports.extendBooking = async (req, res) => {
    try {
        const { extraHours } = req.body;
        if (!extraHours || extraHours < 1)
            return res.status(400).json({ message: "extraHours must be at least 1" });

        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ message: "Booking not found" });
        if (booking.user.toString() !== req.user.id)
            return res.status(403).json({ message: "Not authorized" });
        if (booking.status !== "active")
            return res.status(400).json({ message: "Only active bookings can be extended" });

        const parking = await Parking.findById(booking.parking);
        const pricePerHour = parking?.pricePerHour || 40;

        const oldOut = new Date(booking.outTime);
        oldOut.setHours(oldOut.getHours() + Number(extraHours));

        booking.outTime = oldOut.toISOString();
        booking.duration = (booking.duration || 0) + Number(extraHours);
        booking.totalCost = (booking.totalCost || 0) + (Number(extraHours) * pricePerHour);
        await booking.save();

        res.json({ message: `Booking extended by ${extraHours} hour(s)`, booking });
    } catch (error) {
        console.error("EXTEND BOOKING ERROR:", error);
        res.status(500).json({ message: "Server error" });
    }
};
