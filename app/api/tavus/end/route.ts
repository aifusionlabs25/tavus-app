
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { GmailDraftService } from '@/lib/gmail-draft-service';
import { GeminiService } from '@/lib/gemini-service';

// Lazy initialize Resend
let resendClient: Resend | null = null;
function getResendClient(): Resend | null {
    if (!resendClient && process.env.RESEND_API_KEY) {
        resendClient = new Resend(process.env.RESEND_API_KEY);
    }
    return resendClient;
}

export async function POST(request: Request) {
    const { conversation_id, notes } = await request.json();

    if (!process.env.TAVUS_API_KEY) {
        return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    try {
        // 1. End Conversation with Tavus
        console.log(`[End Session] Ending conversation ${conversation_id}...`);
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
            // Continue best effort
        }

        // =========================================================================
        // PIPELINE: Analysis & "Hot Lead" Report (Gmail) + Session Report (Resend)
        // =========================================================================

        // Wait a brief moment to allow Tavus to wrap up the transcript
        await new Promise(resolve => setTimeout(resolve, 3000));

        // 2. Fetch Transcript
        console.log(`[End Session] Fetching transcript for ${conversation_id}...`);
        const transcriptResponse = await fetch(`https://tavusapi.com/v2/conversations/${conversation_id}`, {
            method: 'GET',
            headers: {
                'x-api-key': process.env.TAVUS_API_KEY,
            },
        });

        let transcriptText = "";
        if (transcriptResponse.ok) {
            const convoData = await transcriptResponse.json();
            if (convoData.transcript) {
                transcriptText = convoData.transcript;
            }
        } else {
            console.error('[End Session] Failed to fetch transcript.');
        }

        // 3. AI Analysis (GEMINI 1.5 FLASH - Zero Cost Tier)
        let leadData = null;
        if (transcriptText) {
            console.log(`[End Session] Analyzing transcript (${transcriptText.length} chars) with Gemini...`);
            const gemini = new GeminiService();
            try {
                leadData = await gemini.analyzeTranscript(transcriptText);
            } catch (aiError) {
                console.error('[End Session] Gemini Analysis Failed:', aiError);
            }
        } else {
            console.log('[End Session] No transcript available for analysis.');
        }

        // 4. Send "Hot Lead" Report via Gmail (The Executive Update)
        if (leadData) {
            console.log('[End Session] Generating Gmail Hot Lead Report...');
            const gmailService = new GmailDraftService();
            // Supplement with empty fields if missing to match interface
            const finalLeadData = {
                ...leadData,
                followUpEmail: "",
                conversationTranscript: transcriptText,
                tavusRecordingUrl: `https://platform.tavus.io/conversations/${conversation_id}`
            };

            await gmailService.createDraft(finalLeadData);
        }

        // 5. Send "Session Report" via Resend (The User Notes Update)
        const resend = getResendClient();
        if (resend) {
            const sessionDate = new Date().toLocaleString();

            // Format notes for email
            const notesHtml = notes && notes.length > 0
                ? notes.map((n: any) => `
                    <div style="margin-bottom: 8px; padding: 8px; background: #eef2ff; border-left: 3px solid #6366f1; border-radius: 4px;">
                        <div style="font-size: 11px; color: #6b7280; margin-bottom: 2px;">${new Date(n.timestamp).toLocaleTimeString()} - ${n.type.toUpperCase()}</div>
                        <div style="font-size: 14px; color: #1f2937;">${n.text}</div>
                    </div>
                  `).join('')
                : '<p style="color: #6b7280; font-style: italic;">No notes taken using Session Notepad.</p>';

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
                        
                        ${leadData ? `
                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px dashed #e5e7eb;">
                            <h4 style="margin: 0 0 10px 0;">🎯 Automated Analysis Detected (Gemini)</h4>
                            <p style="font-size: 13px; color: #6b7280;">
                                A separate "Hot Lead" report has been sent to the sales team with full analysis: 
                                <strong>${leadData.lead_name || 'Prospect'} from ${leadData.company_name || 'Company'}</strong>.
                            </p>
                        </div>
                        ` : ''}

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
                subject: `Session Report: ${conversation_id} [${notes && notes.length > 0 ? 'HAS NOTES' : 'No Notes'}]`,
                html: emailHtml
            });
            console.log('✅ Session Report (Resend) dispatched.');
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error ending conversation:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
