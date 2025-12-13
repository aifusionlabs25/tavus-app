
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const eventType = body.event_type || 'unknown';

        console.log(`[Webhook] Received event: ${eventType} from conversation: ${body.conversation_id}`);

        // Logic has been consolidated to /api/tavus/end to prevent duplicate emails and race conditions.
        // The webhook now serves only as a system log.

        if (eventType === 'application.transcription_ready') {
            console.log('[Webhook] Transcript ready event received. (Processing handled by End Route)');
        } else if (eventType === 'system.shutdown') {
            console.log('[Webhook] Shutdown event received. (Processing handled by End Route)');
        }

        return NextResponse.json({ message: 'Webhook received & logged' });

    } catch (error: any) {
        console.error('Error processing webhook:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
