const mqtt = require("mqtt");
require("dotenv").config();

console.log("========== MQTT PUBLISHER ==========");

console.log("HOST:", process.env.MQTT_HOST);
console.log("PORT:", process.env.MQTT_PORT);
console.log("TOPIC:", process.env.MQTT_TOPIC);

const client = mqtt.connect(
    `mqtts://${process.env.MQTT_HOST}:${process.env.MQTT_PORT}`,
    {
        username: process.env.MQTT_USERNAME,
        password: process.env.MQTT_PASSWORD,
        protocolVersion: 4,
        clean: true
    }
);

console.log("Connecting Publisher...");

client.on("connect", () => {

    console.log("✅ Publisher Connected");

    const data = {
  "device_id": "device001",
  "name": "Test Carrier",
  "number": "9876543210",
  "temperature": 4,
  "battery": 95,
  "prediction": 70,
  "door": "Closed",
  "latitude": 12.9716,
  "longitude": 77.5946,
  "timestamp": "2026-07-29T12:35:00.000Z"
}

    console.log("\nPublishing:");
    console.log(data);

    client.publish(

        process.env.MQTT_TOPIC,

        JSON.stringify(data),

        {
            qos: 1,
            retain: false
        },

        (err) => {

            if (err) {

                console.log("❌ Publish Failed");
                console.log(err);

            } else {

                console.log("✅ Publish Success");

            }

            setTimeout(() => {

                client.end();
                console.log("Publisher Closed");

            }, 1000);

        }

    );

});

client.on("error", (error) => {

    console.log("❌ Publisher Error");
    console.log(error);

});