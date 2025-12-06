import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { name, email, company, message } = await request.json();

        // Validate required fields
        if (!name || !email) {
            return NextResponse.json(
                { error: 'Name and email are required' },
                { status: 400 }
            );
        }

        // For now, we'll log and send via a simple email approach
        // In production, integrate with SendGrid, Resend, or similar
        console.log('📧 New Lead Captured:');
        console.log('  Name:', name);
        console.log('  Email:', email);
        console.log('  Company:', company || 'Not provided');
        console.log('  Message:', message || 'No message');

        // Send email using fetch to a simple email service
        // Using Resend or similar would be ideal, but for now we'll use a webhook approach
        const emailContent = `
New Lead from Morgan AI Demo

Name: ${name}
Email: ${email}
Company: ${company || 'Not provided'}
Message: ${message || 'No message'}

Submitted: ${new Date().toISOString()}
    `.trim();

        // Try to send via email webhook (can be configured later)
        // For now, just log it
        console.log('Email would be sent to: aifusionlabs@gmail.com');
        console.log('Content:', emailContent);

        return NextResponse.json({
            success: true,
            message: 'Thank you! We\'ll be in touch soon.'
        });

    } catch (error) {
        console.error('Contact form error:', error);
        return NextResponse.json(
            { error: 'Failed to submit form' },
            { status: 500 }
        );
    }
}
