import type { AgentRequest } from "../types/index.js";

export function buildHealingPrompt(request: AgentRequest): string {
    return `
You are an expert AI locator healing agent.

You are given:
- Failed locator
- Locator metadata
- Top ranked DOM candidates

Task:
Find the BEST replacement locator.

Rules:
- Prefer data-testid
- Then id
- Then name
- Then role
- Avoid dynamic classes
- Avoid nth-child selectors

Return ONLY valid JSON.

Example:
{
  "newLocator": "#signin-btn",
  "confidence": 0.95,
  "strategy": "Matched by similar button text and DOM hierarchy"
}

INPUT:

${JSON.stringify(request, null, 2)}
`;
}