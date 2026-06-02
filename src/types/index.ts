export interface SerializedTestError {
    message?: string | undefined;
    stack?: string | undefined;
}

export interface SerializedTestResult {
    id: string;
    title: string;
    fullName: string;
    file: string;
    line: number;
    column: number;
    status: string;
    duration: number;
    errors: SerializedTestError[];
}

export interface LocatorStrategy {
    type: string;
    value: string;
}

export interface LocatorMetadata {
    [key: string]: any;
}

export interface HealingRequest {
    test: SerializedTestResult;
    failedLocator: LocatorStrategy;
    locatorMetaData: Record<string, LocatorMetadata>;
    pageUrl: string;
    pageSource: string;
}

export interface CandidateElement {
    candidateId: string;

    tagName: string;

    text: string;

    attributes: Record<string, string>;

    selectorHints: string[];

    htmlSnippet: string;
}

export interface ScoredCandidate {
    candidate: CandidateElement;
    score: number;
    matchedReasons: string[];
}

export interface AgentRequest {
    failedLocatorKey?: string | undefined;
    failedLocator: LocatorStrategy;
    locatorMetaData: LocatorMetadata;
    topCandidates: {
        tagName: string;
        text: string;
        attributes: Record<string, string>;
        selectorHints: string[];
        score: number;
        matchedReasons: string[];
    }[];
}

export interface AgentResponse {
    newLocator?: string | undefined;
    type?: string | undefined;
    confidence?: number | undefined;
    strategy?: string | undefined;
}

export interface HealingResponse {
    newLocator?: string | undefined;
    type?: string | undefined;
    confidence?: number | undefined;
    strategy?: string | undefined;
}