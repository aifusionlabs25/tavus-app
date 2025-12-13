import os
import datetime

# Define source artifacts (ordered by narrative flow)
ARTIFACTS_DIR = r"C:\Users\AI Fusion Labs\.gemini\antigravity\brain\91e45c3f-c7ef-43c7-863a-3b0286116683"
SOURCES = [
    {
        "title": "EXECUTIVE SUMMARY (Status & Handoff)",
        "file": "walkthrough.md"
    },
    {
        "title": "PROJECT TRACKER (Completed vs. Todo)",
        "file": "task.md"
    },
    {
        "title": "THE RULES (X Agent Factory Policy)",
        "file": "X_AGENT_FACTORY_POLICY.md"
    },
    {
        "title": "THE PRODUCT (Morgan v19.1 Master)",
        "file": "MORGAN_SYSTEM_PROMPT_v19.1_MASTER.txt"
    }
]

# External Design Assets to Include
DESIGN_ASSETS = [
    {
        "title": "DESIGN SYSTEM (Globals.css)",
        "path": r"C:\AI Fusion Labs\Tavus\API\tavus-app\app\globals.css"
    },
    {
        "title": "CORE COMPONENT (InteractiveAvatar.tsx)",
        "path": r"C:\AI Fusion Labs\Tavus\API\tavus-app\components\InteractiveAvatar.tsx"
    }
]

OUTPUT_FILE = os.path.join(ARTIFACTS_DIR, "NOVA_BRIEFING_PACKET_DEC12.md")

def create_briefing():
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as outfile:
        # 1. Header
        outfile.write(f"# NOVA BRIEFING PACKET - {timestamp}\\n")
        outfile.write("**TO:** Nova (Specialist)\\n")
        outfile.write("**FROM:** Alpha (Lead)\\n")
        outfile.write("**SUBJECT:** Morgan Project Status & Critical Handoff\\n\\n")
        outfile.write("---\n\n")
        outfile.write("> [!IMPORTANT]\n")
        outfile.write("> This packet aggregates the most current state of the Morgan project as of Dec 12.\n")
        outfile.write("> It includes the Security Patch (CVE-2025-55184), the ElevenLabs Fix, and the v19.1 Master Persona.\n\n")

        # 3. Design Focus (User Request)
        outfile.write("# SPECIAL INSTRUCTION: DESIGN POLISH & AESTHETICS\n")
        outfile.write("**ATTENTION NOVA:**\n")
        outfile.write("The CEO has explicitly requested that your primary focus for this next phase is **Site Design & Aesthetics**.\n")
        outfile.write("Please review the `walkthrough.md` and the existing components.\n")
        outfile.write("**Goal:** Improve and polish the look. Make it premium. The CEO wants 'Wow' factor.\n")
        outfile.write("**Context:** This is a high-stakes demo for a major enterprise client.\n\n")
        outfile.write("---\n")

        
        # 2. Iterate and Concatenate
        for item in SOURCES:
            path = os.path.join(ARTIFACTS_DIR, item["file"])
            title = item["title"]
            
            if os.path.exists(path):
                content = open(path, 'r', encoding='utf-8').read()
                outfile.write(f"\n# {title}\n")
                outfile.write(f"*(Source: `{item['file']}`)*\n\n")
                outfile.write(content)
                outfile.write("\n\n---\n")
                print(f"Included: {title}")
            else:
                outfile.write(f"\n# {title} [MISSING]\n")
                outfile.write(f"Could not locate file: `{path}`\n")
                print(f"Missing: {title}")

        # 3. Append Design Assets (Code)
        outfile.write("\n# APPENDIX: DESIGN SOURCE CODE\n\n")
        for item in DESIGN_ASSETS:
            path = item["path"]
            title = item["title"]
            
            if os.path.exists(path):
                content = open(path, 'r', encoding='utf-8').read()
                outfile.write(f"\n## {title}\n")
                outfile.write(f"```typescript\n{content}\n```\n")
                outfile.write("\n\n---\n")
                print(f"Included Asset: {title}")
            else:
                print(f"Missing Asset: {title}")

    print(f"Success. Briefing Packet created at: {OUTPUT_FILE}")

if __name__ == "__main__":
    create_briefing()
