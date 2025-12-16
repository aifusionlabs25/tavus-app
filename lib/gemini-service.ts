
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
                temperature: 0.1, // NOVA FIX: Low temperature to prevent hallucination loops
                maxOutputTokens: 1000,
                responseSchema: {
                    type: SchemaType.OBJECT,
                    properties: {
                        lead_name: { type: SchemaType.STRING, nullable: true },
                        role: { type: SchemaType.STRING, nullable: true },
                        company_name: { type: SchemaType.STRING, nullable: true },
                        vertical: { type: SchemaType.STRING, nullable: true },
                        teamSize: { type: SchemaType.STRING, nullable: true },
                        geography: { type: SchemaType.STRING, nullable: true },
                        pain_points: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, nullable: true },
                        currentSystems: { type: SchemaType.STRING, nullable: true },
                        buying_committee: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, nullable: true },
                        budget_range: { type: SchemaType.STRING, nullable: true },
                        timeline: { type: SchemaType.STRING, nullable: true },
                        lead_email: { type: SchemaType.STRING, nullable: true },
                        lead_phone: { type: SchemaType.STRING, nullable: true },
                        salesPlan: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, nullable: true }
                    }
                }
            }
        });
    }

    async analyzeTranscript(transcript: string): Promise<LeadData | null> {
        if (!transcript) return null;

        const prompt = `
        You are a Senior Sales Operations Analyst. Analyze the following sales conversation transcript between 'Morgan' (AI SDR) and a prospect.
        
        Extract the following data strictly as JSON. 
        If a field is not found, use null or "Not mentioned".
        IMPORTANT: Keep all string values concise (under 20 words). Do not repeat text.
        
        Transcript:
        "${transcript}"

        JSON Schema:
        {
            "lead_name": "Name of the prospect",
            "role": "Job title or role",
            "company_name": "Company name",
            "vertical": "Industry (e.g. Plumbing, HVAC)",
            "teamSize": "Number of technicians/staff",
            "geography": "Location",
            "pain_points": ["List of specific pain points"],
            "currentSystems": "Current software (ServiceTitan, Housecall Pro, Paper, Excel, etc)",
            "buying_committee": ["Names/Roles of decision makers"],
            "budget_range": "Mentioned budget or 'Not discussed'",
            "timeline": "Implementation timeline (e.g. ASAP, Next Month)",
            "lead_email": "Email if provided",
            "lead_phone": "Phone if provided",
            "salesPlan": "3 bullet points on next steps for sales team"
        }
        `;

        try {
            console.log('⚡ Gemini Analysis Started...');
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Clean up markdown code blocks if present
            const jsonStr = text.replace(/```json\n|\n```/g, '').replace(/```/g, '').trim();

            console.log('[GeminiService] 🔍 RAW JSON OUTPUT:', jsonStr.substring(0, 500) + '...'); // Log first 500 chars

            const data = JSON.parse(jsonStr) as LeadData;
            console.log('⚡ Gemini Analysis Complete. Company:', data.company_name, 'Lead:', data.lead_name);
            return data;
        } catch (error) {
            console.error('❌ Gemini Analysis Failed:', error);
            return null;
        }
    }
}
