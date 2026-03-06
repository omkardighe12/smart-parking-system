const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookingController");
const protect = require("../middleware/authMiddleware");
const adminController = require("../controllers/adminController");

// All booking routes require authentication
router.post("/", protect, bookingController.createBooking);
router.get("/my", protect, bookingController.getUserBookings);
router.get("/", protect, adminController.isAdmin, bookingController.getAllBookings); // admin only
router.put("/:id/cancel", protect, bookingController.cancelBooking);
router.put("/:id/extend", protect, bookingController.extendBooking);

module.exports = router;
