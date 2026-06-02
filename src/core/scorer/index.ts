import type { CandidateElement, ScoredCandidate } from "../../types/index.js";

import { logger } from "../../utils/logger.js";

export function scoreCandidates(
    failedLocator: string,
    failedLocatorMetadata: {
        tagName?: string | undefined;
        text?: string | undefined;
        attributes?: Record<string, string> | undefined;
    } = {},
    candidates: CandidateElement[]
): ScoredCandidate[] {

    logger.info(`Scoring ${candidates.length} candidates`);

    if (candidates.length === 0) {
        return [];
    }

    // Extract details from failed locator
    const parsedTagName = (failedLocator.match(/^[a-zA-Z0-9-]+/)?.[0] || "").toUpperCase();
    const parsedId = failedLocator.match(/#([a-zA-Z0-9_-]+)/)?.[1] || "";
    const parsedClasses = Array.from(failedLocator.matchAll(/\.([a-zA-Z0-9_-]+)/g)).map(m => m[1]);
    const targetTagName = (failedLocatorMetadata.tagName || parsedTagName).toUpperCase();
    const targetText = failedLocatorMetadata.text || "";
    const targetAttributes = failedLocatorMetadata.attributes || {};
    const interactiveTags = ["BUTTON", "INPUT", "A", "SELECT", "TEXTAREA"];

    const scored: ScoredCandidate[] = candidates.map(cand => {
        let score = 0;
        const reasons: string[] = [];

        if (cand.selectorHints.length > 0) {
            score += 0.05;
        }

        // Interactive element boost
        if (interactiveTags.includes(cand.tagName)) {
            score += 0.05;
            reasons.push("Interactive element");
        }

        // Tag matching
        if (targetTagName && cand.tagName === targetTagName) {
            score += 0.05;
            reasons.push(`Tag match (${cand.tagName})`);
        }

        // Stable testing attributes
        if (cand.attributes["data-testid"] || cand.attributes["data-cy"]) {
            score += 0.35;
            reasons.push("Stable testing attribute");
        }

        // ID matching
        if (parsedId) {
            const candId = cand.attributes.id || "";

            // Exact ID
            if (candId === parsedId) {
                score += 0.30;
                reasons.push(`Exact ID match (${candId})`);
            }

            // Partial ID
            else if (candId && (candId.includes(parsedId) || parsedId.includes(candId))) {
                score += 0.20;
                reasons.push(`Partial ID match (${candId})`);
            }
        }

        // Text matching
        if (targetText && cand.text) {

            const candText = cand.text.toLowerCase();
            const target = targetText.toLowerCase();

            // Exact text
            if (candText === target) {
                score += 0.15;
                reasons.push("Exact text match");
            }

            // Partial text
            else if (candText.includes(target)) {
                score += 0.10;
                reasons.push("Partial text match");
            }
        }

        // Attribute matching
        const totalAttrs = Object.keys(targetAttributes).length;

        if (totalAttrs > 0) {

            let matched = 0;

            for (const [key, value] of Object.entries(targetAttributes)) {
                if (cand.attributes[key] === value) {
                    matched++;
                }
            }

            if (matched > 0) {
                const attrScore = matched / totalAttrs;
                score += attrScore * 0.10;
                reasons.push(`Matched ${matched}/${totalAttrs} attributes`);
            }
        }

        // Class matching
        if (parsedClasses.length > 0) {
            const classList = (cand.attributes.class || "")
                .split(/\s+/)
                .filter(c =>
                    c &&
                    c.length > 3 &&
                    !c.startsWith("css-") &&
                    !c.startsWith("Mui") &&
                    !c.startsWith("sc-") &&
                    !/\d{4,}/.test(c)
                );

            const matching = parsedClasses.filter(c => classList.includes(c));

            if (matching.length > 0) {
                score += 0.05;
                reasons.push(`Class match (${matching.join(", ")})`);
            }
        }

        // Penalize weak generic divs
        if (cand.tagName === "DIV" && !cand.attributes.id && !cand.attributes.role) {
            score -= 0.10;
        }

        // Cap score
        score = Math.min(score, 1);

        return {
            candidate: cand,
            score: Number(score.toFixed(2)),
            matchedReasons: reasons
        };
    })
        .filter(c => c.score > 0.05)
        .sort((a, b) => b.score - a.score);

    logger.info(`Scoring completed. Top score: ${scored[0]?.score || 0}`);

    return scored;
}