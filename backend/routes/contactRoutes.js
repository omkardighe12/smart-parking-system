const express = require("express");
const router = express.Router();
const contactController = require("../controllers/contactController");
const protect = require("../middleware/authMiddleware");

// Submit contact message (public)
router.post("/", contactController.submitContact);

// Get all messages (admin only)
router.get("/", protect, contactController.getAllContacts);

module.exports = router;
