// Per-user caps (the app is public). Kept as a high guardrail against abuse
// on the shared deployment rather than a hard product limit — raise or lower
// this one constant to taste.
export const MAX_PDFS_PER_USER = 50;
export const MAX_MESSAGES_PER_USER = 4; // max user messages per chat mode

// Flat credit cost of one readiness check. A run fans out retrieval + an LLM
// judgement across every blueprint item, so it is priced above a single chat
// turn but kept modest enough to run repeatedly in a demo.
export const READINESS_RUN_COST = 15;
