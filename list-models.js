const fs = require('fs');
const path = require('path');

async function listModels() {
    try {
        // Read API Key manually since we aren't in Next.js context
        const envPath = path.join(__dirname, '.env.local');
        const envContent = fs.readFileSync(envPath, 'utf8');
        const match = envContent.match(/GOOGLE_API_KEY=(.*)/);

        if (!match) {
            console.error("❌ Could not find GOOGLE_API_KEY in .env.local");
            return;
        }

        const apiKey = match[1].trim();
        console.log(`🔑 Found API Key: ${apiKey.substring(0, 8)}...`);

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();

        if (data.error) {
            console.error("❌ API Error:", JSON.stringify(data.error, null, 2));
        } else {
            console.log("✅ Available Models:");
            if (data.models) {
                data.models.forEach(m => console.log(` - ${m.name.replace('models/', '')}`));
            } else {
                console.log("No models found in response:", data);
            }
        }
    } catch (error) {
        console.error("❌ Script Error:", error.message);
    }
}

listModels();
