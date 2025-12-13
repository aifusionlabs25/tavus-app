
import { NextResponse } from 'next/server';
import { CONFIG } from '@/lib/config';

export async function POST(request: Request) {
    const { conversation_id, action, pre_demo_context } = await request.json();

    if (!process.env.TAVUS_API_KEY) {
        return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    if (!conversation_id) {
        return NextResponse.json({ error: 'Conversation ID required' }, { status: 400 });
    }

    // CHECK FEATURE FLAG
    if (!CONFIG.TAVUS.ENABLE_CONTEXT_UPDATE) {
        console.log(`[Demo] Skipping context update for ${action} (Feature Flag Disabled)`);
        return NextResponse.json({ success: true, action, message: 'Context update skipped by config' });
    }

    let conversational_context = '';

    if (action === 'start') {
        // Zara's "Start Demo" Context
        conversational_context = `The user has entered interactive demo mode. The goDeskless platform is now visible in an iframe. Briefly narrate what they see: "Perfect! You're now looking at the main dispatch dashboard. This is where your dispatchers manage all field tickets. Feel free to click around—explore the job cards, the technician map, the calendar view. I'm here in the corner if you need help." Then stay mostly quiet unless they ask for guidance or are silent for 15-20 seconds.`;
    } else if (action === 'end') {
        // Zara's "End Demo" Context
        // We can use pre_demo_context to make it more personalized if available
        conversational_context = `The user has returned from interactive demo mode. Welcome them back: "Welcome back! What stood out to you in the demo?" Then connect what they saw to the pain points they shared earlier. For example: "So now that you've seen the dispatch board—can you picture how that drag-and-drop assignment would help coordinate your technicians? That's exactly what eliminates the chaos you mentioned with manual scheduling."`;
    } else {
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    try {
        console.log(`Injecting Context for Demo (${action}):`, conversational_context);

        const response = await fetch(`${CONFIG.TAVUS.API_URL}/conversations/${conversation_id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.TAVUS_API_KEY,
            },
            body: JSON.stringify({
                conversational_context: conversational_context
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.warn('⚠️ Tavus Context Update Failed (Non-Critical):', errorText);
            // We continue regardless so the demo UI opens
        } else {
            console.log('✅ Tavus Context Updated');
        }

        return NextResponse.json({ success: true, action });
    } catch (error: any) {
        console.error('Error in demo route:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
