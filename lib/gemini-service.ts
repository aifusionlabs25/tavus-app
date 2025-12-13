
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

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
        // Using 'gemini-1.5-flash' for speed and cost efficiency ( Free tier eligible)
        this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    }

    async analyzeTranscript(transcript: string): Promise<LeadData | null> {
        if (!transcript) return null;

        const prompt = `
        You are a Senior Sales Operations Analyst. Analyze the following sales conversation transcript between 'Morgan' (AI SDR) and a prospect.
        
        Extract the following data strictly as JSON. 
        If a field is not found, use null or "Not mentioned".
        
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

            const data = JSON.parse(jsonStr) as LeadData;
            console.log('⚡ Gemini Analysis Complete:', data.company_name);
            return data;
        } catch (error) {
            console.error('❌ Gemini Analysis Failed:', error);
            return null;
        }
    }
}
