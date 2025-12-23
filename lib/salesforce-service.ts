/**
 * Salesforce Service - Client Credentials OAuth Flow
 * Creates Leads in Salesforce from Morgan conversation data
 * 
 * Required Environment Variables:
 * - SF_CLIENT_ID: Salesforce Consumer Key
 * - SF_CLIENT_SECRET: Salesforce Consumer Secret  
 * - SF_LOGIN_URL: Salesforce org login URL (optional, defaults to production)
 */

// Salesforce Configuration (AI_Agent_Integration External Client App)
const SF_CONFIG = {
    CLIENT_ID: process.env.SF_CLIENT_ID || '',
    CLIENT_SECRET: process.env.SF_CLIENT_SECRET || '',
    LOGIN_URL: process.env.SF_LOGIN_URL || 'https://login.salesforce.com',
};

// Token cache to avoid re-authenticating on every request
let cachedToken: { accessToken: string; instanceUrl: string; expiresAt: number } | null = null;

export interface LeadData {
    lead_name?: string;
    lead_email?: string;
    lead_phone?: string;
    company_name?: string;
    role?: string;
    vertical?: string;
    teamSize?: string;
    geography?: string;
    budget_range?: string;
    timeline?: string;
    pain_points?: string[] | string;
    currentSystems?: string;
    salesPlan?: string[] | string;
}

export class SalesforceService {

    /**
     * Authenticate using Client Credentials Flow
     * Returns access token and instance URL
     */
    async authenticate(): Promise<{ accessToken: string; instanceUrl: string }> {
        // Return cached token if still valid (with 5 min buffer)
        if (cachedToken && Date.now() < cachedToken.expiresAt - 300000) {
            return { accessToken: cachedToken.accessToken, instanceUrl: cachedToken.instanceUrl };
        }

        const tokenUrl = `${SF_CONFIG.LOGIN_URL}/services/oauth2/token`;

        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: SF_CONFIG.CLIENT_ID,
                client_secret: SF_CONFIG.CLIENT_SECRET,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Salesforce auth failed: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        // Cache the token (Salesforce tokens typically last 2 hours)
        cachedToken = {
            accessToken: data.access_token,
            instanceUrl: data.instance_url,
            expiresAt: Date.now() + (data.expires_in ? data.expires_in * 1000 : 7200000),
        };

        console.log('[SalesforceService] ✅ Authenticated successfully');
        return { accessToken: cachedToken.accessToken, instanceUrl: cachedToken.instanceUrl };
    }

    /**
     * Create a Lead in Salesforce from Morgan conversation data
     * Returns the new Lead ID
     */
    async createLead(leadData: LeadData): Promise<string> {
        const { accessToken, instanceUrl } = await this.authenticate();

        // Parse lead name into first/last
        const nameParts = (leadData.lead_name || 'Unknown Lead').split(' ');
        const firstName = nameParts[0] || 'Unknown';
        const lastName = nameParts.slice(1).join(' ') || 'Lead';

        // Build Lead record
        const leadRecord = {
            FirstName: firstName,
            LastName: lastName,
            Email: leadData.lead_email || null,
            Phone: leadData.lead_phone || null,
            Company: leadData.company_name || 'Unknown Company',
            Title: leadData.role || null,
            Industry: leadData.vertical || 'Field Service',
            NumberOfEmployees: this.parseTeamSize(leadData.teamSize),
            City: leadData.geography || null,
            LeadSource: 'Morgan AI Agent',
            Description: this.buildDescription(leadData),
        };

        const response = await fetch(`${instanceUrl}/services/data/v60.0/sobjects/Lead`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(leadRecord),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Salesforce Lead creation failed: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log('[SalesforceService] ✅ Lead created:', result.id);
        return result.id;
    }

    /**
     * Parse team size string to number (Salesforce expects integer)
     */
    private parseTeamSize(teamSize?: string): number | null {
        if (!teamSize) return null;
        const match = teamSize.match(/\d+/);
        return match ? parseInt(match[0], 10) : null;
    }

    /**
     * Build description field from lead data
     */
    private buildDescription(leadData: LeadData): string {
        const parts: string[] = [];

        if (leadData.budget_range) parts.push(`Budget: ${leadData.budget_range}`);
        if (leadData.timeline) parts.push(`Timeline: ${leadData.timeline}`);
        if (leadData.currentSystems) parts.push(`Current Systems: ${leadData.currentSystems}`);

        if (leadData.pain_points) {
            const pains = Array.isArray(leadData.pain_points)
                ? leadData.pain_points.join(', ')
                : leadData.pain_points;
            parts.push(`Pain Points: ${pains}`);
        }

        if (leadData.salesPlan) {
            const plan = Array.isArray(leadData.salesPlan)
                ? leadData.salesPlan.join('\n')
                : leadData.salesPlan;
            parts.push(`\nSales Plan:\n${plan}`);
        }

        return parts.join('\n') || 'Lead captured from Morgan AI conversation.';
    }
}
