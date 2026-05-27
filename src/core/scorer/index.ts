import stringSimilarity from "string-similarity";
import type { CandidateElement } from "../parser/index.js";
import { logger } from "../../utils/logger.js";

export interface ScoredCandidate {
  candidate: CandidateElement;
  score: number; // 0.0 to 1.0
  matchedReasons: string[];
}

/**
 * Scores and ranks candidate elements against a failed locator and its failure metadata.
 * 
 * @param failedLocator The selector string that failed (e.g. "button#submit").
 * @param failedLocatorMetadata Metadata about the failed locator.
 * @param candidates List of candidate elements parsed from the DOM.
 * @returns Array of scored and ranked candidates sorted descending by score.
 */
export function scoreCandidates(
  failedLocator: string,
  failedLocatorMetadata: {
    tagName?: string;
    text?: string;
    attributes?: Record<string, string>;
  } = {},
  candidates: CandidateElement[]
): ScoredCandidate[] {
  logger.info(`Scoring ${candidates.length} candidates against failed locator "${failedLocator}"...`);

  if (candidates.length === 0) {
    return [];
  }

  // Basic regex parsing of the failed locator to extract fallback heuristics
  const parsedTagName = (failedLocator.match(/^[a-zA-Z0-9-]+/)?.[0] || "").toUpperCase();
  const parsedId = failedLocator.match(/#([a-zA-Z0-9_-]+)/)?.[1] || "";
  const parsedClasses = Array.from(failedLocator.matchAll(/\.([a-zA-Z0-9_-]+)/g)).map(m => m[1]);

  const targetTagName = (failedLocatorMetadata.tagName || parsedTagName).toUpperCase();
  const targetText = failedLocatorMetadata.text || "";
  const targetAttributes = failedLocatorMetadata.attributes || {};

  const scored: ScoredCandidate[] = candidates.map(cand => {
    let score = 0;
    const reasons: string[] = [];

    // 1. Tag Name Match (Weight: 0.15)
    if (targetTagName && cand.tagName === targetTagName) {
      score += 0.15;
      reasons.push(`Tag name matches (${cand.tagName})`);
    }

    // 2. Text Similarity using string-similarity (Weight: 0.35)
    if (targetText && cand.text) {
      try {
        const textSim = stringSimilarity.compareTwoStrings(
          cand.text.toLowerCase(),
          targetText.toLowerCase()
        );
        if (textSim > 0.3) {
          score += textSim * 0.35;
          reasons.push(`Text similarity: ${Math.round(textSim * 100)}% ("${cand.text.substring(0, 30)}" vs "${targetText.substring(0, 30)}")`);
        }
      } catch (err) {
        // Safe fallback in case of comparison exceptions
        if (cand.text.toLowerCase() === targetText.toLowerCase()) {
          score += 0.35;
          reasons.push(`Exact text match`);
        } else if (cand.text.toLowerCase().includes(targetText.toLowerCase())) {
          score += 0.20;
          reasons.push(`Partial text match`);
        }
      }
    }

    // 3. Parsed Broken Selector matches (Weight: 0.25)
    if (parsedId) {
      const candId = cand.attributes.id || "";
      if (candId === parsedId) {
        score += 0.25;
        reasons.push(`Exact ID match ("${candId}")`);
      } else if (candId && (candId.includes(parsedId) || parsedId.includes(candId))) {
        score += 0.15;
        reasons.push(`Partial ID match ("${candId}" vs "${parsedId}")`);
      }
    }

    if (parsedClasses.length > 0) {
      const candClass = cand.attributes.class || "";
      const candClassList = candClass.split(/\s+/).filter(Boolean);
      const matchingClasses = parsedClasses.filter(c => candClassList.includes(c));
      if (matchingClasses.length > 0) {
        const classSim = matchingClasses.length / parsedClasses.length;
        score += classSim * 0.15;
        reasons.push(`Matched class(es): ${matchingClasses.join(", ")}`);
      }
    }

    // 4. Metadata Attributes Match (Weight: 0.20)
    const totalAttrs = Object.keys(targetAttributes).length;
    if (totalAttrs > 0) {
      let matchedAttrs = 0;
      for (const [key, val] of Object.entries(targetAttributes)) {
        if (cand.attributes[key] === val) {
          matchedAttrs++;
        }
      }
      if (matchedAttrs > 0) {
        const attrSim = matchedAttrs / totalAttrs;
        score += attrSim * 0.20;
        reasons.push(`Matched attributes: ${matchedAttrs}/${totalAttrs}`);
      }
    }

    // 5. High-Priority Test Attributes (e.g. data-testid, data-cy, name, role) (Weight: 0.15 bonus)
    const highPriorityAttrs = ["data-testid", "data-cy", "name", "role", "placeholder"];
    for (const attr of highPriorityAttrs) {
      if (
        cand.attributes[attr] &&
        (targetAttributes[attr] || cand.attributes[attr].includes(parsedId)) &&
        (cand.attributes[attr] === targetAttributes[attr] || cand.attributes[attr].includes(parsedId))
      ) {
        score += 0.15;
        reasons.push(`Matched priority test attribute "${attr}": "${cand.attributes[attr]}"`);
        break; // Count once
      }
    }

    // Cap the maximum score at 1.0 and round
    const finalScore = Math.min(Math.round(score * 100) / 100, 1.0);

    return {
      candidate: cand,
      score: finalScore,
      matchedReasons: reasons,
    };
  });

  // Sort descending by score
  const sorted = scored.sort((a, b) => b.score - a.score);
  
  logger.info(`Scoring complete. Ranked ${sorted.length} elements. Best score: ${sorted[0]?.score || 0}`);
  return sorted;
}
