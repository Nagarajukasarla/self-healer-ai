import type { ValidationResult } from "./validationAgent.js";
import { logger } from "../utils/logger.js";

export class RetryAgent {
  /**
   * Accumulates and compiles detailed validation error logs into a feedback prompt section.
   * This is sent to the Healing Agent so the LLM knows exactly what went wrong and can avoid it.
   * 
   * @param attemptNumber The failed attempt index (1-indexed).
   * @param suggestedLocator The locator string that failed validation.
   * @param result The validation result containing error type and detailed message.
   */
  compileFeedback(
    attemptNumber: number,
    suggestedLocator: string,
    result: ValidationResult
  ): string {
    const feedback = `Attempt #${attemptNumber} Validation Failure:
- Tried Locator: "${suggestedLocator}"
- Error Type: "${result.errorType}"
- Failure Reason: "${result.errorMessage}"
- Advice: Please try a different selector combination. If it matched multiple elements, make it more specific by combining tag name, IDs, stable classes, or unique attributes. If it was not found, verify the tag name and check if attributes exist precisely on the target element.`;

    logger.warn(`Retry Agent compiled detailed failure feedback for attempt #${attemptNumber}.`);
    return feedback;
  }
}
