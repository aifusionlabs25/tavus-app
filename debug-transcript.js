const https = require('https');

const apiKey = 'f0e0a3d6f6a04fbbb5359d2171f0e361';
const conversationId = 'c167df62af0414df';

const paramsToTest = [
    '',
    '?verbose=true',
    '?include_transcript=true',
    '?expand=transcript',
    '?properties=true'
];

function checkParam(param) {
    return new Promise((resolve) => {
        const options = {
            hostname: 'tavusapi.com',
            path: `/v2/conversations/${conversationId}${param}`,
            method: 'GET',
            headers: {
                'x-api-key': apiKey,
                'Content-Type': 'application/json',
            },
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    const hasTranscript = !!json.transcript;
                    const transcriptLen = hasTranscript ? json.transcript.length : 0;
                    console.log(`Param: "${param}" -> Transcript Found: ${hasTranscript} (Length: ${transcriptLen})`);
                    if (hasTranscript) resolve(true);
                    else resolve(false);
                } catch (e) {
                    console.log(`Param: "${param}" -> Error parsing JSON`);
                    resolve(false);
                }
            });
        });
        req.on('error', (e) => {
            console.error(`Param: "${param}" -> Request Error: ${e.message}`);
            resolve(false);
        });
        req.end();
    });
}

async function run() {
    console.log('Fetching full JSON for verbose=true...');
    const options = {
        hostname: 'tavusapi.com',
        path: `/v2/conversations/${conversationId}?verbose=true`,
        method: 'GET',
        headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json',
        },
    };

    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            try {
                const json = JSON.parse(data);
                console.log(JSON.stringify(json, null, 2));
            } catch (e) {
                console.log('Error parsing JSON');
            }
        });
    });
    req.end();
}

run();
