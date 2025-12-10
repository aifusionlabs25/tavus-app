import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { name, token } = body

        // Get the secret token from environment variable
        const validToken = process.env.DEMO_ACCESS_TOKEN

        if (!validToken) {
            console.error('CRITICAL: DEMO_ACCESS_TOKEN not configured in environment')
            return NextResponse.json({
                success: false,
                message: 'System Integrity Error: Auth not configured.'
            }, { status: 500 })
        }

        // Validate token
        if (token === validToken) {
            console.log(`✅ Access granted to: ${name}`)
            return NextResponse.json({
                success: true,
                message: 'Access granted'
            })
        } else {
            console.log(`❌ Access denied for: ${name} (invalid token)`)
            return NextResponse.json({
                success: false,
                message: 'Invalid access token'
            }, { status: 401 })
        }

    } catch (error) {
        console.error('Auth error:', error)
        return NextResponse.json({
            success: false,
            message: 'Authentication failed'
        }, { status: 500 })
    }
}
