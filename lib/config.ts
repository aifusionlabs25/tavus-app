
// Central configuration file for application constants
// Single source of truth for model versions to prevent hardcoding errors.

export const CONFIG = {
    GEMINI: {
        // Use environment variable if set (for flexibility), otherwise default to free tier flash model
        MODEL: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    },
    TAVUS: {
        API_URL: 'https://tavusapi.com/v2',
        // Feature flag: Disable by default to prevent 405 Method Not Allowed errors during demo
        ENABLE_CONTEXT_UPDATE: process.env.ENABLE_TAVUS_CONTEXT === 'true',
    }
};
