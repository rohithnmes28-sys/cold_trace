const DeviceData = require("../models/DeviceData");
const Session = require("../models/Session");
const mqttClient = require("../mqtt/mqttClient");

const normalizeDeviceId = (value) => String(value || "").trim();

const isValidPhone = (phone) => {
    const value = String(phone || "").trim();
    return /^\+?[0-9]{10,15}$/.test(value);
};

// Get latest device data. Optional query: ?deviceId=device001
const getLatestDeviceData = async (req, res) => {
    try {
        const deviceId = normalizeDeviceId(req.query.deviceId);
        const filter = deviceId ? { deviceId } : {};

        const latestData = await DeviceData.findOne(filter).sort({ timestamp: -1, _id: -1 });

        if (!latestData) {
            return res.status(404).json({ message: "No device data found" });
        }

        res.set({
            "Cache-Control": "no-store",
            "Pragma": "no-cache",
            "Expires": "0"
        });

        res.json(latestData);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get telemetry history. Optional query: ?deviceId=device001&limit=200
const getDeviceHistory = async (req, res) => {
    try {
        const deviceId = normalizeDeviceId(req.query.deviceId);
        const limit = Math.min(Math.max(parseInt(req.query.limit || "200", 10), 1), 1000);
        const filter = deviceId ? { deviceId } : {};

        const history = await DeviceData.find(filter)
            .sort({ timestamp: -1, _id: -1 })
            .limit(limit);

        res.json(history);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getSessions = async (req, res) => {
    try {
        const sessions = await Session.find().sort({ active: -1, startedAt: -1 });
        res.json(sessions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const startSession = async (req, res) => {
    try {
        const deviceId = normalizeDeviceId(req.body.deviceId);
        const name = String(req.body.name || "").trim();
        const number = String(req.body.number || "").trim();

        if (!deviceId || !name || !number) {
            return res.status(400).json({
                message: "deviceId, name and number are required"
            });
        }

        if (!isValidPhone(number)) {
            return res.status(400).json({
                message: "Enter a valid phone number (10-15 digits, optional +)"
            });
        }

        // Only one active transport session is allowed per physical node.
        await Session.updateMany(
            { deviceId, active: true },
            { $set: { active: false, endedAt: new Date() } }
        );

        const session = await Session.create({
            deviceId,
            name,
            number,
            active: true,
            startedAt: new Date()
        });

        const payload = {
            device_id: deviceId,
            name,
            number,
            active: true
        };

        await mqttClient.publishSessionConfig(deviceId, payload);

        res.status(201).json(session);
    } catch (error) {
        console.error("Session start error:", error);
        res.status(500).json({ message: error.message });
    }
};

const endSession = async (req, res) => {
    try {
        const deviceId = normalizeDeviceId(req.body.deviceId);

        if (!deviceId) {
            return res.status(400).json({ message: "deviceId is required" });
        }

        const session = await Session.findOneAndUpdate(
            { deviceId, active: true },
            { $set: { active: false, endedAt: new Date() } },
            { new: true }
        );

        await mqttClient.publishSessionConfig(deviceId, {
            device_id: deviceId,
            name: "",
            number: "",
            active: false
        });

        res.json(session || { deviceId, active: false });
    } catch (error) {
        console.error("Session end error:", error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getLatestDeviceData,
    getDeviceHistory,
    getSessions,
    startSession,
    endSession
};
