import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Lazy initialize Resend to avoid build-time errors
let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
    if (!resendClient && process.env.RESEND_API_KEY) {
        resendClient = new Resend(process.env.RESEND_API_KEY);
    }
    return resendClient;
}

export async function POST(request: Request) {
    try {
        const { name, email, phone, company, companyName, message } = await request.json();

        // Validate required fields
        if (!name || !email) {
            return NextResponse.json(
                { error: 'Name and email are required' },
                { status: 400 }
            );
        }

        // Log for debugging
        console.log('📧 New Lead Captured:');
        console.log('  Name:', name);
        console.log('  Email:', email);
        console.log('  Phone:', phone || 'Not provided');
        console.log('  Company:', company || 'Not provided');
        console.log('  Role:', companyName || 'Not provided');
        console.log('  Message:', message || 'No message');

        // Build email HTML content
        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10B981, #14B8A6); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
        .field { margin-bottom: 15px; }
        .label { font-weight: bold; color: #374151; }
        .value { color: #1f2937; }
        .footer { background: #1f2937; color: #9ca3af; padding: 15px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2 style="margin: 0;">🚀 New Lead from Morgan AI Demo</h2>
        </div>
        <div class="content">
            <div class="field">
                <span class="label">Name:</span>
                <span class="value">${name}</span>
            </div>
            <div class="field">
                <span class="label">Email:</span>
                <span class="value"><a href="mailto:${email}">${email}</a></span>
            </div>
            <div class="field">
                <span class="label">Phone:</span>
                <span class="value">${phone || 'Not provided'}</span>
            </div>
            <div class="field">
                <span class="label">Company:</span>
                <span class="value">${company || 'Not provided'}</span>
            </div>
            <div class="field">
                <span class="label">Role:</span>
                <span class="value">${companyName || 'Not provided'}</span>
            </div>
            <div class="field">
                <span class="label">Message:</span>
                <p class="value" style="margin: 5px 0 0 0; padding: 10px; background: white; border-radius: 4px;">${message || 'No message provided'}</p>
            </div>
        </div>
        <div class="footer">
            Submitted via Morgan AI Demo • ${new Date().toLocaleString()}
        </div>
    </div>
</body>
</html>
        `.trim();

        // Try to send email via Resend
        const resend = getResendClient();

        if (resend) {
            try {
                const { data, error } = await resend.emails.send({
                    from: 'Morgan AI <onboarding@resend.dev>', // Default Resend sender for dev
                    to: ['aifusionlabs@gmail.com'],
                    subject: `New Lead: ${name} from ${company || 'Unknown Company'}`,
                    html: emailHtml,
                    replyTo: email, // Makes it easy to reply directly to the lead
                });

                if (error) {
                    console.error('Resend error:', error);
                } else {
                    console.log('✅ Email sent successfully:', data);
                }
            } catch (emailError) {
                console.error('Email send failed:', emailError);
            }
        } else {
            console.warn('⚠️ RESEND_API_KEY not configured - email not sent');
        }

        // Always return success to user (we have the data logged)
        return NextResponse.json({
            success: true,
            message: "Thank you! We'll be in touch soon."
        });

    } catch (error) {
        console.error('Contact form error:', error);
        return NextResponse.json(
            { error: 'Failed to submit form' },
            { status: 500 }
        );
    }
}
