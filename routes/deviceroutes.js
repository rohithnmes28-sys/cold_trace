console.log("Device routes loaded");
const express = require("express");
const router = express.Router();

const {
    getLatestDeviceData,
    getDeviceHistory,
    getSessions,
    startSession,
    endSession
} = require("../controllers/devicecontroller");

router.get("/latest", getLatestDeviceData);
router.get("/history", getDeviceHistory);
router.get("/sessions", getSessions);
router.post("/session/start", startSession);
router.post("/session/end", endSession);

module.exports = router;
