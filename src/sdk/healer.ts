import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

export interface HealerSDKConfig {
  apiKey?: string;
  model?: string;
}

export class HealerSDK {
  private apiKey: string;
  private model: string;
  private baseUrl = "https://api.groq.com/openai/v1/chat/completions";

  constructor(config: HealerSDKConfig = {}) {
    this.apiKey = config.apiKey || env.GROQ_API_KEY;
    this.model = config.model || env.GROQ_MODEL;

    if (!this.apiKey || this.apiKey.includes("placeholder")) {
      logger.warn("⚠️ Warning: GROQ_API_KEY is not set or is still a placeholder.");
    }
  }

  /**
   * Generates a completion from the Groq API (Gemma-2).
   * 
   * @param systemPrompt The instruction system prompt for the model.
   * @param userPrompt The failure analysis and candidate context.
   * @param jsonMode If true, requests the response in JSON format.
   * @param temperature Creativity level (default 0.1 for high precision).
   */
  async generateCompletion(
    systemPrompt: string,
    userPrompt: string,
    jsonMode = false,
    temperature = 0.1
  ): Promise<string> {
    logger.info(`Sending request to Groq API using model ${this.model} (jsonMode=${jsonMode})...`);

    const headers: Record<string, string> = {
      "Authorization": `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };

    const body: Record<string, any> = {
      model: this.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature,
    };

    if (jsonMode) {
      body.response_format = { type: "json_object" };
    }

    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`Groq API Error Status ${response.status}: ${errorText}`);
        throw new Error(`Groq API call failed: Status ${response.status} - ${errorText}`);
      }

      const data = (await response.json()) as any;
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("Invalid response format from Groq API - empty content");
      }

      logger.info("Successfully received completion response from Groq API.");
      return content;
    } catch (error: any) {
      logger.error(`Failed to generate completion from Groq API: ${error.message}`);
      throw error;
    }
  }
}
