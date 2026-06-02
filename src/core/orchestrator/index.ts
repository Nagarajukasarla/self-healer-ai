import { type HealingRequest, type HealingResponse, type AgentRequest } from "../../types/index.js";
import { parseCandidates } from "../parser/index.js";
import { scoreCandidates } from "../scorer/index.js";
import { HealerService } from "../../services/healer.service.js";
import { logger } from "../../utils/logger.js";

function inferTagName(selector: string, type?: string): string | undefined {
    if (!selector) return undefined;
    
    selector = selector.trim();
    
    if (type?.toLowerCase() === "xpath" || selector.startsWith("//") || selector.startsWith("xpath=")) {
        const match = selector.match(/(?:\/)+([a-zA-Z0-9-]+)/);
        if (match) {
            return match[1];
        }
    }
    
    if (selector.startsWith("css=")) {
        selector = selector.substring(4);
    }
    
    const match = selector.match(/^[a-zA-Z0-9-]+/);
    if (match) {
        return match[0];
    }
    
    return undefined;
}

function inferSelectorType(selector: string): string {
    if (!selector) return "css";
    const clean = selector.trim();
    if (clean.startsWith("//") || clean.startsWith("xpath=") || clean.startsWith("(/") || clean.startsWith("(//")) {
        return "xpath";
    }
    return "css";
}

export class Orchestrator {

    private healerService: HealerService;

    constructor() {
        this.healerService = new HealerService();
    }

    async heal(request: HealingRequest): Promise<HealingResponse> {

        const candidates = parseCandidates(request.pageSource);
        
        // logger.info(JSON.stringify(candidates, null, 2));

        if (candidates.length === 0) {
            return {
                strategy: "No candidates found"
            };
        }
        const keys = Object.keys(request.locatorMetaData || {});
        const key = keys[0] || "unknown";
        const metadata = request.locatorMetaData[key] || {};

        const inferredTag = inferTagName(request.failedLocator.value, request.failedLocator.type);

        const scored = scoreCandidates(request.failedLocator.value, {
            tagName: inferredTag,
            text: typeof metadata.text === "string" ? metadata.text : undefined,
            attributes: metadata.attributes && typeof metadata.attributes === "object" ? metadata.attributes as Record<string, string> : undefined
        }, candidates);

        const topCandidates = scored.slice(0, 5).map(item => ({
            tagName: item.candidate.tagName,
            text: item.candidate.text,
            attributes: item.candidate.attributes,
            selectorHints: item.candidate.selectorHints,
            score: item.score,
            matchedReasons: item.matchedReasons
        }));

        const agentRequest: AgentRequest = {
            failedLocatorKey: key,
            failedLocator: request.failedLocator,
            locatorMetaData: metadata,
            topCandidates
        };

        console.log(JSON.stringify(agentRequest, null, 2));

        const result = await this.healerService.healLocator(agentRequest);

        if (!result.newLocator) {
            return {
                strategy: "AI could not heal locator"
            };
        }

        const type = result.type || inferSelectorType(result.newLocator);

        return {
            type,
            newLocator: result.newLocator,
            confidence: result.confidence || 0,
            strategy: result.strategy || ""
        };
    }
}
