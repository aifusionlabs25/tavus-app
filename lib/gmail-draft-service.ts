import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import { Readable } from 'stream';

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
    lead_email: string; // Restored
    lead_phone: string;
    salesPlan: string;
    followUpEmail: string;
    conversationTranscript?: string;
    tavusRecordingUrl?: string;
}

export class GmailDraftService {
    private oauth2Client;
    private gmail;

    constructor() {
        const clientId = process.env.GMAIL_CLIENT_ID?.trim();
        const clientSecret = process.env.GMAIL_CLIENT_SECRET?.trim();
        const refreshToken = process.env.GMAIL_REFRESH_TOKEN?.trim();

        if (!clientId || !clientSecret || !refreshToken) {
            console.warn('⚠️ Gmail API credentials missing. Draft creation will fail.');
        }

        this.oauth2Client = new google.auth.OAuth2(
            clientId,
            clientSecret,
            'http://localhost:3000'
        );

        this.oauth2Client.setCredentials({
            refresh_token: refreshToken,
        });

        this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
    }

    /**
     * Determine recipient email based on environment
     */
    private getRecipientEmail(): string {
        return process.env.ENVIRONMENT === 'production'
            ? process.env.PROD_EMAIL_RECIPIENTS || 'steve.holton@godeskless.com,dan.zemaitis@goDeskless.com'
            : process.env.DEV_EMAIL_RECIPIENT || 'aifusionlabs@gmail.com';
    }

    /**
     * Generate email body from lead data
     */
    private generateEmailBody(leadData: LeadData, leadScore: number, badges: string[]): string {
        // Safe join for badges
        const badgeHTML = (Array.isArray(badges) ? badges : [])
            .map(badge => `<span class="badge">${badge}</span>`)
            .join('\n                ');

        // Read v3.0 HTML template
        const templatePath = path.join(process.cwd(), 'templates/Email_Template_v3_Clean_Executive.html');
        let htmlTemplate = '';

        try {
            htmlTemplate = fs.readFileSync(templatePath, 'utf-8');
        } catch (e) {
            console.error('Template not found, using fallback.');
            return `Error: Template not found at ${templatePath}`;
        }

        const safePainPoints = Array.isArray(leadData.pain_points) ? leadData.pain_points : [];
        const safeCommittee = Array.isArray(leadData.buying_committee) ? leadData.buying_committee : [];

        // Replace dynamic placeholders
        htmlTemplate = htmlTemplate
            .replace(/{{lead_score}}/g, leadScore.toString())
            .replace(/{{badges}}/g, badgeHTML)
            .replace(/{{contact_name}}/g, leadData.lead_name || 'Not provided')
            .replace(/{{contact_role}}/g, leadData.role || 'Not provided')
            .replace(/{{company_name}}/g, leadData.company_name || 'Not provided')
            .replace(/{{industry}}/g, leadData.vertical || 'Not provided')
            .replace(/{{team_size}}/g, leadData.teamSize || 'Not provided')
            .replace(/{{location}}/g, leadData.geography || 'Not provided')
            .replace(/{{email}}/g, leadData.lead_email || 'Not provided')
            .replace(/{{phone}}/g, leadData.lead_phone || 'Not provided')
            .replace(/{{pain_point_1}}/g, extractPainPoint(safePainPoints, 0))
            .replace(/{{pain_point_2}}/g, extractPainPoint(safePainPoints, 1))
            .replace(/{{pain_point_3}}/g, extractPainPoint(safePainPoints, 2))
            .replace(/{{budget}}/g, leadData.budget_range || 'Not discussed')
            .replace(/{{timeline}}/g, leadData.timeline || 'Not discussed')
            .replace(/{{decision_maker}}/g, extractDecisionMaker(safeCommittee))
            .replace(/{{buying_committee}}/g, safeCommittee.join(', ') || 'Not mentioned')
            .replace(/{{sales_strategy}}/g, formatSalesStrategy(leadData.salesPlan))
            .replace(/{{demo_focus_areas}}/g, generateDemoFocusAreas(leadData))
            .replace(/{{current_systems}}/g, leadData.currentSystems || 'Not mentioned');

        return htmlTemplate;
    }

