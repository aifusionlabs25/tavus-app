
// Central configuration file for application constants
// Single source of truth for model versions to prevent hardcoding errors.

export const CONFIG = {
    GEMINI: {
        // Use environment variable if set (for flexibility), otherwise default to free tier flash model
        // Updated Dec 2024: gemini-1.5-flash deprecated in v1beta, use gemini-2.0-flash
        MODEL: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
    },
    OPENAI: {
        MODEL: 'gpt-4o-mini', // Lowest cost, high speed, perfect for JSON extraction
    },
    TAVUS: {
        API_URL: 'https://tavusapi.com/v2',
        // Feature flag: Disable by default to prevent 405 Method Not Allowed errors during demo
        ENABLE_CONTEXT_UPDATE: process.env.ENABLE_TAVUS_CONTEXT === 'true',
    }
};
