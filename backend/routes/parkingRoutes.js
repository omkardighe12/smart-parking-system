const express = require("express");
const router = express.Router();
const parkingController = require("../controllers/parkingController");
const protect = require("../middleware/authMiddleware");
const adminController = require("../controllers/adminController");

// Public routes
router.get("/", parkingController.getAllParking);
router.get("/stats/daily", protect, adminController.isAdmin, parkingController.getDailyStats); // admin only
router.get("/:id", parkingController.getParkingById);

// Admin-only routes (protected)
router.post("/", protect, adminController.isAdmin, parkingController.createParking);
router.put("/:id", protect, adminController.isAdmin, parkingController.updateParking);
router.delete("/:id", protect, adminController.isAdmin, parkingController.deleteParking);

module.exports = router;
