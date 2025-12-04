import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const { conversation_id } = await request.json();

    if (!conversation_id) {
        return NextResponse.json({ error: 'Conversation ID required' }, { status: 400 });
    }

    if (!process.env.TAVUS_API_KEY) {
        return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    try {
        const response = await fetch(`https://tavusapi.com/v2/conversations/${conversation_id}?verbose=true`, {
            method: 'GET',
            headers: {
                'x-api-key': process.env.TAVUS_API_KEY,
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            return NextResponse.json({ error: errorData }, { status: response.status });
        }

        const data = await response.json();

        // Extract transcript from events if present
        let transcript = data.transcript;
        if (!transcript && data.events && Array.isArray(data.events)) {
            const transcriptEvent = data.events.find((e: any) => e.event_type === 'application.transcription_ready');
            if (transcriptEvent?.properties?.transcript) {
                const t = transcriptEvent.properties.transcript;
                if (Array.isArray(t)) {
                    transcript = t.map((msg: any) => `${msg.role}: ${msg.content}`).join('\n');
                } else {
                    transcript = String(t);
                }
            }
        }

        return NextResponse.json({ ...data, transcript });
    } catch (error: any) {
        console.error('Error fetching conversation status:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
