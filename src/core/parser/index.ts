import * as cheerio from "cheerio";

import { logger } from "../../utils/logger.js";

import type { CandidateElement } from "../../types/index.js";

import { generateSelectors } from "../selector/index.js";

export function parseCandidates(html: string): CandidateElement[] {

    logger.info("Parsing HTML candidates");

    if (!html?.trim()) {
        return [];
    }

    const $ = cheerio.load(html);

    const candidates: CandidateElement[] = [];

    const seen = new Set<string>();

    const selectors = [
        "button",
        "a",
        "input",
        "select",
        "textarea",
        "[data-testid]",
        "[data-cy]",
        "[role]",
        "[name]",
        "[id]"
    ];

    $(selectors.join(",")).each((index, rawEl) => {
        const el = rawEl as any;

        const rawHtml = $.html(el);

        if (seen.has(rawHtml)) {
            return;
        }

        seen.add(rawHtml);

        const $el = $(el);

        const attributes: Record<string, string> = {};

        Object.entries(el.attribs || {}).forEach(([key, value]) => {
            attributes[key] = value as string;
        });

        const candidate: CandidateElement = {

            candidateId: `cand_${index + 1}`,

            tagName: el.tagName.toUpperCase(),

            text: $el.text()
                .replace(/\s+/g, " ")
                .trim()
                .substring(0, 150),

            attributes,

            htmlSnippet: rawHtml,

            selectorHints: []
        };

        candidate.selectorHints =
            generateSelectors(candidate);

        candidates.push(candidate);
    });

    logger.info(
        `Parsed ${candidates.length} candidates`
    );

    return candidates;
}