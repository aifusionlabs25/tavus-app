/**
 * Update Morgan Persona - Enable Raven-0 Perception Layer
 * Run with: node scripts/update-perception.js
 * 
 * Uses JSON Patch (RFC 6902) format as required by Tavus API
 */

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const TAVUS_API_KEY = process.env.TAVUS_API_KEY;
const PERSONA_ID = process.env.NEXT_PUBLIC_TAVUS_PERSONA_ID;

async function updatePersonaPerception() {
    if (!TAVUS_API_KEY || !PERSONA_ID) {
        console.error('Missing TAVUS_API_KEY or NEXT_PUBLIC_TAVUS_PERSONA_ID');
        console.log('Set them in .env.local or pass as environment variables');
        process.exit(1);
    }

    console.log(`Updating Persona: ${PERSONA_ID}`);
    console.log('Enabling Raven-0 Perception Layer...\n');

    // JSON Patch format (RFC 6902) - array of operations
    const jsonPatchOperations = [
        {
            op: "replace",
            path: "/layers/perception/perception_model",
            value: "raven-0"
        },
        {
            op: "replace",
            path: "/layers/perception/perception_tool_prompt",
            value: "You are Morgan, a GoDeskless Field Service Specialist with visual awareness. When you see the GoDeskless interface, describe what's visible naturally and point out key features. Notice the user's expressions — if they look confused, offer help; if excited, celebrate with them. In demo mode, narrate briefly without overwhelming. If they're silent for 15+ seconds, gently check in."
        },
        {
            op: "replace",
            path: "/layers/perception/ambient_awareness_queries",
            value: [
                "Is the user looking at their screen or looking away?",
                "Does the user appear confused, frustrated, or stuck?",
                "Is the user smiling, nodding, or showing positive engagement?",
                "Is the user on the GoDeskless demo interface or dashboard?",
                "Has the user been silent for more than 15 seconds?"
            ]
        },
        {
            op: "replace",
            path: "/layers/perception/perception_tools",
            value: [
                {
                    type: "function",
                    function: {
                        name: "describe_screen",
                        description: "Narrate what is currently visible on the user's shared screen",
                        parameters: {
                            type: "object",
                            properties: {
                                screen_element: {
                                    type: "string",
                                    description: "The main UI element visible"
                                }
                            }
                        }
                    }
                },
                {
                    type: "function",
                    function: {
                        name: "offer_guidance",
                        description: "Proactively offer help when user appears stuck or confused",
                        parameters: {
                            type: "object",
                            properties: {
                                observation: { type: "string" },
                                suggested_action: { type: "string" }
                            }
                        }
                    }
                },
                {
                    type: "function",
                    function: {
                        name: "check_engagement",
                        description: "Re-engage the user if they appear distracted",
                        parameters: {
                            type: "object",
                            properties: {
                                engagement_level: {
                                    type: "string",
                                    enum: ["high", "medium", "low", "distracted"]
                                }
                            }
                        }
                    }
                }
            ]
        }
    ];

    try {
        const response = await fetch(`https://tavusapi.com/v2/personas/${PERSONA_ID}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json-patch+json',
                'x-api-key': TAVUS_API_KEY,
            },
            body: JSON.stringify(jsonPatchOperations),
        });

        const responseText = await response.text();
        let data;
        try {
            data = JSON.parse(responseText);
        } catch {
            data = { raw: responseText };
        }

        if (!response.ok) {
            console.error(`❌ Failed to update persona (${response.status}):`);
            console.error(JSON.stringify(data, null, 2));
            process.exit(1);
        }

        console.log('✅ Persona updated successfully!');
        console.log('\nPerception Layer Configuration:');
        console.log('- Model: raven-0');
        console.log('- Ambient Queries: 5');
        console.log('- Perception Tools: 3');
        console.log('\nMorgan can now see you and the screen share! 👁️');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

updatePersonaPerception();
