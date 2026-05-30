import { type AgentRequest, type AgentResponse } from "../types/index.js";
import { runHealingAgent } from "../agents/healingAgent.js";
import { buildHealingPrompt } from "../utils/prompt-builder.js";

export class HealerService {

    async healLocator(request: AgentRequest): Promise<AgentResponse> {
        try {
            const prompt = buildHealingPrompt(request);

            const raw = await runHealingAgent(prompt);
            
            return JSON.parse(raw);
    
        } catch (err) {
            console.error(err);
            return {
                confidence: 0,
                strategy: "Healing failed"
            };
        }
    }
}