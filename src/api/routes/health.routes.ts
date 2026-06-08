import type { FastifyInstance, FastifyPluginAsync } from "fastify";

export const healthRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
    fastify.get("/health", async (request, reply) => {
        return reply.status(200).send({
            status: "OK",
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        });
    });

    fastify.get("/", async (request, reply) => {
        return reply.status(200).send({
            status: "OK",
            message: "AI Healer Service is running"
        });
    });
};
