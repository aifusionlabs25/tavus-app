const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

async function listModels() {
    const apiKey = process.env.GOOGLE_API_KEY;
    let logOutput = "";

    function log(msg) {
        console.log(msg);
        logOutput += msg + "\n";
    }

    if (!apiKey) {
        log("No GOOGLE_API_KEY found");
        fs.writeFileSync('gemini_model_report.txt', logOutput);
        return;
    }
    const genAI = new GoogleGenerativeAI(apiKey);

    const candidates = [
        "gemini-1.5-flash-001",
        "gemini-1.5-flash-002",
        "gemini-1.5-flash",
        "gemini-1.5-pro",
        "gemini-pro"
    ];

    log("--- START MODEL CHECK ---");
    for (const modelName of candidates) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Test.");
            const response = await result.response;
            log(`✅ SUCCESS: ${modelName}`);
        } catch (error) {
            log(`❌ FAILED: ${modelName} | Error: ${error.message.split('\n')[0]}`);
        }
    }
    log("--- END MODEL CHECK ---");
    fs.writeFileSync('gemini_model_report.txt', logOutput);
}

listModels();
