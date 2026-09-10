const mqtt = require("mqtt");
require("dotenv").config();

const DeviceData = require("../models/DeviceData");

console.log("========== MQTT RECEIVER ==========");
console.log("HOST:", process.env.MQTT_HOST);
console.log("PORT:", process.env.MQTT_PORT);

const client = mqtt.connect(
    `mqtts://${process.env.MQTT_HOST}:${process.env.MQTT_PORT}`,
    {
        username: process.env.MQTT_USERNAME,
        password: process.env.MQTT_PASSWORD,
        protocolVersion: 4,
        clean: true
    }
);

const topicForDevice = (deviceId) => `coldtrace/${deviceId}`;
const sessionTopicForDevice = (deviceId) => `coldtrace/${deviceId}/session/config`;

const publishSessionConfig = (deviceId, payload) => {
    return new Promise((resolve, reject) => {
        const topic = sessionTopicForDevice(deviceId);
        const message = JSON.stringify(payload);

        if (!client.connected) {
            return reject(new Error("MQTT client is not connected"));
        }

        client.publish(topic, message, { qos: 1, retain: true }, (err) => {
            if (err) return reject(err);
            console.log(`✅ Session config published to ${topic}`);
            resolve();
        });
    });
};

client.on("connect", () => {
    console.log("==================================");
    console.log("✅ Connected to HiveMQ Cloud");
    console.log("==================================");

    client.subscribe("coldtrace/#", { qos: 1 }, (err) => {
        if (err) {
            console.log("❌ Subscribe Error");
            console.log(err);
        } else {
            console.log("✅ Subscribed to coldtrace/#");
        }
    });
});

client.on("message", async (topic, message, packet) => {
    console.log("\n==================================");
    console.log("🔥 MESSAGE RECEIVED");
    console.log("==================================");
    console.log("Retained:", packet.retain);
    console.log("Topic:", topic);
    console.log("Raw Message:", message.toString());

    // Telemetry topic is exactly coldtrace/<deviceId>.
    // Alert and session topics contain additional path segments and are ignored here.
    const match = topic.match(/^coldtrace\/([^/]+)$/);
    if (!match) return;

    const deviceIdFromTopic = match[1];

    try {
        const data = JSON.parse(message.toString());

        if (
            typeof data.temperature !== "number" ||
            typeof data.prediction !== "number" ||
            typeof data.latitude !== "number" ||
            typeof data.longitude !== "number" ||
            typeof data.battery !== "number" ||
            typeof data.door !== "string" ||
            !data.timestamp
        ) {
            console.log("⚠️ Ignoring invalid telemetry payload");
            return;
        }

        const deviceData = new DeviceData({
            deviceId: data.device_id || data.node_id || deviceIdFromTopic,
            name: data.name || "",
            number: data.number || "",
            temperature: data.temperature,
            prediction: data.prediction,
            latitude: data.latitude,
            longitude: data.longitude,
            door: data.door,
            battery: data.battery,
            timestamp: data.timestamp
        });

        await deviceData.save();
        console.log("✅ Data saved to MongoDB");
    } catch (error) {
        console.log("❌ Error:", error.message);
    }
});

client.on("error", (error) => {
    console.log("❌ MQTT ERROR");
    console.log(error);
});

client.on("reconnect", () => {
    console.log("🔄 Reconnecting...");
});

client.publishSessionConfig = publishSessionConfig;

module.exports = client;
