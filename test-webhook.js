async function testWebhook() {
    console.log("🚀 Sending test data to Webhook...");

    try {
        const response = await fetch('http://localhost:3000/api/webhook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                transcript: "Hi, I am John Doe from Acme Corp. My email is john@acme.com. We are looking for a field service solution. Our budget is around $50k and we need it in 4 weeks."
            })
        });

        const data = await response.json();
        console.log("✅ Response from Server:", data);

        if (data.success) {
            console.log("🎉 SUCCESS! Check your Google Sheet now.");
        } else {
            console.log("❌ Something went wrong:", data);
        }
    } catch (error) {
        console.error("❌ Error:", error.message);
        console.log("Make sure your server is running on localhost:3000!");
    }
}

testWebhook();
