// Using native fetch (Node 18+)

const transcript = [
    {
        "content": "Hey! I'm Morgan, your goDeskless guide. I'm here to answer questions, share ideas, or just talk through what you're working on. What brings you here today?",
        "role": "assistant"
    },
    {
        "content": "A buddy of mine told me that he had saw a demo about you guys and he thought it'd be a really good match for my HVAC business. What do you need from me? Oh, I'm sorry. My name's Rob, by the way. What do you need from me to maybe...",
        "role": "user"
    },
    {
        "content": "Nice to meet you, Rob! To see if goDeskless is a good fit, I’ll need a quick snapshot of your operation: how many HVAC techs you have, how you currently schedule and dispatch jobs (e.g., spreadsheets, a ticketing system), the main challenges you face (like missed appointments or paperwork), and any tools you’re already using. With that info I can point out exactly where we’d add value. Let me know whenever you’re ready.",
        "role": "assistant"
    },
    {
        "content": "A buddy of mine told me that he had saw a demo about you guys and he thought it'd be a really good match for my HVAC business. What do you need from me? Oh, I'm sorry. My name's Rob, by the way. What do you need from me to maybe, you know, tell me how much it's going to cost, what it includes, you know, the general info.",
        "role": "user"
    },
    {
        "content": "Sure thing, Rob. Pricing is subscription‑based and depends on three things: the number of technicians you’d equip, which modules you need (SmartAgent dispatch, SnapHelp field app, TrackHelp Pro tracking, OneCloud integration, etc.), and the level of support you want. A basic setup for a small HVAC crew typically runs in the low‑four‑figure dollars per month, scaling up as you add users or advanced features. I can connect you with our sales team for a detailed quote and walk you through exactly what’s included. Would you like me to set that up?",
        "role": "assistant"
    },
    {
        "content": "Yeah, I've got a few more questions before I talk to a sales guy. All right, so it sounds like you've got some modules going on there, smart agent and whatever. Can you give me a really quick summarized synopsis of what each one of those does and how it would help my HVAC business? Currently, we're really, really having a hard time with scheduling, and we're missing appointments because of it.",
        "role": "user"
    },
    {
        "content": "Here’s a quick rundown:\n\n**SmartAgent Console** – a web‑based dispatch hub. You drag‑and‑drop jobs onto a calendar, let the AI BestMatch engine pair the right tech with the right appointment, and see a live map of everyone’s location. It cuts manual re‑scheduling and shrinks arrival windows.\n\n**SnapHelp** – the mobile app your HVAC techs use. Work orders appear instantly, with built‑in navigation, checklists, and photo capture. Techs get the job context before they leave the garage, so they arrive prepared and on time.\n\n**TrackHelp Pro** – real‑time GPS tracking of each tech. Dispatch sees who’s en route, can reroute around traffic, and customers get accurate ETAs, eliminating “where’s my tech?” calls.\n\n**OneCloud** – the backend that syncs data, runs the AI, and connects to any existing tools like your CRM or ticketing system. It keeps everything unified without replacing what already works.\n\nTogether they streamline scheduling, give you visibility, and reduce missed appointments. Want a deeper dive on any of those pieces?",
        "role": "assistant"
    },
    {
        "content": "No, I think I understand. It's kind of like the back office and it helps my current people just be a lot more organized and faster. And hopefully that will lead over to my techs and they'll be going to the right calls, getting there on time. And so what kind of.",
        "role": "user"
    },
    {
        "content": "Exactly, Rob. Here’s what most HVAC teams see after moving to goDeskless:\n\n* Scheduling time drops by roughly half, because drag‑and‑drop and AI‑driven BestMatch eliminate manual shuffling.  \n* Arrival windows tighten by about twenty percent, so customers get more accurate ETAs and missed appointments plummet.  \n* Truck rolls shrink up to thirty percent, saving fuel, overtime and wear‑and‑tear.\n\nThose gains usually translate into higher customer satisfaction and lower costs. Want to explore how those numbers could look for your specific crew?",
        "role": "assistant"
    },
    {
        "content": "No, I think I understand. It's kind of like the back office and it helps my current people just be a lot more organized and faster. And hopefully that will lead over to my techs and they'll be going to the right calls, getting there on time. And so what kind of, I'm sure you've got similar clients to my profile. What kind of ROI are they experiencing?",
        "role": "user"
    },
    {
        "content": "Here’s what similar HVAC operations are seeing after switching:\n\n* Truck rolls drop twenty to thirty percent, cutting fuel and overtime costs.  \n* First‑time‑fix rates climb fifteen to twenty‑five percent, reducing repeat visits.  \n* Labor overhead falls ten to fifteen percent, and response times speed up twenty‑five to thirty‑five percent.  \n\nThose improvements typically pay for the subscription in six to twelve months. Does that line up with the outcomes you’re targeting?",
        "role": "assistant"
    },
    {
        "content": "That would be great. Yeah, because we're, like I said, we're experiencing lost opportunities now that are easy dollars to convert to the bottom line. So, yeah, which leads me to my last question before I, what, based on what I've told you or some of your similar clients, what am I looking at? It sounds like I pay monthly or something. What kind of figure am I looking at? Just an estimate.",
        "role": "user"
    },
    {
        "content": "Pricing works as a per‑tech, per‑month subscription and scales with the modules you enable. A small HVAC team that uses SmartAgent plus SnapHelp typically starts in the low four‑thousand‑dollar range each month. Adding TrackHelp Pro, advanced AI routing or deeper integrations can push it into the mid‑four‑thousand‑dollar range as you add more technicians. For a precise quote that matches your crew size and feature set, I can connect you with our sales specialist. Should I set that up?",
        "role": "assistant"
    },
    {
        "content": "So it'd be $4,000 per technician.",
        "role": "user"
    },
    {
        "content": "Rob, just to clarify—it’s not $4,000 per technician. The subscription is a monthly fee for the whole team. A typical HVAC crew using SmartAgent and SnapHelp starts in the low‑four‑thousand‑dollar range per month, with additional modules adding a few hundred more as you scale. I can connect you with a sales specialist for a detailed, size‑specific quote. Want me to set that up?",
        "role": "assistant"
    },
    {
        "content": "that'd be about 48 000 a year i'm paying you but what's gonna come back to me like i mentioned roi",
        "role": "user"
    },
    {
        "content": "For an HVAC crew like yours, the typical ROI looks like this:\n\n* Truck rolls cut by twenty to thirty percent – saves fuel and overtime.  \n* First‑time‑fix rates improve by fifteen to twenty‑five percent – fewer repeat visits.  \n* Labor overhead drops ten to fifteen percent and response times speed up twenty‑five to thirty‑five percent.  \n\nThose gains usually cover the subscription cost in six to twelve months, delivering a clear profit boost beyond the roughly forty‑eight thousand a year you’d invest. Want a deeper, numbers‑focused ROI worksheet or to see a live demo?",
        "role": "assistant"
    },
    {
        "content": "Yeah, let's do a live demo.",
        "role": "user"
    },
    {
        "content": "Great, Rob. I’ve just activated the “Book Demo” button on your screen. Click it to pick a time that works for you, and our team will walk you through the platform tailored to your HVAC operation. Let me know if you need anything else in the meantime.",
        "role": "assistant"
    },
    {
        "content": "Okay. Thanks, Morgan. I appreciate it. And hope you have a good Thanksgiving.",
        "role": "user"
    },
    {
        "content": "You’re welcome! Have a wonderful Thanksgiving, and I look forward to your demo. Take care!",
        "role": "assistant"
    }
];

// Convert transcript array to string format expected by the API
const transcriptText = transcript.map(t => `${t.role.toUpperCase()}: ${t.content}`).join('\n');

async function testWebhook() {
    console.log('Testing Webhook with manual transcript...');

    try {
        const response = await fetch('http://localhost:3000/api/webhook', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                transcript: transcriptText
            }),
        });

        const data = await response.json();
        console.log('Response Status:', response.status);
        console.log('Response Data:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Test Failed:', error);
    }
}

testWebhook();
