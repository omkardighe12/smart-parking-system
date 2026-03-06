const Contact = require("../models/Contact");

// POST /api/contact
exports.submitContact = async (req, res) => {
    try {
        const { name, email, message } = req.body;
        if (!name || !email || !message)
            return res.status(400).json({ message: "All fields are required" });

        await Contact.create({ name, email, message });
        res.status(201).json({ success: true, message: "Message received! We'll get back to you soon." });
    } catch (error) {
        console.error("CONTACT ERROR:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// GET /api/contact — Admin only
exports.getAllContacts = async (req, res) => {
    try {
        const contacts = await Contact.find().sort({ createdAt: -1 });
        res.json(contacts);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};
