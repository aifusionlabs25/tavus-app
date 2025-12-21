
import { GoogleGenerativeAI, GenerativeModel, SchemaType } from '@google/generative-ai';
import { CONFIG } from './config';

// Interface matching the format we need for GmailDraftService
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
}

export class GeminiService {
    private genAI: GoogleGenerativeAI;
    private model: GenerativeModel;

    constructor() {
        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            console.warn('⚠️ GOOGLE_API_KEY missing. Gemini analysis will fail.');
        }

        this.genAI = new GoogleGenerativeAI(apiKey || '');
        // Using centralized config for model validation and easy upgrades
        console.log(`[GeminiService] Initializing with model: ${CONFIG.GEMINI.MODEL}`);
        // NOVA HARDENING: JSON output mode for deterministic parsing
        this.model = this.genAI.getGenerativeModel({
            model: CONFIG.GEMINI.MODEL,
            generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.0, // NOVA FIX: Zero temperature for maximum determinism
                maxOutputTokens: 1000
            }
        });
    }

    async analyzeTranscript(transcript: string): Promise<LeadData | null> {
        if (!transcript) return null;

        const prompt = `
        You are a Senior Sales Operations Analyst. Your job is to extract lead qualification data from a conversation transcript.
        
        Analyze the transcript below and extract the key information into a JSON object.
        
        GUIDELINES:
        - Be concise but accurate.
        - If a value is not explicitly mentioned, return null.
        - Do not hallucinate or guess.
        - Convert spoken email addresses to standard format (e.g. "john at gmail dot com" -> "john@gmail.com").
        - **followUpEmail**: Write a short, warm, professional follow-up email body (HTML text, paragraphs <p> and <br> only, NO <html> tags, NO Subject line). 
          - Address the lead by name.
          - Reference 1-2 specific pain points they mentioned to show you listened.
          - Propose the next step (Demo or Call).
          - Key Tone: Helpful, not pushy.
        
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
            "followUpEmail": "<p>Hi Tom,</p><p>Great connecting just now. You mentioned that scheduling chaos is costing you jobs—that's exactly what we fix.</p><p>Let's get that demo set up.</p>"
        }

        Transcript:
        "${transcript}"
        `;

        try {
            console.log('⚡ Gemini Analysis Started...');
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Clean up markdown code blocks if present
            const jsonStr = text.replace(/```json\n|\n```/g, '').replace(/```/g, '').trim();

            console.log('[GeminiService] 🔍 RAW JSON OUTPUT:', jsonStr.substring(0, 500) + '...');

            const data = JSON.parse(jsonStr) as LeadData;
            console.log('⚡ Gemini Analysis Complete. Keys found:', Object.keys(data).join(', '));
            console.log('⚡ Data Sample - Company:', data.company_name, 'Lead:', data.lead_name);
            return data;
        } catch (error: any) {
            console.error('❌ Gemini Analysis Failed:', error.message);

            // NOVA FALLBACK: If 2.0 Flash is rate limited (429), try 1.5 Flash
            if (error.status === 429 || (error.message && error.message.includes('429'))) {
                console.warn('⚠️ Gemini 2.0 Rate Limit Hit. Attempting FALLBACK to gemini-1.5-flash-latest...');
                try {
                    const fallbackModel = this.genAI.getGenerativeModel({
                        model: 'gemini-1.5-flash-latest',
                        generationConfig: { responseMimeType: "application/json", temperature: 0.2 }
                    });

                    const result = await fallbackModel.generateContent(prompt);
                    const response = await result.response;
                    const text = response.text();

                    const jsonStr = text.replace(/```json\n|\n```/g, '').replace(/```/g, '').trim();
                    console.log('[GeminiService] 🔄 FALLBACK SUCCESS. RAW JSON:', jsonStr.substring(0, 50) + '...');
                    return JSON.parse(jsonStr) as LeadData;

                } catch (fallbackError: any) {
                    console.error('❌ Fallback Model Also Failed:', fallbackError.message);
                }
            }

            return null;
        }
    }
}
