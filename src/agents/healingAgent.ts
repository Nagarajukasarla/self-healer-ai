import { HealerSDK } from "../sdk/healer.js";
import type { ScoredCandidate } from "../core/scorer/index.js";
import { logger } from "../utils/logger.js";

export interface HealingSuggestion {
  locator: string;
  confidence: number;
  reasoning: string;
}

export interface HealingAgentResponse {
  success: boolean;
  suggestions: HealingSuggestion[];
}

export class HealingAgent {
  private sdk: HealerSDK;

  constructor(sdk: HealerSDK) {
    this.sdk = sdk;
  }

  /**
   * Formulates context and queries Gemma-2 to suggest healed locators.
   * 
   * @param failedLocator The broken selector string.
   * @param failedLocatorMetadata Failure context (text, attrs, error msg).
   * @param rankedCandidates Best candidate elements ranked by score.
   * @param validationFeedback Error feedback from previous validation failures (if retrying).
   */
  async heal(
    failedLocator: string,
    failedLocatorMetadata: any = {},
    rankedCandidates: ScoredCandidate[],
    validationFeedback = ""
  ): Promise<HealingAgentResponse> {
    logger.info("Formulating LLM prompt for Healing Agent...");

    if (rankedCandidates.length === 0) {
      logger.warn("No ranked candidates provided to Healing Agent.");
      return { success: false, suggestions: [] };
    }

    const systemPrompt = `You are an expert AI Test Automation Engineer specializing in healing broken test locators (CSS, XPath) for web automation frameworks (Playwright, Selenium, Cypress).
Your task is to analyze a broken locator, its failure metadata, and a ranked list of candidate elements currently in the DOM to suggest the best, most robust replacement locator.

Guidelines:
1. Always prefer stable test-specific attributes if they exist (e.g. [data-testid="val"], [data-cy="val"]).
2. Use clean, stable CSS selectors (e.g. tag#id, tag.classes, or tag[attr=val]) or robust XPath.
3. Avoid dynamic class lists (e.g. dynamic IDs like auto-generated numbers, highly volatile layout classes like tailwind utilities unless required for uniqueness).
4. Provide up to 3 alternative locator options, ranked by your confidence.

IMPORTANT: You must respond with a STRICT, valid JSON object containing exactly one key "suggestions" which is an array of objects.
Each object in the "suggestions" array MUST have:
- "locator" (string): The recommended CSS selector or XPath.
- "confidence" (number between 0.0 and 1.0): Your confidence in this recommendation.
- "reasoning" (string): Concise explanation of why this locator is robust and how it maps to the original.

Example JSON output format:
{
  "suggestions": [
    {
      "locator": "button#submit-new",
      "confidence": 0.95,
      "reasoning": "The button ID changed from submit-old to submit-new, but tag name and text 'Submit Order' are identical."
    }
  ]
}`;

    // Format ranked candidate snippets for clear LLM visibility
    const candidatesStr = rankedCandidates
      .slice(0, 5) // Cap at top 5 for token efficiency
      .map((sc, i) => {
        return `Candidate #${i + 1} (Heuristic Score: ${sc.score}):
  ID: ${sc.candidate.candidateId}
  Tag: ${sc.candidate.tagName}
  Text: "${sc.candidate.text}"
  Snippet: ${sc.candidate.htmlSnippet}
  Match Reasons: ${sc.matchedReasons.join(", ")}`;
      })
      .join("\n\n");

    const feedbackSection = validationFeedback
      ? `\n⚠️ PREVIOUS ATTEMPT VALIDATION FAILURE FEEDBACK:\n${validationFeedback}\nPlease analyze this failure, avoid proposing this same selector or any locator that matches multiple elements, and try a more unique/specific combination.`
      : "";

    const userPrompt = `Failed Locator: "${failedLocator}"
Failure Metadata: ${JSON.stringify(failedLocatorMetadata, null, 2)}

Ranked Candidate Elements in Current DOM:
${candidatesStr}
${feedbackSection}

Please analyze the failure and output your JSON healing suggestions now.`;

    let completion = "";
    try {
      completion = await this.sdk.generateCompletion(systemPrompt, userPrompt, true);
      
      // Clean up potential markdown formatting around the JSON object
      let cleanJson = completion.trim();
      if (cleanJson.startsWith("```json")) {
        cleanJson = cleanJson.substring(7);
      }
      if (cleanJson.startsWith("```")) {
        cleanJson = cleanJson.substring(3);
      }
      if (cleanJson.endsWith("```")) {
        cleanJson = cleanJson.substring(0, cleanJson.length - 3);
      }
      cleanJson = cleanJson.trim();

      const parsed = JSON.parse(cleanJson);

      if (!parsed.suggestions || !Array.isArray(parsed.suggestions)) {
        throw new Error("Invalid response JSON structure: missing suggestions array");
      }

      logger.info(`Healing Agent generated ${parsed.suggestions.length} suggestions.`);
      return {
        success: true,
        suggestions: parsed.suggestions,
      };
    } catch (err: any) {
      logger.error(`Error in HealingAgent execution or JSON parsing: ${err.message}. Raw completion: ${completion}`);
      return {
        success: false,
        suggestions: [],
      };
    }
  }
}
