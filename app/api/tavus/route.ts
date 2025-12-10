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
  // Destructure body, but we will IGNORE persona_id from client to ensure security
  const { persona_id: _ignored, audio_only, memory_id, document_tags, custom_greeting, context_url, conversation_name, conversational_context } = await request.json();

  // 1. Get Persona ID secure from server
  const serverPersonaId = process.env.TAVUS_PERSONA_ID;
  if (!serverPersonaId) {
    console.error('SERVER ERROR: TAVUS_PERSONA_ID not set in env');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:3000';
    const callbackUrl = baseUrl ? `${baseUrl}/api/webhook` : undefined;

    console.log('Creating conversation for Persona:', serverPersonaId);

    // Clean the greeting
    const rawGreeting = custom_greeting || "Hey! I'm Morgan, your goDeskless guide. I'm here to answer questions, share ideas, or just talk through what you're working on. What brings you here today?";
    const cleanedGreeting = cleanGreetingForTTS(rawGreeting);

    // Merge default tags with any custom tags
    const finalTags = Array.from(new Set([...DEFAULT_KB_TAGS, ...(document_tags || [])]));

    const body: any = {
      persona_id: serverPersonaId, // Reverting to 'persona_id' as verified working in previous version
      custom_greeting: cleanedGreeting,
      conversation_name: conversation_name || "Morgan Demo Session",
      conversational_context: conversational_context || "You are Morgan, a helpful guide.",
      document_tags: finalTags,
      properties: {
        max_call_duration: 3600,
        enable_recording: true,
        participant_absent_timeout: 600,
      },
      audio_only: audio_only,
      memory_id: memory_id,
      callback_url: callbackUrl,
    };

    const response = await fetch("https://tavusapi.com/v2/conversations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.TAVUS_API_KEY || "",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[Tavus API] Request Failed:', JSON.stringify(errorData, null, 2)); // Detailed logging
      return NextResponse.json({ error: errorData.message || 'Failed to start conversation' }, { status: response.status });
    }

    const data = await response.json();
    console.log('[Tavus API] Conversation created:', data.conversation_id);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[Tavus API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
