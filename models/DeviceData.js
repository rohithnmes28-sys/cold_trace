const mongoose = require("mongoose");

const deviceDataSchema = new mongoose.Schema({
    deviceId: {
        type: String,
        required: true,
        index: true
    },
    name: {
        type: String,
        default: ""
    },
    number: {
        type: String,
        default: ""
    },
    temperature: {
        type: Number,
        required: true
    },
    prediction: {
        type: Number,
        required: true
    },
    latitude: {
        type: Number,
        required: true
    },
    longitude: {
        type: Number,
        required: true
    },
    door: {
        type: String,
        required: true
    },
    battery: {
        type: Number,
        required: true
    },
    timestamp: {
        type: Date,
        required: true
    }
});

module.exports = mongoose.model("DeviceData", deviceDataSchema);
