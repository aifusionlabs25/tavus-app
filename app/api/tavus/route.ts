import { NextResponse } from 'next/server';

// Helper to clean greeting for TTS
function cleanGreetingForTTS(greeting: string): string {
  // Strip ellipsis (spoken as "dot dot dot")
  greeting = greeting.replace(/\.\.\./g, ',');

  // Fix brand name (avoid "Geo-Deskless" mispronunciation)
  greeting = greeting.replace(/goDeskless/g, 'go-deskless');
  greeting = greeting.replace(/GoDeskless/g, 'go-deskless');

  // Remove em-dashes (TTS may stumble on special chars)
  greeting = greeting.replace(/—/g, ',');

  return greeting;
}

// Default KB Tags (v18.8)
const DEFAULT_KB_TAGS = [
  'morgan-godeskless-pricing',
  'morgan-godeskless-roi',
  'morgan-godeskless-competition',
  'morgan-godeskless-battle-cards',
  'morgan-godeskless-implementation',
  'morgan-godeskless-objections',
  'morgan-godeskless-problems-goals',
  'morgan-godeskless-integrations',
  'morgan-godeskless-case-studies',
  'morgan-godeskless-industry-pain',
  'morgan-godeskless-demo'
];

export async function POST(request: Request) {
  const { persona_id, audio_only, memory_id, document_tags } = await request.json();

  if (!process.env.TAVUS_API_KEY) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
    const callbackUrl = baseUrl ? `${baseUrl}/api/webhook` : undefined;

    console.log('Creating conversation with callback:', callbackUrl);
    console.log('DEBUG: Full Base URL:', baseUrl);

    // Clean the greeting
    const rawGreeting = "Hey! I'm Morgan, your goDeskless guide. I'm here to answer questions, share ideas, or just talk through what you're working on. What brings you here today?";
    const cleanedGreeting = cleanGreetingForTTS(rawGreeting);

    // Merge default tags with any custom tags
    const finalTags = Array.from(new Set([...DEFAULT_KB_TAGS, ...(document_tags || [])]));

    const body: any = {
      persona_id: persona_id,
      custom_greeting: cleanedGreeting,
      document_tags: finalTags, // NEW: Attach KB tags
      properties: {
        max_call_duration: 3600,
        enable_recording: true,
      },
    };

    // Apply audio_only preference from client
    if (audio_only) {
      body.audio_only = true;
      console.log('Audio Only mode enabled by user');
    }

    if (callbackUrl) {
      body.callback_url = callbackUrl;
    }

    const response = await fetch('https://tavusapi.com/v2/conversations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.TAVUS_API_KEY,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Tavus API Error Details:', JSON.stringify(errorData, null, 2));
      return NextResponse.json({ error: errorData.message || JSON.stringify(errorData) || 'Failed to create conversation' }, { status: response.status });
    }

    const data = await response.json();
    console.log('Conversation Created:', JSON.stringify(data, null, 2));
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
