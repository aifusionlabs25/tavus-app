import OpenAI from 'openai';
import { CONFIG } from './config';

// Interface matching the format used in Email Service
export interface LeadData {
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
    morgan_action: string;
    team_action: string;
}

export class OpenAIService {
    private openai: OpenAI;

    constructor() {
        // Warning: process.env.OPENAI_API_KEY must be set in Vercel
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            console.warn('⚠️ OPENAI_API_KEY missing. Analysis will fail.');
        }

        this.openai = new OpenAI({
            apiKey: apiKey,
        });

        console.log(`[OpenAIService] Initializing with model: ${CONFIG.OPENAI.MODEL}`);
    }

    async analyzeTranscript(transcript: string): Promise<LeadData | null> {
        if (!transcript) return null;

        const systemPrompt = `
        You are a Senior Sales Operations Analyst. Your job is to extract lead qualification data from a conversation transcript.
        
        Analyze the transcript below and extract the key information into a JSON object.
        
        GUIDELINES:
        - Be concise but accurate.
        - If a value is not explicitly mentioned, return null (or "Unknown" to be safe).
        - Do not hallucinate or guess.
        - Convert spoken email addresses to standard format (e.g. "john at gmail dot com" -> "john@gmail.com").
        - **followUpEmail**: Write a short, warm, professional follow-up email body (HTML text, paragraphs <p> and <br> only, NO <html> tags, NO Subject line). 
          - Address the lead by name.
          - Reference 1-2 specific pain points they mentioned.
          - CRITICAL: If you mention that you are sending a summary (e.g. "I've sent a summary..."), you MUST actually include that summary as a bulleted list <ul><li>...</li></ul> in the email body.
          - Propose the next step (Demo or Call).
          - Key Tone: Helpful, not pushy.
        - **morgan_action**: Briefly describe what Morgan (the AI) did or promised in the call (e.g. "Explained dispatch features, promised summary email").
        - **team_action**: Briefly describe what the Human Sales Team needs to do next (e.g. "Call to schedule deep-dive demo", "Verify budget").
        
        EXAMPLE OUTPUT FORMAT:
        {
            "lead_name": "Tom Smith",
            "role": "Owner",
            "company_name": "Tom's Plumbing",
            "vertical": "Plumbing",
            "teamSize": "20 techs",
            "geography": "Phoenix, AZ",
            "pain_points": ["Missed calls", "Scheduling chaos"],
            "currentSystems": "Excel, Pen and Paper",
            "buying_committee": ["Tom (Owner)", "Sarah (Office Manager)"],
            "budget_range": "Not discussed",
            "timeline": "ASAP",
            "lead_email": "tom@example.com",
            "lead_phone": "555-0100",
            "salesPlan": ["Demo dispatch feature", "Highlight mobile app"],
            "morgan_action": "Explained mobile capabilities and promised to send usage summary",
            "team_action": "Schedule follow-up demo to show dispatch dashboard",
            "followUpEmail": "<p>Hi Tom,</p><p>Great connecting just now. You mentioned that scheduling chaos is costing you jobs—that's exactly what we fix.</p><p>As discussed, here is how we help:</p><ul><li>Automated Dispatching</li><li>Real-time tech tracking</li></ul><p>Let's get that demo set up.</p>"
        }
        `;

        try {
            console.log('⚡ OpenAI Analysis Started...');

            const completion = await this.openai.chat.completions.create({
                model: CONFIG.OPENAI.MODEL,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `Transcript:\n"${transcript}"` }
                ],
                response_format: { type: "json_object" }, // Ensures valid JSON
                temperature: 0.1, // Low temp for determinism
            });

            const content = completion.choices[0].message.content;
            if (!content) {
                throw new Error("Empty response from OpenAI");
            }

            console.log('[OpenAIService] 🔍 RAW JSON OUTPUT:', content.substring(0, 100) + '...');

            const data = JSON.parse(content) as LeadData;
            console.log('⚡ OpenAI Analysis Complete. Keys found:', Object.keys(data).join(', '));
            console.log('⚡ Data Sample - Company:', data.company_name, 'Lead:', data.lead_name);
            return data;

        } catch (error: any) {
            console.error('❌ OpenAI Analysis Failed:', error.message);

            // Re-use the STATIC FALLBACK logic as ultimate safety net
            console.warn('⚠️ OpenAI Analysis failed. Using STATIC FALLBACK to ensure demo continuity.');
            return {
                lead_name: "there",
                role: "Leader",
                company_name: "your company",
                vertical: "Field Operations",
                teamSize: "Unknown",
                geography: "Unknown",
                pain_points: ["Efficiency", "Scaling"],
                currentSystems: "Manual Process",
                buying_committee: [],
                budget_range: "Unknown",
                timeline: "Immediate",
                lead_email: "aifusionlabs@gmail.com",
                lead_phone: "",
                salesPlan: "Schedule follow-up",
                morgan_action: "Attempted to capture lead details",
                team_action: "Follow up manually to verify information",
                followUpEmail: "<p>Hi there,</p><p>Thanks for chatting with me. I know we covered a lot regarding your field operations.</p><p>I'd love to continue the conversation and show you how we can solve those efficiency challenges.</p><p>Best,<br>Morgan</p>"
            };
        }
    }
}
