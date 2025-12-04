import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const { conversation_id } = await request.json();

    if (!process.env.TAVUS_API_KEY) {
        return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    try {
        const response = await fetch(`https://tavusapi.com/v2/conversations/${conversation_id}/end`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.TAVUS_API_KEY,
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Tavus End API Error:', errorData);
            return NextResponse.json({ error: 'Failed to end conversation' }, { status: response.status });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error ending conversation:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
