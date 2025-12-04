const https = require('https');

const apiKey = process.env.TAVUS_API_KEY;
const conversationId = 'ce1f33427647d476';

if (!apiKey) {
    console.error('Error: TAVUS_API_KEY is not set.');
    process.exit(1);
}

const options = {
    hostname: 'tavusapi.com',
    path: `/v2/conversations/${conversationId}`,
    method: 'GET',
    headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
    },
};

const req = https.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log('Response:', JSON.stringify(JSON.parse(data), null, 2));
        } else {
            console.error(`Error: Status Code ${res.statusCode}`);
            console.error('Response:', data);
        }
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});

req.end();
