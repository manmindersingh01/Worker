// Per-user free-tier caps (the app is public).
export const MAX_PDFS_PER_USER = 1;
export const MAX_MESSAGES_PER_USER = 4; // max user messages per chat mode

// Flat credit cost of one readiness check. A run fans out retrieval + an LLM
// judgement across every blueprint item, so it is priced above a single chat
// turn but kept modest enough to run repeatedly in a demo.
export const READINESS_RUN_COST = 15;
