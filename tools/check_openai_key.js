require('dotenv').config({ path: '.env.local' });
if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('sk-')) {
    console.log("✅ OPENAI_API_KEY FOUND");
} else {
    console.log("❌ OPENAI_API_KEY MISSING");
}
