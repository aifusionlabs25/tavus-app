
import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { Resend } from 'resend'; // Switched from GmailDraft to Resend for "Spoofing"
import { OpenAIService } from '@/lib/openai-service';
import { CONFIG } from '@/lib/config';
import { SalesforceService } from '@/lib/salesforce-service';

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
        // Track unique messages to prevent duplicates (Event Stream issue)
        const seen = new Set<string>();

        return rawTranscript
            .map((t: any) => {
                // PRIORITIZE distinct content over history
                const role = t.role || t.sender || 'unknown';
                const content = t.content || t.text || t.message || '';

                // IGNORE System Prompts (The main source of bloat)
                if (role.toLowerCase() === 'system') return null;

                // If content is empty, ignore this entry (it's likely a system event or metadata)
                if (!content || typeof content !== 'string') return null;

                const line = `${role}: ${content}`;

                // Effective Deduplication
                if (seen.has(line)) return null;
                seen.add(line);

                return line;
            })
            .filter(Boolean) // Remove nulls
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
        console.log(`[Webhook] 🔍 VERIFY: Model=${CONFIG.OPENAI.MODEL}, Event=${eventType}, ConvoID=${conversation_id}`);

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
            let tavusRecordingUrl: string | null = null;
            let leadData: any = null; // Hoisted for visibility in fallback logger

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
            // ============================================================================
            // NOVA FIX #2: ALWAYS SYNC WITH TAVUS API (Metadata + Recording URL)
            // Even if we have transcript, we need the recording_url and other metadata.
            // ============================================================================
            if (process.env.TAVUS_API_KEY) {
                console.log('[Webhook] Syncing conversation metadata definitions...');

                // Retry loop: 3 attempts
                const delays = [2000, 4000, 6000];

                for (let attempt = 0; attempt < 3; attempt++) {
                    try {
                        const transcriptResponse = await fetch(`${CONFIG.TAVUS.API_URL}/conversations/${conversation_id}?verbose=true`, {
                            method: 'GET',
                            headers: { 'x-api-key': process.env.TAVUS_API_KEY },
                        });

                        if (transcriptResponse.ok) {
                            const convoData = await transcriptResponse.json();

                            // 1. Sync Recording URL (Critical for Internal Email)
                            if (convoData.recording_url) {
                                tavusRecordingUrl = convoData.recording_url;
                                console.log('[Webhook] ✅ Captured Public Recording URL:', tavusRecordingUrl);
                            }

                            // 2. Sync / Enrich Transcript if better version found
                            if (convoData.transcript) {
                                const apiTranscript = normalizeTranscript(convoData.transcript);
                                if (apiTranscript.length > transcriptText.length) {
                                    transcriptText = apiTranscript;
                                    console.log(`[Webhook] Enriched transcript from API (${transcriptText.length} chars)`);
                                }
                            }

                            break; // Success
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
            // NOVA FIX #3: LOWERED GATE TO 50 CHARS (Better for testing)
            // ============================================================================
            if (transcriptText && transcriptText.length >= 50) {
                console.log(`[Webhook] ✅ Analyzing ${transcriptText.length} chars with ${CONFIG.OPENAI.MODEL}...`);
                console.log(`[Webhook] 📜 NORMALIZED TRANSCRIPT PREVIEW:`, transcriptText.substring(0, 500) + '...');

                const aiService = new OpenAIService();
                // leadData already declared in outer scope

                try {
                    leadData = await aiService.analyzeTranscript(transcriptText);
                } catch (error: any) {
                    console.error('[Webhook] ❌ AI Analysis Failed:', error);
                    // Safe Mode fallback is handled inside OpenAIService
                }

                // ============================================================================
                // NOVA FIX #6: TRUST VERIFIED IDENTITY (Override AI Hallucinations)
                // ============================================================================
                if (body.properties && body.properties.user_email) {
                    if (!leadData) leadData = {}; // Initialize if AI failed completely
                    leadData.lead_email = body.properties.user_email;
                    if (body.properties.user_name) leadData.lead_name = body.properties.user_name;
                    console.log('[Webhook] 📧 Enforcing Verified User Identity:', leadData.lead_email);
                }

                if (leadData) {
                    console.log('[Webhook] Sending "Spoofed" Follow-up Email via Resend...');

                    if (process.env.RESEND_API_KEY) {
                        const resend = new Resend(process.env.RESEND_API_KEY);

                        // User requested spoofing: "Morgan drafts that follow up email... impress the CEO"
                        // Fallback to aifusionlabs@gmail.com if lead email is missing or for demo safety
                        const recipient = leadData.lead_email && leadData.lead_email.includes('@') ? leadData.lead_email : 'aifusionlabs@gmail.com';

                        // Create a nicer HTML wrapper for the AI-generated text
                        const emailBodyHtml = `
                        <div style="font-family: sans-serif; padding: 20px; line-height: 1.6; color: #333;">
                            <p style="white-space: pre-line;">${leadData.followUpEmail}</p>
                            <br>
                            <hr style="border: 0; border-top: 1px solid #eee;">
                            <p style="color: #666; font-size: 0.9em;">
                                <strong>Morgan</strong><br>
                                Senior Field Service Transformation Specialist<br>
                                <span style="color: #FF4F00;">GoDeskless</span><br>
                                <a href="https://www.godeskless.com">www.godeskless.com</a>
                            </p>
                        </div>
                        `;

                        await resend.emails.send({
                            from: 'Morgan at GoDeskless <noreply@aifusionlabs.app>',
                            to: [recipient, 'aifusionlabs@gmail.com'], // Always BCC the user for the demo
                            subject: `Action Plan: Next Steps for ${leadData.company_name || 'Your Team'}`,
                            html: emailBodyHtml
                        });
                        console.log('✅ [Webhook] Sent "Morgan" email to:', recipient);

                        // ============================================================================
                        // NOVA FEATURE: INTERNAL LEAD ALERT (The "3rd Email")
                        // Separate email to the internal team with rich data for scoring/review
                        // ============================================================================
                        // ============================================================================
                        // NOVA FEATURE: INTERNAL LEAD ALERT (The "3rd Email")
                        // Separate email to the internal team with rich data for scoring/review
                        // ============================================================================
                        console.log('[Webhook] Sending Internal Lead Alert...');

                        const internalBodyHtml = `
                        <div style="font-family: sans-serif; padding: 20px; line-height: 1.5; color: #333; background-color: #f9f9f9; border: 1px solid #ddd; border-radius: 8px;">
                            <div style="border-bottom: 2px solid #FF4F00; padding-bottom: 10px; margin-bottom: 15px;">
                                <h2 style="color: #FF4F00; margin: 0;">🚨 Hot Lead Detected</h2>
                                <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">Conversation ID: ${conversation_id}</p>
                            </div>

                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                                <div>
                                    <h3 style="margin-bottom: 10px; color: #111;">👤 Prospect</h3>
                                    <p style="margin: 5px 0;"><strong>Name:</strong> ${leadData.lead_name}</p>
                                    <p style="margin: 5px 0;"><strong>Role:</strong> ${leadData.role}</p>
                                    <p style="margin: 5px 0;"><strong>Company:</strong> ${leadData.company_name}</p>
                                    <p style="margin: 5px 0;"><strong>Email:</strong> ${leadData.lead_email}</p>
                                    <p style="margin: 5px 0;"><strong>Location:</strong> ${leadData.geography}</p>
                                </div>
                                <div>
                                    <h3 style="margin-bottom: 10px; color: #111;">🏢 Organization</h3>
                                    <p style="margin: 5px 0;"><strong>Vertical:</strong> ${leadData.vertical}</p>
                                    <p style="margin: 5px 0;"><strong>Team Size:</strong> ${leadData.teamSize}</p>
                                    <p style="margin: 5px 0;"><strong>Budget:</strong> ${leadData.budget_range}</p>
                                    <p style="margin: 5px 0;"><strong>Systems:</strong> ${leadData.currentSystems}</p>
                                </div>
                            </div>

                            <hr style="border: 0; border-top: 1px solid #ccc; margin: 20px 0;">

                            <h3 style="color: #111;">⚠️ Pain Points</h3>
                            <ul style="background: #fff; padding: 15px 20px; border-radius: 4px; border: 1px solid #e5e5e5;">
                                ${(leadData.pain_points || []).map((p: string) => `<li>${p}</li>`).join('')}
                            </ul>

                            <h3 style="color: #111;">🤖 AI Analysis & Next Steps</h3>
                            <div style="background: #eef2ff; padding: 15px; border-radius: 4px; margin-bottom: 10px; border-left: 4px solid #6366f1;">
                                <strong>Morgan's Action:</strong><br>
                                ${leadData.morgan_action || 'Standard follow-up sent.'}
                            </div>
                            <div style="background: #fdf2f8; padding: 15px; border-radius: 4px; margin-bottom: 20px; border-left: 4px solid #ec4899;">
                                <strong>Recommended Team Action:</strong><br>
                                ${leadData.team_action || 'Call to verify lead details.'}
                            </div>

                            <div style="text-align: center; margin-top: 30px;">
                                ${tavusRecordingUrl
                                ? `<a href="${tavusRecordingUrl}" style="background-color: #333; color: #fff; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Conversation Record</a>
                                       <p style="margin-top: 10px; font-size: 12px; color: #999;">Link expires in 7 days</p>`
                                : `<div style="background-color: #eee; color: #666; padding: 12px 25px; border-radius: 6px; display: inline-block;">Video Processing...</div>
                                       <p style="margin-top: 10px; font-size: 12px; color: #999;">Recording will be available in your Dashboard shortly.</p>`
                            }
                            </div>
                        </div>
                        `;

                        await resend.emails.send({
                            from: 'GoDeskless Intelligence <alerts@aifusionlabs.app>',
                            to: 'aifusionlabs@gmail.com',
                            subject: `[LEAD ALERT] ${leadData.company_name} - ${leadData.lead_name}`,
                            html: internalBodyHtml
                        });
                        console.log('✅ [Webhook] Sent "Internal Alert" email to Team.');

                    } else {
                        console.error('❌ [Webhook] RESEND_API_KEY missing. Cannot send email.');
                    }




                    console.log('[Webhook] 🚀 Hot Lead Pipeline Complete!');
                }
            } else {
                console.warn(`[Webhook] Transcript too short (${transcriptText.length} chars). Skipping AI, but logging to Sheets.`);
            }


            // ============================================================================
            // NOVA FIX #5: ALWAYS LOG TO SHEETS (Combined Fallback Logic)
            // ============================================================================
            const sheets = getSheetsClient();
            if (sheets && process.env.GOOGLE_SHEET_ID) {
                try {
                    console.log('[Webhook] SAVING TO GOOGLE SHEETS...');

                    // Fallback to "Unknown" if no leadData exists
                    const finalLeadData: any = leadData || {
                        lead_name: 'Unknown (Short/Failed)',
                        role: 'N/A',
                        company_name: 'N/A',
                        lead_email: 'N/A',
                        lead_phone: 'N/A',
                        budget_range: 'N/A',
                        timeline: 'N/A',
                        pain_points: [],
                        buying_committee: [],
                        vertical: 'N/A',
                        teamSize: 'N/A',
                        geography: 'N/A',
                        currentSystems: 'N/A',
                        salesPlan: `Transcript Length: ${transcriptText.length} chars.`,
                        tavusRecordingUrl: tavusRecordingUrl || ''
                    };

                    // explicit override if needed
                    if (!leadData && tavusRecordingUrl) {
                        finalLeadData.tavusRecordingUrl = tavusRecordingUrl;
                    } else if (leadData && tavusRecordingUrl) {
                        finalLeadData.tavusRecordingUrl = tavusRecordingUrl;
                    }

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

            // ============================================================================
            // SALESFORCE DUAL-WRITE (Optional - Controlled by SALESFORCE_ENABLED env var)
            // ============================================================================
            if (process.env.SALESFORCE_ENABLED === 'true' && leadData && leadData.lead_name) {
                try {
                    console.log('[Webhook] 🔗 Syncing Lead to Salesforce...');
                    const sfService = new SalesforceService();
                    const sfLeadId = await sfService.createLead(leadData);
                    console.log('✅ [Webhook] Salesforce Lead created:', sfLeadId);
                } catch (sfError: any) {
                    console.error('❌ [Webhook] Salesforce Error:', sfError.message);
                    // Non-blocking: Don't fail the webhook if Salesforce fails
                }
            }

            console.log('[Webhook] 🚀 Hot Lead Pipeline Complete!');

            return NextResponse.json({ message: 'Event processed' });

        }

        // ============================================================================
        // FALLBACK: Handle any other event types gracefully
        // ============================================================================
        console.log(`[Webhook] Ignoring unhandled event type: ${eventType}`);
        return NextResponse.json({ message: `Event ${eventType} acknowledged but not processed` });

    } catch (error: any) {
        console.error('Error processing webhook:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
