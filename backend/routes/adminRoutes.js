const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const protect = require("../middleware/authMiddleware");

// All admin routes need auth + admin check
router.use(protect, adminController.isAdmin);

router.get("/stats", adminController.getStats);
router.get("/users", adminController.getAllUsers);
router.delete("/users/:id", adminController.deleteUser);

module.exports = router;
