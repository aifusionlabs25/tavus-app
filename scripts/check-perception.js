/**
 * Check Morgan Persona - Verify Perception Settings
 * Run with: node scripts/check-perception.js
 */

require('dotenv').config({ path: '.env.local' });

const TAVUS_API_KEY = process.env.TAVUS_API_KEY;
const PERSONA_ID = process.env.NEXT_PUBLIC_TAVUS_PERSONA_ID;

async function checkPersonaPerception() {
    if (!TAVUS_API_KEY || !PERSONA_ID) {
        console.error('Missing TAVUS_API_KEY or NEXT_PUBLIC_TAVUS_PERSONA_ID');
        process.exit(1);
    }

    console.log(`Checking Persona: ${PERSONA_ID}\n`);

    try {
        const response = await fetch(`https://tavusapi.com/v2/personas/${PERSONA_ID}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': TAVUS_API_KEY,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('❌ Failed to get persona:', data);
            process.exit(1);
        }

        console.log('=== PERSONA INFO ===');
        console.log('Name:', data.persona_name);
        console.log('ID:', data.persona_id);

        console.log('\n=== PERCEPTION LAYER ===');
        const perception = data.layers?.perception;
        if (perception) {
            console.log('Model:', perception.perception_model || 'NOT SET');
            console.log('Tool Prompt:', perception.perception_tool_prompt ? 'SET (' + perception.perception_tool_prompt.substring(0, 50) + '...)' : 'NOT SET');
            console.log('Ambient Queries:', perception.ambient_awareness_queries?.length || 0);
            console.log('Perception Tools:', perception.perception_tools?.length || 0);
        } else {
            console.log('❌ Perception layer not configured!');
        }

        console.log('\n=== RAW PERCEPTION DATA ===');
        console.log(JSON.stringify(perception, null, 2));

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkPersonaPerception();
