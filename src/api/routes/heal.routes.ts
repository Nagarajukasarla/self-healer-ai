import type { FastifyInstance, FastifyPluginAsync, FastifyRequest } from "fastify";
import { z } from "zod";
import { Orchestrator } from "../../core/orchestrator/index.js";
import { logger } from "../../utils/logger.js";

const locatorStrategySchema = z.object({
    type: z.string(),
    value: z.string()
});

const serializedTestErrorSchema = z.object({
    message: z.string().optional(),
    stack: z.string().optional()
});

const serializedTestResultSchema = z.object({
    id: z.string(),
    title: z.string(),
    fullName: z.string(),
    file: z.string(),
    line: z.number(),
    column: z.number(),
    status: z.string(),
    duration: z.number(),
    errors: z.array(serializedTestErrorSchema)
});

const healBodySchema = z.object({
    test: serializedTestResultSchema,
    failedLocator: locatorStrategySchema,
    locatorMetaData: z.record(z.string(), z.any()),
    pageUrl: z.string(),
    pageSource: z.string()
});


export type HealRequestBody = z.infer<typeof healBodySchema>;

export const healRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {

    const orchestrator = new Orchestrator();

    fastify.post("/heal", async (request: FastifyRequest<{ Body: HealRequestBody }>, reply) => {

        logger.info("Received POST /heal request");

        const bodyResult = healBodySchema.safeParse(request.body);

        if (!bodyResult.success) {

            return reply.status(400).send({
                success: false,
                error: "Invalid request payload",
                details: bodyResult.error.format()
            });
        }

        try {
            const result = await orchestrator.heal(bodyResult.data);

            return reply.send(result);

        } catch (err: any) {

            logger.error(err);

            return reply.status(500).send({
                success: false,
                error: err.message
            });
        }
    }
    );
};