    /**
     * Create Gmail draft OR Send Email based on environment
     */
    async createDraft(leadData: LeadData, maxRetries = 3): Promise<{ success: boolean; draftId?: string; messageId?: string; error?: string }> {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                // Calculate lead score
                const leadScore = calculateLeadViabilityScore(leadData);

                // Generate badges
                const badges = generateViabilityBadges(leadData);

                const recipientEmail = this.getRecipientEmail();
                const subject = generateSubjectLine(leadData, process.env.ENVIRONMENT || 'development');

                const emailBody = this.generateEmailBody(leadData, leadScore, badges);

                // Use nodemailer to generate the raw RFC 2822 email string
                // streamTransport: true makes it return the raw message instead of sending
                const mailGenerator = nodemailer.createTransport({
                    streamTransport: true,
                    newline: 'windows' // Force CRLF for RFC compliance
                });

                const info = await mailGenerator.sendMail({
                    to: recipientEmail,
                    subject: subject,
                    html: emailBody,
                    text: 'This email requires an HTML-enabled client.', // Fallback
                });

                // Read stream to buffer
                const rawEmail = await new Promise<Buffer>((resolve, reject) => {
                    const stream = info.message as Readable;
                    const chunks: Buffer[] = [];
                    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
                    stream.on('error', (err) => reject(err));
                    stream.on('end', () => resolve(Buffer.concat(chunks)));
                });

                const encodedMessage = rawEmail.toString('base64')
                    .replace(/\+/g, '-')
                    .replace(/\//g, '_')
                    .replace(/=+$/, '');

                // DEBUG: Log environment decision
                const env = (process.env.ENVIRONMENT || 'development').trim();
                console.log(`🔍 ENVIRONMENT CHECK: '${env}'`);

                // DEVELOPMENT: Send immediately for testing
                if (env === 'development') {
                    console.log('🚀 Mode: DEVELOPMENT (Sending Email)');
                    const response = await this.gmail.users.messages.send({
                        userId: 'me',
                        requestBody: {
                            raw: encodedMessage,
                        },
                    });
                    console.log(`🚀 Email SENT successfully (Dev Mode) - Message ID: ${response.data.id}`);
                    return { success: true, messageId: response.data.id! };
                }

                // PRODUCTION: Create draft for review
                else {
                    console.log('📝 Mode: PRODUCTION (Creating Draft)');
                    const response = await this.gmail.users.drafts.create({
                        userId: 'me',
                        requestBody: {
                            message: {
                                raw: encodedMessage,
                            },
                        },
                    });
                    console.log(`📝 Draft created successfully (Prod Mode) - Draft ID: ${response.data.id}`);
                    return { success: true, draftId: response.data.id! };
                }

            } catch (error: any) {
                console.error(`❌ Email/Draft operation attempt ${attempt}/${maxRetries} failed:`, error.message);

                if (attempt === maxRetries) {
                    // Final failure - return error
                    return {
                        success: false,
                        error: error.message,
                    };
                }

                // Exponential backoff: 1s, 2s, 4s
                const delayMs = Math.pow(2, attempt - 1) * 1000;
                console.log(`⏳ Retrying in ${delayMs}ms...`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }

        return { success: false, error: 'Unknown error' };
    }

    /**
     * Send error notification email (if draft creation fails)
     */
    async sendErrorNotification(error: string): Promise<void> {
        try {
            const email = [
                `To: aifusionlabs@gmail.com`,
                `Subject: [ERROR] Morgan Gmail Draft Failed`,
                'MIME-Version: 1.0',
                'Content-Type: text/plain; charset=utf-8',
                '',
                `⚠️ ALERT: Gmail draft creation failed\n\nError: ${error}\n\nTimestamp: ${new Date().toISOString()}`,
            ].join('\n');

            const encodedMessage = Buffer.from(email)
                .toString('base64')
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');

            await this.gmail.users.messages.send({
                userId: 'me',
                requestBody: {
                    raw: encodedMessage,
                },
            });

            console.log('✅ Error notification sent to Rob');
        } catch (emailError) {
            console.error('❌ Failed to send error notification:', emailError);
        }
    }
}

// Helper Functions

function calculateLeadViabilityScore(leadData: LeadData): number {
    let score = 0;

    // Budget confirmed (30 points)
    if (leadData.budget_range &&
        leadData.budget_range.toLowerCase() !== 'not discussed' &&
        leadData.budget_range.toLowerCase() !== 'not provided') {
        score += 30;
    }

    // Timeline urgent - less than 2 weeks (25 points)
    if (leadData.timeline) {
        const timeline = leadData.timeline.toLowerCase();
        if (timeline.includes('this week') ||
            timeline.includes('next week') ||
            timeline.includes('asap') ||
            timeline.includes('urgent') ||
            timeline.includes('immediate')) {
            score += 25;
        } else if (timeline.includes('month') ||
            timeline.includes('weeks') ||
            timeline !== 'not discussed') {
            score += 15; // Partial points for defined timeline
        }
    }

    // Decision maker identified (20 points)
    if (leadData.buying_committee && leadData.buying_committee.length > 0) {
        score += 20;
    }

    // Clear pain points - 3 or more (15 points)
    if (leadData.pain_points && leadData.pain_points.length >= 3) {
        score += 15;
    } else if (leadData.pain_points && leadData.pain_points.length >= 1) {
        score += 8;
    }

    // Buying committee size - 3 or more members (10 points)
    if (leadData.buying_committee && leadData.buying_committee.length >= 3) {
        score += 10;
    } else if (leadData.buying_committee && leadData.buying_committee.length >= 1) {
        score += 5;
    }

    return Math.min(score, 100); // Cap at 100
}

function generateViabilityBadges(leadData: LeadData): string[] {
    const badges: string[] = [];

    // Budget Confirmed
    if (leadData.budget_range &&
        leadData.budget_range.toLowerCase() !== 'not discussed' &&
        leadData.budget_range.toLowerCase() !== 'not provided') {
        badges.push('✓ Budget Confirmed');
    }

    // High Urgency
    if (leadData.timeline) {
        const timeline = leadData.timeline.toLowerCase();
        if (timeline.includes('this week') ||
            timeline.includes('next week') ||
            timeline.includes('asap') ||
            timeline.includes('urgent')) {
            badges.push('✓ High Urgency');
        }
    }

    // Decision Maker Access
    if (leadData.buying_committee && leadData.buying_committee.length > 0) {
        badges.push('✓ Decision Maker Access');
    }

    // Clear Pain Points
    if (leadData.pain_points && leadData.pain_points.length >= 3) {
        badges.push('✓ Clear Pain Points');
    }

    return badges;
}

function extractPainPoint(painPoints: string[], index: number): string {
    if (!painPoints || painPoints.length === 0) return 'Not mentioned';
    return painPoints[index] || '';
}

function extractDecisionMaker(buyingCommittee: string[]): string {
    if (!buyingCommittee || buyingCommittee.length === 0) return 'Not identified';
    // Assuming the first item is the primary contact/decision maker
    return buyingCommittee[0];
}

function generateDemoFocusAreas(leadData: LeadData): string {
    const focusAreas = [
        'Focus on DISPATCHER VIEW and complete workflow',
        'Show real-time tech communication preventing missed appointments',
        'Demonstrate QuickBooks integration to eliminate manual data entry',
        `CLARIFY PRICING: ${leadData.budget_range || '$4-5K/month'} total`
    ];

    return focusAreas.map((area) =>
        `<li>${area}</li>`
    ).join('\n                ');
}

function generateSubjectLine(leadData: LeadData, environment: string): string {
    // Sanitize function to remove newlines and extra spaces
    const sanitize = (str: any) => {
        if (!str) return '';
        if (typeof str !== 'string') return String(str);
        return str.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    };
    const truncate = (str: any, len: number) => {
        const s = sanitize(str);
        return s.length > len ? s.substring(0, len) + '...' : s;
    };

    const contactName = sanitize(leadData.lead_name || 'Unknown Contact');
    const companyName = sanitize(leadData.company_name || 'Unknown Company');
    const teamSize = truncate(leadData.teamSize || 'Unknown Size', 20);
    const budget = truncate(leadData.budget_range || 'Budget TBD', 20);

    const mainPain = leadData.pain_points && leadData.pain_points.length > 0
        ? truncate(sanitize(leadData.pain_points[0]), 40)
        : 'Multiple Pain Points';

    if (environment === 'development') {
        return `🟡 TEST LEAD: ${contactName} from ${companyName} - ${sanitize(leadData.vertical || 'Field Service')}`;
    }

    return `🔥 Hot Lead: ${contactName} - ${companyName} (${teamSize}, ${budget}, ${mainPain})`;
}

function formatSalesStrategy(strategy: string | string[]): string {
    if (!strategy) return '<li>Strategy not generated</li>';

    // Handle Array directly (e.g. from Gemini JSON)
    if (Array.isArray(strategy)) {
        return strategy.map(line => `<li>${line}</li>`).join('\n');
    }

    // Handle String
    if (typeof strategy !== 'string') return '<li>Invalid Strategy Format</li>';

    // Clean up JSON-like artifacts
    let cleanStrategy = strategy.trim();
    if (cleanStrategy.startsWith('[') && cleanStrategy.endsWith(']')) {
        cleanStrategy = cleanStrategy.substring(1, cleanStrategy.length - 1);
    }

    // Split by comma if it was a JSON array, or newline if it was a list
    // Handle "item 1", "item 2" format
    const items = cleanStrategy.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/) // Split by comma outside quotes
        .map(item => item.trim().replace(/^"|"$/g, '').replace(/\\"/g, '"').trim()) // Remove quotes
        .filter(item => item.length > 0);

    if (items.length > 0) {
        return items.map(line => `<li>${line}</li>`).join('\n');
    }

    // Fallback to newline splitting
    return strategy.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && line !== '[' && line !== ']')
        .map(line => `<li>${line}</li>`)
        .join('\n');
}
