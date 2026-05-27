import * as cheerio from "cheerio";
import { logger } from "../../utils/logger.js";

export interface CandidateElement {
  candidateId: string;
  tagName: string;
  text: string;
  attributes: Record<string, string>;
  htmlSnippet: string;
}

/**
 * Parses raw HTML context using Cheerio and extracts candidate interactive elements.
 * 
 * @param html The raw HTML string of the page context.
 * @returns Array of candidate target elements.
 */
export function parseCandidates(html: string): CandidateElement[] {
  logger.info("Parsing HTML context to extract candidate elements...");
  
  if (!html || html.trim() === "") {
    logger.warn("Received empty HTML content for parsing.");
    return [];
  }

  const $ = cheerio.load(html);
  const candidates: CandidateElement[] = [];
  const seenHtml = new Set<string>();

  // Broad selector list targeting buttons, inputs, links, labels, and attribute-rich wrappers
  const selectors = [
    "button",
    "a",
    "input",
    "select",
    "textarea",
    "label",
    "[id]",
    "[data-testid]",
    "[data-cy]",
    "[role]",
    "[name]",
    "[class]"
  ];

  $(selectors.join(", ")).each((index, rawEl) => {
    const el = rawEl as any;
    // Avoid processing standard high-level wrappers like body/html if matched
    if (el.tagName === "html" || el.tagName === "body" || el.tagName === "head") {
      return;
    }

    const $el = $(el);
    
    // Get outer HTML snippet of the element itself (without children's deep bodies if possible,
    // but a standard outer HTML is best)
    const rawHtml = $.html(el);
    
    // De-duplicate overlapping matches
    if (seenHtml.has(rawHtml)) return;
    seenHtml.add(rawHtml);

    // Extract attributes
    const attributes: Record<string, string> = {};
    const attribs = el.attribs || {};
    for (const [key, value] of Object.entries(attribs)) {
      attributes[key] = value as string;
    }

    // Extract inner text and clean whitespace
    const text = $el.text().replace(/\s+/g, " ").trim();

    candidates.push({
      candidateId: `cand_${index + 1}`,
      tagName: el.tagName.toUpperCase(),
      text: text.substring(0, 150), // Cap long texts
      attributes,
      htmlSnippet: rawHtml,
    });
  });

  logger.info(`Extracted ${candidates.length} candidate elements from HTML.`);
  return candidates;
}
