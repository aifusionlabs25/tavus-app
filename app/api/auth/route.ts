import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { name, email } = body

        // Basic Email Regex Validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

        if (!email || !emailRegex.test(email)) {
            console.log(`❌ Access denied for: ${name} (invalid email: ${email})`)
            return NextResponse.json({
                success: false,
                message: 'Please enter a valid work email.'
            }, { status: 400 })
        }

        console.log(`✅ Access granted to: ${name} (${email})`)
        return NextResponse.json({
            success: true,
            message: 'Access granted'
        })

    } catch (error) {
        console.error('Auth error:', error)
        return NextResponse.json({
            success: false,
            message: 'Authentication failed'
        }, { status: 500 })
    }
}
