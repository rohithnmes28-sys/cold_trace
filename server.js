const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");

// Load environment variables
dotenv.config();

// Database Connection
const connectDB = require("./config/db");

// Routes
const deviceRoutes = require("./routes/deviceroutes");

const app = express();

// Connect MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Start MQTT Subscriber
require("./mqtt/mqttClient");

// API Routes
app.use("/api/device", deviceRoutes);

// Test Route
app.get("/", (req, res) => {
    res.send("Healthcare Receiver Running");
});

// Start Server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});