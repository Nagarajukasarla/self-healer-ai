import type { CandidateElement } from "../parser/index.js";

/**
 * Generates an array of potential CSS and XPath selectors for a candidate element.
 * Selectors are ordered from most robust/stable (data-testid, IDs) to structural.
 * 
 * @param cand The target candidate element.
 * @returns Array of unique generated selectors.
 */
export function generateSelectors(cand: CandidateElement): string[] {
  const selectors: string[] = [];
  const tagName = cand.tagName.toLowerCase();
  const attrs = cand.attributes || {};

  // 1. High-Priority Testing Attributes (data-testid, data-cy)
  if (attrs["data-testid"]) {
    selectors.push(`[data-testid="${attrs["data-testid"]}"]`);
    selectors.push(`${tagName}[data-testid="${attrs["data-testid"]}"]`);
  }
  if (attrs["data-cy"]) {
    selectors.push(`[data-cy="${attrs["data-cy"]}"]`);
    selectors.push(`${tagName}[data-cy="${attrs["data-cy"]}"]`);
  }

  // 2. Strict ID Selectors
  if (attrs.id) {
    selectors.push(`#${attrs.id}`);
    selectors.push(`${tagName}#${attrs.id}`);
  }

  // 3. Name Attribute (Common for input elements)
  if (attrs.name) {
    selectors.push(`${tagName}[name="${attrs.name}"]`);
  }

  // 4. Class-based Selectors (filtered of potential dynamic frameworks garbage)
  if (attrs.class) {
    const classList = attrs.class
      .split(/\s+/)
      .filter(c => c && !c.includes(":") && !c.startsWith("ng-") && !c.startsWith("jss") && !c.startsWith("_"));
    
    if (classList.length > 0) {
      selectors.push(`${tagName}.${classList.join(".")}`);
      // Short-form containing the first two classes
      if (classList.length > 1) {
        selectors.push(`${tagName}.${classList.slice(0, 2).join(".")}`);
      }
    }
  }

  // 5. Descriptive UI Attributes
  const descriptiveAttrs = ["type", "placeholder", "href", "role", "title", "value"];
  for (const attr of descriptiveAttrs) {
    if (attrs[attr]) {
      selectors.push(`${tagName}[${attr}="${attrs[attr]}"]`);
    }
  }

  // 6. Combined Attribute Selectors
  if (attrs.class && attrs.type) {
    const classes = attrs.class.split(/\s+/).filter(Boolean);
    if (classes[0]) {
      selectors.push(`${tagName}.${classes[0]}[type="${attrs.type}"]`);
    }
  }

  // 7. XPath Variations
  if (attrs.id) {
    selectors.push(`//${tagName}[@id='${attrs.id}']`);
  }
  if (attrs["data-testid"]) {
    selectors.push(`//${tagName}[@data-testid='${attrs["data-testid"]}']`);
  }
  if (attrs.name) {
    selectors.push(`//${tagName}[@name='${attrs.name}']`);
  }
  
  if (cand.text && cand.text.trim().length > 0 && cand.text.length < 60) {
    const cleanText = cand.text.replace(/'/g, "\\'").trim();
    if (cleanText) {
      selectors.push(`//${tagName}[contains(text(),'${cleanText}')]`);
      selectors.push(`//${tagName}[text()='${cleanText}']`);
    }
  }

  // Deduplicate and return
  return Array.from(new Set(selectors));
}
