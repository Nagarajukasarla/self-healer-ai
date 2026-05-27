import Fastify from "fastify";
import { healRoutes } from "./api/routes/heal.routes.js";

const app = Fastify({ logger: true });

app.register(healRoutes);

app.listen({
  port: 3001,
  host: "0.0.0.0",
});

console.log("AI Healer Service running on 3001");
