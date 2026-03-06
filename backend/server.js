const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");
const connectDB = require("./configdb");

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// ── Serve frontend static files ──────────────────────────────────────────────
app.use(express.static(path.join(__dirname, "../smart-parking-system/frontend")));

// Redirect root to homepage
app.get("/", (req, res) => {
    res.redirect("/html/homepage.html");
});


// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/parking", require("./routes/parkingRoutes"));
app.use("/api/bookings", require("./routes/bookingRoutes"));
app.use("/api/contact", require("./routes/contactRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));

// Health check API
app.get("/api", (req, res) => {
    res.json({ message: "🚗 Smart Parking API is running!", status: "OK", timestamp: new Date().toISOString() });
});

// 404 handler — catches unknown routes
app.use((req, res) => {
    res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Global error handler — catches errors thrown in route handlers
app.use((err, req, res, next) => {
    console.error("💥 Unhandled Error:", err.stack || err.message);
    res.status(err.status || 500).json({
        message: err.message || "Internal Server Error",
        ...(process.env.NODE_ENV === "development" && { stack: err.stack })
    });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await connectDB();
        const server = app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
        });

        server.on("error", (err) => {
            if (err.code === "EADDRINUSE") {
                console.error(`❌ Port ${PORT} is already in use.`);
                console.error(`   Run this to free it:  npx kill-port ${PORT}`);
                console.error(`   Or in PowerShell:     Stop-Process -Id (Get-NetTCPConnection -LocalPort ${PORT}).OwningProcess -Force`);
                process.exit(1);
            } else {
                throw err;
            }
        });
    } catch (err) {
        console.error("❌ Failed to start server:", err.message);
        process.exit(1);
    }
};

startServer();
