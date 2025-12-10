import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Lazy initialize Resend
let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
    if (!resendClient && process.env.RESEND_API_KEY) {
        resendClient = new Resend(process.env.RESEND_API_KEY);
    }
    return resendClient;
}

export async function POST(request: Request) {
    try {
        const { name, email, phone, company, website } = await request.json();

        // Validate required fields
        if (!name || !email) {
            return NextResponse.json(
                { error: 'Name and email are required' },
                { status: 400 }
            );
        }

        // 1. Send Admin Notification (to aifusionlabs)
        const adminHtml = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10B981; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
        .field { margin-bottom: 10px; }
        .label { font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>🔐 New Access Request</h2>
        </div>
        <div class="content">
            <div class="field"><span class="label">Name:</span> ${name}</div>
            <div class="field"><span class="label">Email:</span> <a href="mailto:${email}">${email}</a></div>
            <div class="field"><span class="label">Phone:</span> ${phone || 'N/A'}</div>
            <div class="field"><span class="label">Company:</span> ${company || 'N/A'}</div>
            <div class="field"><span class="label">Website:</span> ${website || 'N/A'}</div>
            <hr style="margin: 20px 0; border: 0; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 12px; color: #666;">This request was submitted via the Morgan Demo Access Gate.</p>
        </div>
    </div>
</body>
</html>`;

        const resend = getResendClient();

        if (resend) {
            await resend.emails.send({
                from: 'Access Gate <noreply@aifusionlabs.app>',
                to: ['aifusionlabs@gmail.com'],
                subject: `Access Request: ${name} (${company || 'No Company'})`,
                html: adminHtml,
                replyTo: email,
            });

            // 2. Send User Confirmation
            await resend.emails.send({
                from: 'GoDeskless <noreply@aifusionlabs.app>',
                to: [email],
                subject: 'We received your access request',
                html: `
<p>Hi ${name},</p>
<p>Thanks for your interest in the Morgan Interactive Demo.</p>
<p>We have received your request and our team will review it shortly. If approved, you will receive an access code via email.</p>
<p>Best,<br>The GoDeskless Team</p>
<a href="https://godeskless.com">Visit GoDeskless</a>
`
            });
        } else {
            console.log('⚠️ RESEND_API_KEY missing - Logging request instead');
            console.log({ name, email, phone, company, website });
        }

        return NextResponse.json({ success: true, message: 'Request submitted' });

    } catch (error) {
        console.error('Request Access Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
