const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');

// NEW KEY provided by user
const apiKey = "AIzaSyBVtfS_u_vhXQI50EAMQqSm1GmsyNCA2GM";

async function listModels() {
    let logOutput = "";
    function log(msg) {
        console.log(msg);
        logOutput += msg + "\n";
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    const candidates = [
        "gemini-1.5-flash",
        "gemini-1.5-flash-001",
        "gemini-1.5-flash-002",
        "gemini-1.5-flash-8b",
        "gemini-2.0-flash-exp",
        "gemini-2.0-flash"
    ];

    log("--- START NEW KEY VERIFICATION ---");
    log(`Key: ${apiKey.substring(0, 10)}... (AlphaDec2125)`);

    for (const modelName of candidates) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Test.");
            const response = await result.response;
            log(`✅ SUCCESS: ${modelName} is WORKING.`);
        } catch (error) {
            log(`❌ FAILED: ${modelName} | Error: ${error.message.split('\n')[0]}`);
        }
    }
    log("--- END NEW KEY VERIFICATION ---");
    fs.writeFileSync('new_key_report.txt', logOutput);
}

listModels();
