const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
    {
        deviceId: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        name: {
            type: String,
            required: true,
            trim: true
        },
        number: {
            type: String,
            required: true,
            trim: true
        },
        active: {
            type: Boolean,
            default: true,
            index: true
        },
        startedAt: {
            type: Date,
            default: Date.now
        },
        endedAt: {
            type: Date,
            default: null
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Session", sessionSchema);
