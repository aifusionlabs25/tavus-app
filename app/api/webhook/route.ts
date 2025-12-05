import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GmailDraftService } from '@/lib/gmail-draft-service';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

// Initialize Google Sheets Auth
const getPrivateKey = () => {
    const key = process.env.GOOGLE_PRIVATE_KEY;
    if (!key) return undefined;

    // Handle Vercel's escaped newlines and potential quotes
    return key.replace(/\\n/g, '\n').replace(/"/g, '');
};

const auth = new google.auth.GoogleAuth({
    credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: getPrivateKey(),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

// Helper to format complex objects into strings for Google Sheets
function formatCellData(data: any): string {
    if (!data) return '';
    if (typeof data === 'string') return data;

    // Handle Sales Strategy Object
    if (data.steps && Array.isArray(data.steps)) {
        return data.steps.map((s: any) => `${s.step_number}. ${s.title}: ${s.description}`).join('\n\n');
    }

    // Handle Email Object
    if (data.subject && data.body) {
        return `Subject: ${data.subject}\n\n${data.body}`;
    }

    // Fallback for other objects
    return JSON.stringify(data, null, 2);
}

interface LeadData {
    lead_name: string;
    role: string;
    company_name: string;
    vertical: string;
    teamSize: string;
    geography: string;
    pain_points: string[];
    currentSystems: string;
    buying_committee: string[];
    budget_range: string;
    timeline: string;
    lead_email: string;
    lead_phone: string;
    salesPlan: string;
    followUpEmail: string;
    conversationTranscript?: string;
    tavusRecordingUrl?: string;
}

// Persona IDs
const PERSONA_V18_7 = 'p17be47caaec';
const PERSONA_V18_8 = 'p485e5b31290'; // Morgan v18.8 (Tavus-Native)

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const eventType = body.event_type || 'unknown';
        const personaId = body.persona_id;

        // DEBUG: Log the full body to see exactly what Zara is sending
        console.log('🚨 FULL WEBHOOK BODY:', JSON.stringify(body, null, 2));

        // ROUTING: Check for v18.8 Native Persona
        if (personaId === PERSONA_V18_8) {
            console.log('🚀 Routing to v18.8 Native Handler');
            return await handleNativeMorgan(body);
        }

        // FALLBACK: v18.7 Legacy Logic (Existing Code Below)

        // 1. IGNORE IRRELEVANT EVENTS
        if (eventType === 'application.perception_analysis' || eventType === 'system.replica_joined') {
            console.log(`Ignoring event: ${eventType}`);
            return NextResponse.json({ message: `Ignored ${eventType}` });
        }

        // 2. HANDLE TRANSCRIPT LOGIC
        let transcriptText = '';

        // Case A: Transcript Ready Event (Check both body.transcript and body.properties.transcript)
        if (eventType === 'application.transcription_ready') {
            if (body.transcript) {
                transcriptText = body.transcript;
            } else if (body.properties && body.properties.transcript) {
                // Tavus sometimes sends it as an array of objects in properties
                const t = body.properties.transcript;
                if (Array.isArray(t)) {
                    transcriptText = t.map((msg: any) => `${msg.role}: ${msg.content}`).join('\n');
                } else {
                    transcriptText = String(t);
                }
            }
            console.log('Received transcription_ready event.');
        }
        // Case B: Shutdown Event (Fetch transcript manually if missing)
        else if (eventType === 'system.shutdown' || eventType === 'c.conversation.completed') {
            console.log('Received shutdown event. Starting manual fetch with retries...');

            const convId = body.conversation_id;
            if (convId && process.env.TAVUS_API_KEY) {
                // Retry logic: 3 attempts, 5 seconds apart
                for (let i = 0; i < 3; i++) {
                    try {
                        console.log(`Attempt ${i + 1}/3: Fetching transcript for ${convId}...`);

                        // Wait 5 seconds before each attempt (including the first one to give Tavus time)
                        await new Promise(resolve => setTimeout(resolve, 5000));

                        const res = await fetch(`https://tavusapi.com/v2/conversations/${convId}?verbose=true`, {
                            headers: { 'x-api-key': process.env.TAVUS_API_KEY }
                        });

                        if (res.ok) {
                            const data = await res.json();

                            // Extract transcript from events
                            let fetchedTranscript = data.transcript;
                            if (!fetchedTranscript && data.events && Array.isArray(data.events)) {
                                const transcriptEvent = data.events.find((e: any) => e.event_type === 'application.transcription_ready');
                                if (transcriptEvent?.properties?.transcript) {
                                    const t = transcriptEvent.properties.transcript;
                                    if (Array.isArray(t)) {
                                        fetchedTranscript = t.map((msg: any) => `${msg.role}: ${msg.content}`).join('\n');
                                    } else {
                                        fetchedTranscript = String(t);
                                    }
                                }
                            }

                            if (fetchedTranscript && fetchedTranscript.length > 0) {
                                transcriptText = fetchedTranscript;
                                console.log(`Success! Manually fetched transcript (Length: ${transcriptText.length})`);
                                break; // Found it, exit loop
                            } else {
                                console.log('Fetched data, but transcript is still empty.');
                            }
                        } else {
                            console.error('Failed to fetch transcript manually:', await res.text());
                        }
                    } catch (e) {
                        console.error(`Error on attempt ${i + 1}:`, e);
                    }
                }
            }
        }

        // 3. DETERMINE DATA SOURCE (Parameters vs. Extraction)
        let leadData: LeadData;

        // Check if Zara sent pre-parsed parameters (The "Ideal" Path)
        if (body.parameters && Object.keys(body.parameters).length > 0) {
            console.log('✅ Using pre-parsed parameters from Zara');
            const params = body.parameters;
            leadData = {
                lead_name: params.lead_name || params.contact || 'Not Provided',
                role: params.role || 'Not Provided',
                company_name: params.company_name || params.company || 'Not Provided',
                vertical: params.vertical || 'Field Service',
                teamSize: params.teamSize || 'Not Provided',
                geography: params.geography || 'Not Provided',
                pain_points: Array.isArray(params.pain_points) ? params.pain_points : (params.pain_points || '').split('\n').filter(Boolean),
                currentSystems: params.currentSystems || 'Not Provided',
                buying_committee: Array.isArray(params.buying_committee) ? params.buying_committee : (params.buying_committee || '').split(',').filter(Boolean),
                budget_range: params.budget_range || params.budget || 'Not Provided',
                timeline: params.timeline || 'Not Provided',
                lead_email: params.lead_email || params.email || 'Not Provided',
                lead_phone: params.lead_phone || params.phone || 'Not Provided',
                salesPlan: params.salesPlan || '',
                followUpEmail: params.followUpEmail || '',
                conversationTranscript: transcriptText || params.conversationTranscript || '',
                tavusRecordingUrl: body.recording_url || ''
            };
        }
        // Fallback: Extract from Transcript using Gemini (The "Reality" Path)
        else if (transcriptText) {
            console.log('⚠️ No parameters found. Falling back to Gemini extraction...');
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

            const extractionPrompt = `
              Extract the following information from this sales conversation transcript:
              
              COMPANY INFORMATION:
              - Company name: [extract]
              - Industry: [extract]
              - Employee count: [extract or "not mentioned"]
              
              CONTACT INFORMATION:
              - Name: [extract]
              - Email: [extract or "not provided"]
              - Phone: [extract or "not provided"]
              
              QUALIFICATION:
              - Budget range: [extract or "not discussed"]
              - Timeline: [extract urgency indicators]
              - Decision maker: [extract role]
              
              PAIN POINTS:
              - Top frustrations: [list 1-3]
              
              STRATEGY GENERATION:
              - Based on the pain points, goals, and industry, write a concise 3-step "Executive Sales Plan" for how GoDeskless can help them. Focus on value and ROI.
        
              Return ONLY a JSON object with these keys: 
              company_name, industry, employee_count, contact_name, contact_email, contact_phone, 
              pain_points (array of strings), budget_range, timeline, decision_maker, sales_strategy
              
              TRANSCRIPT:
              ${transcriptText}
            `;

            const result = await model.generateContent(extractionPrompt);
            const response = await result.response;
            const text = response.text();
            const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const extracted = JSON.parse(jsonString);

            console.log('✅ Extracted Data from Gemini:', extracted);

            leadData = {
                lead_name: extracted.contact_name || 'Not Provided',
                role: 'Not Provided',
                company_name: extracted.company_name || 'Not Provided',
                vertical: extracted.industry || 'Field Service',
                teamSize: extracted.employee_count || 'Not Provided',
                geography: 'Not Provided',
                pain_points: extracted.pain_points || [],
                currentSystems: 'Not Provided',
                buying_committee: extracted.decision_maker ? [extracted.decision_maker] : [],
                budget_range: extracted.budget_range || 'Not Provided',
                timeline: extracted.timeline || 'Not Provided',
                lead_email: extracted.contact_email || 'Not Provided',
                lead_phone: extracted.contact_phone || 'Not Provided',
                salesPlan: typeof extracted.sales_strategy === 'string' ? extracted.sales_strategy : formatCellData(extracted.sales_strategy),
                followUpEmail: '',
                conversationTranscript: transcriptText,
                tavusRecordingUrl: body.recording_url || ''
            };
        } else {
            console.log('❌ No transcript and no parameters. Cannot process.');
            return NextResponse.json({ message: 'No data to process' });
        }

        console.log('✅ Final Lead Data for Processing:', leadData);

        // 4. Save to Google Sheets
        try {
            const values = [
                [
                    new Date().toISOString(), // Timestamp
                    leadData.lead_name,
                    leadData.role,
                    leadData.company_name,
                    leadData.lead_email,
                    leadData.lead_phone,
                    leadData.budget_range,
                    leadData.timeline,
                    leadData.pain_points.join(', '),
                    leadData.buying_committee.join(', '),
                    leadData.vertical,
                    leadData.teamSize,
                    leadData.geography,
                    leadData.currentSystems,
                    leadData.salesPlan,
                    leadData.tavusRecordingUrl
                ]
            ];

            await sheets.spreadsheets.values.append({
                spreadsheetId: process.env.GOOGLE_SHEET_ID,
                range: 'Sheet1!A:Q',
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: values,
                },
            });
            console.log('Successfully added row to Google Sheets');
        } catch (sheetError: any) {
            console.error('Error appending to Google Sheet:', sheetError.message);
        }

        // 5. Create Gmail Draft
        try {
            console.log('Initiating Gmail draft creation...');
            const gmailService = new GmailDraftService();
            const draftResult = await gmailService.createDraft(leadData);

            if (!draftResult.success) {
                console.error('Draft creation failed, sending error notification...');
                await gmailService.sendErrorNotification(draftResult.error || 'Unknown error');
            } else {
                console.log('Gmail draft created successfully:', draftResult.draftId || draftResult.messageId);
            }
        } catch (gmailError: any) {
            console.error('Critical error in Gmail draft process:', gmailError);
            try {
                const gmailService = new GmailDraftService();
                await gmailService.sendErrorNotification(gmailError.message);
            } catch (e) {
                console.error('Failed to send error notification:', e);
            }
        }

        return NextResponse.json({ message: 'Webhook processed successfully' });

    } catch (error: any) {
        console.error('Error processing webhook:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}

// Helper to flatten Tavus Objectives
function extractObjectivesData(objectives: any[]) {
    const data: any = {};
    if (!objectives || !Array.isArray(objectives)) return data;
    objectives.forEach(obj => {
        if (obj.output_variables) {
            Object.assign(data, obj.output_variables);
        }
    });
    return data;
}

// v18.8 Native Handler
async function handleNativeMorgan(body: any) {
    console.log('🏗️ v18.8 Native Handler Triggered');

    const objectives = body.objectives_completed || [];
    const structuredData = extractObjectivesData(objectives);
    const transcriptText = body.transcript || 'No transcript available';

    console.log('✅ Structured Data from Objectives:', JSON.stringify(structuredData, null, 2));

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const analysisPrompt = `
      You are analyzing a goDeskless sales qualification call (Morgan v18.8).
      
      STRUCTURED DATA FROM TAVUS OBJECTIVES:
      ${JSON.stringify(structuredData, null, 2)}
      
      FULL TRANSCRIPT (Context):
      ${transcriptText}
      
      TASK: Generate a JSON object for the sales team.
      Use STRUCTURED DATA as primary source. Use TRANSCRIPT to fill gaps.
      
      REQUIRED JSON OUTPUT:
      {
        "company_name": "String",
        "industry": "String",
        "employee_count": "String",
        "contact_name": "String",
        "contact_email": "String",
        "contact_phone": "String",
        "pain_points": ["String"],
        "budget_range": "String",
        "timeline": "String",
        "decision_maker": "String",
        "sales_strategy": "String (3-step plan)"
      }
    `;

    let extracted: any = {};
    try {
        const result = await model.generateContent(analysisPrompt);
        const response = await result.response;
        const text = response.text();
        const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
        extracted = JSON.parse(jsonString);
        console.log('✅ Gemini Analysis Complete');
    } catch (e: any) {
        console.error('Gemini Analysis Failed:', e);
        extracted = structuredData;
    }

    const leadData: LeadData = {
        lead_name: extracted.contact_name || structuredData.contact_name || 'Not Provided',
        role: extracted.role || 'Not Provided',
        company_name: extracted.company_name || structuredData.company_name || 'Not Provided',
        vertical: extracted.industry || structuredData.vertical || 'Field Service',
        teamSize: extracted.employee_count || structuredData.team_size_total || 'Not Provided',
        geography: structuredData.geography || 'Not Provided',
        pain_points: extracted.pain_points || [],
        currentSystems: structuredData.current_systems || 'Not Provided',
        buying_committee: extracted.decision_maker ? [extracted.decision_maker] : [],
        budget_range: extracted.budget_range || structuredData.budget_range || 'Not Provided',
        timeline: extracted.timeline || structuredData.timeline || 'Not Provided',
        lead_email: extracted.contact_email || structuredData.email || 'Not Provided',
        lead_phone: extracted.contact_phone || structuredData.phone || 'Not Provided',
        salesPlan: extracted.sales_strategy || 'Review transcript for details.',
        followUpEmail: '',
        conversationTranscript: transcriptText,
        tavusRecordingUrl: body.recording_url || ''
    };

    // Save to Sheets
    try {
        const values = [[
            new Date().toISOString(),
            leadData.lead_name, leadData.role, leadData.company_name,
            leadData.lead_email, leadData.lead_phone, leadData.budget_range,
            leadData.timeline, leadData.pain_points.join(', '),
            leadData.buying_committee.join(', '), leadData.vertical,
            leadData.teamSize, leadData.geography, leadData.currentSystems,
            leadData.salesPlan, leadData.tavusRecordingUrl
        ]];
        await sheets.spreadsheets.values.append({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: 'Sheet1!A:Q',
            valueInputOption: 'USER_ENTERED',
            requestBody: { values },
        });
        console.log('✅ v18.8: Saved to Sheets');
    } catch (e: any) {
        console.error('v18.8 Sheets Error:', e.message);
    }

    // Create Draft
    try {
        const gmailService = new GmailDraftService();
        const draftResult = await gmailService.createDraft(leadData);
        if (draftResult.success) {
            console.log('✅ v18.8: Draft Created:', draftResult.draftId);
        } else {
            console.error('v18.8 Draft Error:', draftResult.error);
        }
    } catch (e: any) {
        console.error('v18.8 Gmail Service Error:', e.message);
    }

    return NextResponse.json({
        message: 'v18.8 Native Handler Processed Successfully',
        lead_data: leadData
    });
}
