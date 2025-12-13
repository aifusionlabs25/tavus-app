
import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { GmailDraftService } from '@/lib/gmail-draft-service';
import { GeminiService } from '@/lib/gemini-service';
import { CONFIG } from '@/lib/config';

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

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const eventType = body.event_type || 'unknown';
        const conversation_id = body.conversation_id;

        console.log(`[Webhook] Received event: ${eventType} from conversation: ${conversation_id}`);

        // Handle Transcript Ready OR Shutdown: Use both as triggers to be safe.
        // Reason: Sometimes 'transcription_ready' is delayed or missed, but 'shutdown' always fires.
        if (eventType === 'application.transcription_ready' || eventType === 'system.shutdown') {

            console.log(`[Webhook] 📜 Event '${eventType}' received for ${conversation_id}. Attempting Hot Lead Analysis...`);

            // 1. Fetch Full Transcript (With Retry)
            let transcriptText = "";
            let tavusRecordingUrl = `https://platform.tavus.io/conversations/${conversation_id}`;

            if (process.env.TAVUS_API_KEY) {
                // Retry loop: Try up to 3 times to get the transcript (Wait 2s, 4s, 6s)
                for (let attempt = 1; attempt <= 3; attempt++) {
                    try {
                        const transcriptResponse = await fetch(`${CONFIG.TAVUS.API_URL}/conversations/${conversation_id}`, {
                            method: 'GET',
                            headers: { 'x-api-key': process.env.TAVUS_API_KEY },
                        });

                        if (transcriptResponse.ok) {
                            const convoData = await transcriptResponse.json();
                            transcriptText = convoData.transcript || "";
                            if (convoData.recording_url) tavusRecordingUrl = convoData.recording_url;

                            if (transcriptText.length > 50) {
                                console.log(`[Webhook] Transcript fetched successfully on attempt ${attempt} (${transcriptText.length} chars)`);
                                break; // Success!
                            }
                        }
                    } catch (err) {
                        console.error(`[Webhook] API fetch failed attempt ${attempt}:`, err);
                    }

                    if (attempt < 3) {
                        console.log(`[Webhook] Transcript empty or short. Waiting 2000ms... (Attempt ${attempt}/3)`);
                        await new Promise(r => setTimeout(r, 2000));
                    }
                }
            }

            if (!transcriptText) {
                console.warn('[Webhook] Transcript text empty after api retries. Checking payload...');
                if (body.transcript) transcriptText = body.transcript;
            }

            if (transcriptText && transcriptText.length > 20) {
                // 2. Gemini Analysis
                console.log(`[Webhook] Analyzing ${transcriptText.length} chars with ${CONFIG.GEMINI.MODEL}...`);
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

                    console.log('[Webhook] Hot Lead Pipeline Complete. 🚀');
                } else {
                    console.warn('[Webhook] Gemini returned null lead data.');
                }
            } else {
                console.warn('[Webhook] No transcript available (Session too short or silent). Skipping analysis.');
            }
        }

        return NextResponse.json({ message: 'Event processed' });

    } catch (error: any) {
        console.error('Error processing webhook:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
