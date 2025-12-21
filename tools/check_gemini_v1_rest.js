const https = require('https');
require('dotenv').config({ path: '.env.local' });

const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
    console.log("No API Key");
    process.exit(1);
}

const data = JSON.stringify({
    contents: [{ parts: [{ text: "Hello" }] }]
});

const options = {
    hostname: 'generativelanguage.googleapis.com',
    path: `/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

console.log(`Checking URL: https://${options.hostname}${options.path.replace(apiKey, 'HIDDEN')}`);

const req = https.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        console.log('BODY:', body.substring(0, 200));
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
