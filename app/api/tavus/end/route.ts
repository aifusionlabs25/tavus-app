
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { google } from 'googleapis';
import { GmailDraftService } from '@/lib/gmail-draft-service';
import { GeminiService } from '@/lib/gemini-service';
import { CONFIG } from '@/lib/config';

// Lazy initialize Resend
let resendClient: Resend | null = null;
function getResendClient(): Resend | null {
    if (!resendClient && process.env.RESEND_API_KEY) {
        resendClient = new Resend(process.env.RESEND_API_KEY);
    }
    return resendClient;
}

// Google Sheets Auth Setup
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
    const { conversation_id, notes } = await request.json();

    if (!process.env.TAVUS_API_KEY) {
        return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    try {
        // 1. End Conversation with Tavus
        console.log(`[End Session] Ending conversation ${conversation_id}...`);
        const response = await fetch(`${CONFIG.TAVUS.API_URL}/conversations/${conversation_id}/end`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.TAVUS_API_KEY,
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Tavus End API Error:', errorData);
            // Continue best effort (we still want to try fetching the transcript if available)
        }

        // Wait a brief moment to allow Tavus to wrap up the transcript
        await new Promise(resolve => setTimeout(resolve, 3000));

        // 2. Fetch Transcript
        console.log(`[End Session] Fetching transcript for ${conversation_id}...`);
        const transcriptResponse = await fetch(`${CONFIG.TAVUS.API_URL}/conversations/${conversation_id}`, {
            method: 'GET',
            headers: {
                'x-api-key': process.env.TAVUS_API_KEY,
            },
        });

        let transcriptText = "";
        let tavusRecordingUrl = "";

        if (transcriptResponse.ok) {
            const convoData = await transcriptResponse.json();
            if (convoData.transcript) {
                transcriptText = convoData.transcript;
                tavusRecordingUrl = convoData.recording_url || `https://platform.tavus.io/conversations/${conversation_id}`;
            }
        } else {
            console.error('[End Session] Failed to fetch transcript.');
        }

        // =========================================================================
        // PARALLEL OPERATIONS: ISOLATED FAILURE DOMAINS
        // =========================================================================
        // We run Gemini/Gmail/Sheets in one track, and Resend in another.
        // If one fails, the other still succeeds.

        if (transcriptText) {
            console.log(`[End Session] Starting parallel post-session tasks for ${transcriptText.length} chars...`);
        } else {
            console.warn('[End Session] No transcript available. Tasks may produce limited results.');
        }

        const taskHotLead = async () => {
            if (!transcriptText) return; // Cannot generate hot lead without transcript

            console.log(`[Task: Hot Lead] Analyzing with ${CONFIG.GEMINI.MODEL}...`);
            const gemini = new GeminiService();
            const leadData = await gemini.analyzeTranscript(transcriptText);

            if (leadData) {
                console.log('[Task: Hot Lead] Generating Gmail Draft...');
                const gmailService = new GmailDraftService();

                const finalLeadData = {
                    ...leadData,
                    followUpEmail: "",
                    conversationTranscript: transcriptText,
                    tavusRecordingUrl: tavusRecordingUrl
                };

                await gmailService.createDraft(finalLeadData);

                // Save to Sheets
                const sheets = getSheetsClient();
                if (sheets && process.env.GOOGLE_SHEET_ID) {
                    try {
                        console.log('[Task: Hot Lead] Saving to Google Sheets...');
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
                        console.log('✅ [Task: Hot Lead] Saved to Sheets');
                    } catch (sheetError: any) {
                        // Log but do not throw, so this specific sub-task doesn't look like a total failure if just sheets failed
                        console.error('❌ [Userspace Warning] Google Sheets Error:', sheetError.message);
                    }
                }
            }
        };

        const taskSessionReport = async () => {
            const resend = getResendClient();
            if (resend) {
                const sessionDate = new Date().toLocaleString();
                const hasNotes = notes && notes.length > 0;

                // Format notes
                const notesHtml = hasNotes
                    ? notes.map((n: any) => `
                        <div style="margin-bottom: 8px; padding: 8px; background: #eef2ff; border-left: 3px solid #6366f1; border-radius: 4px;">
                            <div style="font-size: 11px; color: #6b7280; margin-bottom: 2px;">${new Date(n.timestamp).toLocaleTimeString()} - ${n.type.toUpperCase()}</div>
                            <div style="font-size: 14px; color: #1f2937;">${n.text}</div>
                        </div>
                      `).join('')
                    : '<p style="color: #6b7280; font-style: italic;">No notes taken using Session Notepad.</p>';

                // Note about automatic analysis
                const analysisNote = transcriptText
                    ? `<div style="margin-top: 30px; padding-top: 20px; border-top: 1px dashed #e5e7eb;">
                            <h4 style="margin: 0 0 10px 0;">🎯 Automated Analysis</h4>
                            <p style="font-size: 13px; color: #6b7280;">
                                A separate "Hot Lead" analysis report is being generated by ${CONFIG.GEMINI.MODEL} and sent to the sales team.
                            </p>
                        </div>`
                    : '';

                const emailHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: #0f172a; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
                        .content { background: #ffffff; padding: 25px; border: 1px solid #e5e7eb; }
                        .footer { background: #f9fafb; color: #6b7280; padding: 15px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px; }
                        .metric { display: inline-block; padding: 10px; background: #f3f4f6; border-radius: 6px; margin-right: 10px; margin-bottom: 10px; }
                        .metric-label { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
                        .metric-value { font-size: 16px; font-weight: bold; color: #1f2937; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h2 style="margin: 0; font-weight: 300;">Morgan AI <span style="font-weight: 600; color: #34d399;">Session Report</span></h2>
                            <div style="font-size: 12px; opacity: 0.7; margin-top: 5px;">${conversation_id}</div>
                        </div>
                        <div class="content">
                            <h3 style="margin-top: 0;">Session Completed 🏁</h3>
                            <p>A demo session with Morgan has successfully concluded.</p>
                            
                            <div style="margin: 20px 0;">
                                <div class="metric">
                                    <div class="metric-label">Date</div>
                                    <div class="metric-value">${sessionDate.split(',')[0]}</div>
                                </div>
                                <div class="metric">
                                    <div class="metric-label">Time</div>
                                    <div class="metric-value">${sessionDate.split(',')[1]}</div>
                                </div>
                            </div>

                            <h4 style="border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-top: 25px;">📝 User Notes</h4>
                            <div style="margin-top: 15px;">
                                ${notesHtml}
                            </div>
                            
                            ${analysisNote}

                            <p style="font-size: 12px; color: #6b7280; margin-top: 30px;">
                                * Full transcripts and recording links are available in the Tavus dashboard.
                            </p>
                        </div>
                        <div class="footer">
                            Sent via GoDeskless Platform • AI Fusion Labs
                        </div>
                    </div>
                </body>
                </html>
                 `;

                await resend.emails.send({
                    from: 'Morgan AI <noreply@aifusionlabs.app>',
                    to: ['aifusionlabs@gmail.com'],
                    subject: `Session Report: ${conversation_id} [${hasNotes ? 'HAS NOTES' : 'No Notes'}]`,
                    html: emailHtml
                });
                console.log('✅ [Task: Session Report] Resend email dispatched.');
            }
        };

        // SAFETY: Run both tasks. Use allSettled to ensure one failure doesn't crash the API response.
        const results = await Promise.allSettled([
            taskHotLead(),
            taskSessionReport()
        ]);

        results.forEach((result, index) => {
            if (result.status === 'rejected') {
                const taskName = index === 0 ? 'Hot Lead Analysis' : 'Session Report';
                console.error(`❌ [Task Failed] ${taskName}:`, result.reason);
            }
        });

        console.log('[End Session] Pipeline Complete.');
        return NextResponse.json({ success: true, meta: { tasks_completed: results.length } });

    } catch (error) {
        console.error('Error ending conversation:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
