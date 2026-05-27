declare module 'string-similarity' {
  export function compareTwoStrings(str1: string, str2: string): number;
  export function findBestMatch(mainString: string, targetStrings: string[]): {
    ratings: { target: string; rating: number }[];
    bestMatch: { target: string; rating: number };
    bestMatchIndex: number;
  };
  const stringSimilarity: {
    compareTwoStrings: typeof compareTwoStrings;
    findBestMatch: typeof findBestMatch;
  };
  export default stringSimilarity;
}
