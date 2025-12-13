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
        "title": "IMPLEMENTATION PLAN (The Forensic Fix)",
        "file": "implementation_plan.md"
    },
    {
        "title": "THE PRODUCT (Morgan v19.1 Master)",
        "file": "MORGAN_SYSTEM_PROMPT_v19.1_MASTER.txt"
    }
]

# External Design Assets to Include
DESIGN_ASSETS = [
    {
        "title": "WEBHOOK (Analysis Pipeline)",
        "path": r"C:\AI Fusion Labs\Tavus\API\tavus-app\app\api\webhook\route.ts"
    },
    {
        "title": "END ROUTE (Session Report)",
        "path": r"C:\AI Fusion Labs\Tavus\API\tavus-app\app\api\tavus\end\route.ts"
    },
    {
        "title": "CONFIG (Single Source of Truth)",
        "path": r"C:\AI Fusion Labs\Tavus\API\tavus-app\lib\config.ts"
    },
    {
        "title": "GEMINI SERVICE (Analysis Logic)",
        "path": r"C:\AI Fusion Labs\Tavus\API\tavus-app\lib\gemini-service.ts"
    }
]

OUTPUT_FILE = os.path.join(ARTIFACTS_DIR, "NOVA_BRIEFING_PACKET_DEC13.md")

def create_briefing():
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as outfile:
        # 1. Header
        outfile.write(f"# NOVA BRIEFING PACKET - {timestamp}\n")
        outfile.write("**TO:** Nova (Specialist)\n")
        outfile.write("**FROM:** Antigravity (Alpha Agent)\n")
        outfile.write("**SUBJECT:** Critical Bug: Missing Hot Lead Email (Transcript Extraction)\n\n")
        outfile.write("---\n\n")
        outfile.write("> [!IMPORTANT]\n")
        outfile.write("> **MISSION:** Debug and fix the Hot Lead Email failure.\n")
        outfile.write("> **STATUS:** Session Report works (Timezone Fixed). Webhook fires (Retries 30s). Transcript is EMPTY/FAILING.\n")
        outfile.write("> **HYPOTHESIS:** Previously suspected `body.properties` vs `body.transcript` mismatch. Fix deployed but user reports failure.\n\n")

        # 3. Design Focus (User Request)
        outfile.write("# SPECIAL INSTRUCTION: DEEP BACKEND DEBUGGING\n")
        outfile.write("**ATTENTION NOVA:**\n")
        outfile.write("The CEO needs the 'Hot Lead' email to fire immediately after the session.\n")
        outfile.write("Current architecture uses a dual-trigger webhook (`transcription_ready` OR `shutdown`).\n")
        outfile.write("The critical failure point is **Transcript Extraction**.\n")
        outfile.write("**Goal:** Ensure `webhook/route.ts` successfully extracts text and triggers Gemini + Gmail.\n\n")
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
        outfile.write("\n# APPENDIX: BACKEND SOURCE CODE\n\n")
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
