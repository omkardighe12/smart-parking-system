const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// ================= REGISTER =================
exports.register = async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;

        if (!name || !email || !phone || !password)
            return res.status(400).json({ message: "All fields are required" });

        const existingUser = await User.findOne({ email });
        if (existingUser)
            return res.status(400).json({ message: "User already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ name, email, phone, password: hashedPassword });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });

        res.status(201).json({
            message: "User registered successfully",
            token,
            user: { id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin || false }
        });
    } catch (error) {
        console.error("REGISTER ERROR:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// ================= LOGIN =================
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "Invalid credentials" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });

        res.json({
            token,
            user: { id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin || false }
        });
    } catch (error) {
        console.error("LOGIN ERROR:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// ================= MAKE ADMIN =================
exports.makeAdmin = async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer "))
            return res.status(401).json({ success: false, message: "Not authenticated. Please log in first." });

        const token = authHeader.split(" ")[1];
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (_) {
            return res.status(401).json({ success: false, message: "Session expired. Please log in again." });
        }

        const { adminSecret } = req.body;
        if (!adminSecret)
            return res.status(400).json({ success: false, message: "Admin secret code is required." });
        if (adminSecret !== process.env.ADMIN_SECRET)
            return res.status(403).json({ success: false, message: "Incorrect admin secret code." });

        const user = await User.findById(decoded.id);
        if (!user) return res.status(404).json({ success: false, message: "User not found." });

        if (user.isAdmin)
            return res.json({ success: true, message: "You are already an admin! 👑", alreadyAdmin: true });

        user.isAdmin = true;
        await user.save();

        res.json({
            success: true,
            message: "Admin access granted successfully! 🎉",
            user: { id: user._id, name: user.name, email: user.email, isAdmin: true }
        });
    } catch (error) {
        console.error("MAKE ADMIN ERROR:", error);
        res.status(500).json({ success: false, message: "Server error." });
    }
};
