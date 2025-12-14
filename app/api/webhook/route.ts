
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
            .map((t: any) => `${t.role || 'unknown'}: ${t.content || ''}`)
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

        // Handle Transcript Ready OR Shutdown: Use both as triggers to be safe.
        if (eventType === 'application.transcription_ready' || eventType === 'system.shutdown') {

            console.log(`[Webhook] 📜 Event '${eventType}' received for ${conversation_id}. Attempting Hot Lead Analysis...`);

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

                // Retry loop: 5 attempts with increasing backoff
                const delays = [2000, 4000, 6000, 8000, 10000];

                for (let attempt = 0; attempt < 5; attempt++) {
                    try {
                        // CRITICAL FIX: Must use ?verbose=true to get transcript data
                        const transcriptResponse = await fetch(`${CONFIG.TAVUS.API_URL}/conversations/${conversation_id}?verbose=true`, {
                            method: 'GET',
                            headers: { 'x-api-key': process.env.TAVUS_API_KEY },
                        });

                        if (transcriptResponse.ok) {
                            const convoData = await transcriptResponse.json();

                            // DEBUG LOG: Inspect structure
                            console.log(`[Webhook] API Response Keys (Attempt ${attempt + 1}):`, Object.keys(convoData));

                            if (convoData.transcript) {
                                const apiTranscript = normalizeTranscript(convoData.transcript);
                                console.log(`[Webhook] API Transcript Length (Normalized): ${apiTranscript.length} chars`);

                                if (apiTranscript.length > transcriptText.length) {
                                    transcriptText = apiTranscript;
                                }

                                if (convoData.recording_url) tavusRecordingUrl = convoData.recording_url;

                                if (transcriptText.length >= 200) {
                                    console.log(`[Webhook] Transcript fetched successfully on attempt ${attempt + 1}`);
                                    break; // Success!
                                }
                            }
                        } else {
                            console.error(`[Webhook] API Error ${transcriptResponse.status}:`, await transcriptResponse.text());
                        }
                    } catch (err) {
                        console.error(`[Webhook] API fetch failed attempt ${attempt + 1}:`, err);
                    }

                    if (attempt < 4) {
                        const waitTime = delays[attempt];
                        console.log(`[Webhook] Transcript still short. Waiting ${waitTime}ms (Attempt ${attempt + 1}/5)...`);
                        await new Promise(r => setTimeout(r, waitTime));
                    }
                }
            }

            // ============================================================================
            // NOVA FIX #3: USE 200+ CHAR GATE (more realistic for actual conversations)
            // ============================================================================
            if (transcriptText && transcriptText.length >= 200) {
                // 2. Gemini Analysis
                console.log(`[Webhook] ✅ Analyzing ${transcriptText.length} chars with ${CONFIG.GEMINI.MODEL}...`);
                const gemini = new GeminiService();
                const leadData = await gemini.analyzeTranscript(transcriptText);

                if (leadData) {
                    // 3. Send Gmail Hot Lead Report
                    console.log('[Webhook] Generating Gmail Draft...');
                    const gmailService = new GmailDraftService();
                    const finalLeadData = {
                        ...leadData,
                        followUpEmail: "",
                        conversationTranscript: transcriptText,
                        tavusRecordingUrl: tavusRecordingUrl
                    };
                    await gmailService.createDraft(finalLeadData);

                    // 4. Save to Google Sheets
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
                                finalLeadData.salesPlan || '',
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
