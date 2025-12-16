
import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { GmailDraftService } from '@/lib/gmail-draft-service';
import { GeminiService } from '@/lib/gemini-service';
import { CONFIG } from '@/lib/config';

// Allow webhook to run for up to 60 seconds (Vercel Limit) to wait for transcripts
export const maxDuration = 60;

// Google Sheets Auth Helper
const getPrivateKey = () => {
    const key = process.env.GOOGLE_PRIVATE_KEY;
    if (!key) return undefined;
    return key.replace(/\\n/g, '\n').replace(/"/g, '');
};

let sheetsClient: any = null;
function getSheetsClient() {
    if (sheetsClient) return sheetsClient;

    if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY && process.env.GOOGLE_SHEET_ID) {
        try {
            const auth = new google.auth.GoogleAuth({
                credentials: {
                    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                    private_key: getPrivateKey(),
                },
                scopes: ['https://www.googleapis.com/auth/spreadsheets'],
            });
            sheetsClient = google.sheets({ version: 'v4', auth });
            return sheetsClient;
        } catch (e) {
            console.error('[Sheets Auth Error]', e);
            return null;
        }
    }
    return null;
}

// ============================================================================
// NOVA FIX: Normalize Transcript (Array -> String)
// Tavus verbose mode returns transcript as array of {role, content} objects.
// ============================================================================
function normalizeTranscript(rawTranscript: any): string {
    if (!rawTranscript) return "";

    // If already a string, return as-is
    if (typeof rawTranscript === 'string') return rawTranscript;

    // If array (Tavus format), convert to readable string
    if (Array.isArray(rawTranscript)) {
        return rawTranscript
            .map((t: any) => `${t.role || t.sender || 'unknown'}: ${t.content || t.text || t.transcript || ''}`)
            .join('\n');
    }

    // Fallback: Try to stringify
    try {
        return JSON.stringify(rawTranscript);
    } catch {
        return "";
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const eventType = body.event_type || 'unknown';
        const conversation_id = body.conversation_id;

        console.log(`[Webhook] Received event: ${eventType} from conversation: ${conversation_id}`);

        // NOVA DEMO-PROOFING: Verification log for quick debugging
        console.log(`[Webhook] 🔍 VERIFY: Model=${CONFIG.GEMINI.MODEL}, Event=${eventType}, ConvoID=${conversation_id}`);

        // ============================================================================
        // NOVA FIX #4: Shutdown just ACKs (no transcript available in this event)
        // ============================================================================
        if (eventType === 'system.shutdown') {
            console.log('[Webhook] Shutdown ACK. No analysis (transcript not in this event).');
            return NextResponse.json({ message: 'Shutdown acknowledged' });
        }

        // ============================================================================
        // SINGLE TRIGGER: Only analyze on transcription_ready (where transcript lives)
        // ============================================================================
        if (eventType === 'application.transcription_ready') {

            console.log(`[Webhook] 📜 Transcript Ready for ${conversation_id}. Starting Hot Lead Analysis...`);

            let transcriptText = "";
            let tavusRecordingUrl = `https://platform.tavus.io/conversations/${conversation_id}`;

            // ============================================================================
            // NOVA FIX #1: PREFER WEBHOOK PAYLOAD TRANSCRIPT (Faster, fewer moving parts)
            // ============================================================================
            if (body.properties && body.properties.transcript) {
                console.log('[Webhook] Found transcript in webhook payload (body.properties.transcript).');
                transcriptText = normalizeTranscript(body.properties.transcript);
                console.log(`[Webhook] Payload Transcript Length (Normalized): ${transcriptText.length} chars`);
            } else if (body.transcript) {
                console.log('[Webhook] Found transcript in webhook payload (body.transcript).');
                transcriptText = normalizeTranscript(body.transcript);
                console.log(`[Webhook] Payload Transcript Length (Normalized): ${transcriptText.length} chars`);
            }

            // ============================================================================
            // NOVA FIX #2: ONLY HIT TAVUS API IF PAYLOAD MISSING/SHORT (Fallback Only)
            // ============================================================================
            if (transcriptText.length < 200 && process.env.TAVUS_API_KEY) {
                console.log('[Webhook] Payload transcript missing or short. Falling back to Tavus API...');

                // Retry loop: 3 attempts (reduced since payload should usually have it)
                const delays = [2000, 4000, 6000];

                for (let attempt = 0; attempt < 3; attempt++) {
                    try {
                        const transcriptResponse = await fetch(`${CONFIG.TAVUS.API_URL}/conversations/${conversation_id}?verbose=true`, {
                            method: 'GET',
                            headers: { 'x-api-key': process.env.TAVUS_API_KEY },
                        });

                        if (transcriptResponse.ok) {
                            const convoData = await transcriptResponse.json();

                            console.log(`[Webhook] API Response Keys (Attempt ${attempt + 1}):`, Object.keys(convoData));

                            if (convoData.transcript) {
                                const apiTranscript = normalizeTranscript(convoData.transcript);
                                if (apiTranscript.length > transcriptText.length) {
                                    transcriptText = apiTranscript;
                                }
                                if (convoData.recording_url) tavusRecordingUrl = convoData.recording_url;
                            }

                            // Check events array as fallback
                            if (convoData.events && Array.isArray(convoData.events) && transcriptText.length < 200) {
                                const eventsTranscript = convoData.events
                                    .filter((e: any) => e.content || e.text || e.transcript || e.message)
                                    .map((e: any) => `${e.role || e.sender || 'unknown'}: ${e.content || e.text || e.transcript || e.message || ''}`)
                                    .join('\n');

                                if (eventsTranscript.length > transcriptText.length) {
                                    transcriptText = eventsTranscript;
                                }
                            }

                            if (transcriptText.length >= 200) break;
                        }
                    } catch (err) {
                        console.error(`[Webhook] API fetch failed attempt ${attempt + 1}:`, err);
                    }

                    if (attempt < 2) {
                        await new Promise(r => setTimeout(r, delays[attempt]));
                    }
                }
            }

            // ============================================================================
            // NOVA FIX #3: USE 200+ CHAR GATE (more realistic for actual conversations)
            // ============================================================================
            if (transcriptText && transcriptText.length >= 200) {
                console.log(`[Webhook] ✅ Analyzing ${transcriptText.length} chars with ${CONFIG.GEMINI.MODEL}...`);

                const gemini = new GeminiService();
                let leadData = null;

                // RETRY LOGIC FOR 429 (Rate Limits)
                // Why 2 retries? Because free tier resets every minute, 25s wait usually sufficient
                for (let retry = 0; retry < 2; retry++) {
                    try {
                        leadData = await gemini.analyzeTranscript(transcriptText);
                        break; // Success!
                    } catch (error: any) {
                        if (error?.message?.includes('429') || error?.status === 429 || error?.errorDetails?.[0]?.reason === 'RATE_LIMIT_EXCEEDED') {
                            console.warn(`[Webhook] ⚠️ Gemini 429 Rate Limit hit. Waiting 25s (Attempt ${retry + 1}/2)...`);
                            await new Promise(r => setTimeout(r, 25000));
                        } else {
                            console.error(`[Webhook] ❌ Gemini Error (Attempt ${retry + 1}):`, error);
                            throw error; // Other error, rethrow
                        }
                    }
                }

                if (leadData) {
                    console.log('[Webhook] Generating Gmail Draft...');
                    const gmailService = new GmailDraftService();
                    const finalLeadData = {
                        ...leadData,
                        followUpEmail: "",
                        conversationTranscript: transcriptText,
                        tavusRecordingUrl: tavusRecordingUrl
                    };
                    await gmailService.createDraft(finalLeadData);

                    const sheets = getSheetsClient();
                    if (sheets && process.env.GOOGLE_SHEET_ID) {
                        try {
                            console.log('[Webhook] SAVING TO GOOGLE SHEETS...');
                            const values = [[
                                new Date().toISOString(),
                                finalLeadData.lead_name || 'Not Provided',
                                finalLeadData.role || 'Not Provided',
                                finalLeadData.company_name || 'Not Provided',
                                finalLeadData.lead_email || 'Not Provided',
                                finalLeadData.lead_phone || 'Not Provided',
                                finalLeadData.budget_range || 'Not Provided',
                                finalLeadData.timeline || 'Not Provided',
                                Array.isArray(finalLeadData.pain_points) ? finalLeadData.pain_points.join(', ') : (finalLeadData.pain_points || ''),
                                Array.isArray(finalLeadData.buying_committee) ? finalLeadData.buying_committee.join(', ') : (finalLeadData.buying_committee || ''),
                                finalLeadData.vertical || 'Field Service',
                                finalLeadData.teamSize || 'Not Provided',
                                finalLeadData.geography || 'Not Provided',
                                finalLeadData.currentSystems || 'Not Provided',
                                // Safe join for salesPlan (which might be array)
                                Array.isArray(finalLeadData.salesPlan) ? finalLeadData.salesPlan.join('\n') : (finalLeadData.salesPlan || ''),
                                finalLeadData.tavusRecordingUrl
                            ]];

                            await sheets.spreadsheets.values.append({
                                spreadsheetId: process.env.GOOGLE_SHEET_ID,
                                range: 'Sheet1!A:Q',
                                valueInputOption: 'USER_ENTERED',
                                requestBody: { values },
                            });
                            console.log('✅ [Webhook] Saved row to Google Sheets');
                        } catch (sheetError: any) {
                            console.error('❌ [Webhook] Google Sheets Error:', sheetError.message);
                        }
                    }

                    console.log('[Webhook] 🚀 Hot Lead Pipeline Complete!');
                } else {
                    console.warn('[Webhook] Gemini returned null lead data.');
                }
            } else {
                console.warn(`[Webhook] Transcript too short (${transcriptText.length} chars, need 200+). Skipping analysis.`);
            }
        }

        return NextResponse.json({ message: 'Event processed' });

    } catch (error: any) {
        console.error('Error processing webhook:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
