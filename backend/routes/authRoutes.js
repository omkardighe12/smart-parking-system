const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// REGISTER
router.post("/register", authController.register);

// LOGIN
router.post("/login", authController.login);

// MAKE ADMIN — elevate logged-in user to admin using secret code
router.post("/make-admin", authController.makeAdmin);

module.exports = router;
