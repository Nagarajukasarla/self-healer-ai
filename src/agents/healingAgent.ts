import { Agent } from "@google/adk";
import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

export const healingAgent = new Agent({
    name: "locator-healer-agent",

    instruction: `
    You are an expert web automation healing agent.

    You analyze:
    - Failed locators
    - Current DOM
    - Metadata
    - Page structure

    You return:
    - Best alternative locator (newLocator)
    - Locator type ("css" or "xpath") (type)
    - Confidence score (confidence)
    - Healing strategy (strategy)

    Always return JSON only.
    `
});

export async function runHealingAgent(prompt: string): Promise<string> {

    const response = await groq.chat.completions.create({

        model: "llama-3.3-70b-versatile",

        temperature: 0.2,

        response_format: {
            type: "json_object"
        },

        messages: [
            {
                role: "system",
                content: typeof healingAgent.instruction === "string" ? healingAgent.instruction : ""
            },
            {
                role: "user",
                content: prompt
            }
        ]
    });

    return response.choices[0].message.content || "";
}