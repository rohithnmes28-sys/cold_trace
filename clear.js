const mqtt = require("mqtt");
require("dotenv").config();

const client = mqtt.connect({
    host: process.env.MQTT_HOST,
    port: Number(process.env.MQTT_PORT),
    protocol: "mqtts",
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD
});

client.on("connect", () => {
    console.log("Connected");

    client.publish(
        "coldtrace/device001",
        "",
        { retain: true },
        (err) => {
            if (err) {
                console.log(err);
            } else {
                console.log("✅ Retained message deleted");
            }

            client.end();
        }
    );
});