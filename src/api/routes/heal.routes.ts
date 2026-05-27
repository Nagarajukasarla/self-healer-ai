import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { Orchestrator } from "../../core/orchestrator/index.js";
import { logger } from "../../utils/logger.js";
import { z } from "zod";

// Define validation schema for the healing payload
const healBodySchema = z.object({
  failedLocator: z.string().min(1, "failedLocator is required"),
  failedLocatorMetadata: z.object({
    tagName: z.string().optional(),
    text: z.string().optional(),
    errorMessage: z.string().optional(),
    attributes: z.record(z.string(), z.string()).optional(),
  }).optional().default({}),
  htmlContext: z.string().min(1, "htmlContext is required"),
});

export const healRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const orchestrator = new Orchestrator();

  fastify.post("/heal", async (request, reply) => {
    logger.info("Received POST /heal request.");

    // Parse and validate body
    const bodyResult = healBodySchema.safeParse(request.body);
    if (!bodyResult.success) {
      logger.warn(`Validation failed for /heal body: ${JSON.stringify(bodyResult.error.format())}`);
      return reply.status(400).send({
        success: false,
        error: "Invalid request payload",
        details: bodyResult.error.format(),
      });
    }

    const { failedLocator, failedLocatorMetadata, htmlContext } = bodyResult.data;

    try {
      const result = await orchestrator.heal(failedLocator, failedLocatorMetadata, htmlContext);
      
      if (!result.success) {
        logger.warn(`Locator healing unsuccessful: ${result.error}`);
        return reply.status(422).send(result);
      }

      logger.info(`Locator healing successful! Suggestion: "${result.healedLocator?.locator}"`);
      return reply.send(result);
    } catch (err: any) {
      logger.error(`Error in /heal handler: ${err.message}`);
      return reply.status(500).send({
        success: false,
        error: `Internal server error during healing: ${err.message}`,
      });
    }
  });
};
