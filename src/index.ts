import Fastify from "fastify";

import { healRoutes } from "./api/routes/heal.routes.js";

const app = Fastify({ logger: true });

app.register(healRoutes);

const start = async () => {
    try {
        await app.listen({
            port: 3001,
            host: "0.0.0.0"
        });
        console.log("AI Healer Service running on port 3001");
    } catch (err) {
        app.log.error(err);

        process.exit(1);
    }
};

start();