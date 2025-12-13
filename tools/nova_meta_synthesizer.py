#!/usr/bin/env python3
"""
Nova 30K Altitude Synthesizer (Phase 2)
========================================
Reads all individual file analyses and synthesizes them into a high-level
strategic report — the "30,000 foot view" of everything.

Usage:
    python nova_meta_synthesizer.py

Prerequisites:
    - Run nova_overnight_analyzer.py first (Phase 1)
    - Ollama running with llama3:latest

Author: Alpha (Antigravity)
Date: December 2025
"""

import os
import time
import requests
from datetime import datetime
from pathlib import Path

# ============= CONFIGURATION =============
ANALYSIS_DIR = r"C:\AI Fusion Labs\Nova_Training_Corpus\00_Analysis_Results"
OUTPUT_FILE = r"C:\AI Fusion Labs\Nova_Training_Corpus\00_Analysis_Results\30K_ALTITUDE_SYNTHESIS.md"
OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "llama3:latest"

# How many analyses to feed per batch (adjust based on context limits)
BATCH_SIZE = 15

# Synthesis prompts
BATCH_SYNTHESIS_PROMPT = """You are a strategic analyst reviewing multiple AI agent development files.

Below are summaries of {count} files from an AI Agent Factory project. 
Extract the COMMON PATTERNS and KEY INSIGHTS across all of them.

Focus on:
1. What patterns repeat across files?
2. What are the most important learnings?
3. What went wrong? What went right?
4. What should be replicated for future agents?

FILES:
{summaries}

Provide a CONCISE synthesis (bullet points, 200 words max).
"""

FINAL_SYNTHESIS_PROMPT = """You are the Chief Strategist for an AI Agent Factory.

You have received batch syntheses from analyzing 174 files about Morgan (an AI sales agent) 
and the X Agent Factory infrastructure.

Your task: Create the DEFINITIVE 30,000 foot strategic report.

BATCH SYNTHESES:
{all_batches}

---

Create a strategic report with these sections:

# 🧠 30K ALTITUDE SYNTHESIS

## Executive Summary
(3 sentences: What is this project? What did we learn? What's next?)

## Top 10 Patterns Discovered
(Bullet list of the most important recurring patterns)

## Critical Success Factors
(What made Morgan work? What should we replicate?)

## Mistakes & Lessons Learned
(What went wrong? What should we avoid?)

## Reusable Templates & Assets
(What can be extracted for future agents - Sarah, Ava, etc.?)

## Recommended Next Actions
(Prioritized list of what to do next)

## Factory Optimization Opportunities
(How to make the next agent 10x faster to build)

Be strategic, be concise, be actionable.
"""

# ============= HELPER FUNCTIONS =============

def get_analysis_files(directory):
    """Get all individual analysis files."""
    files = []
    for f in os.listdir(directory):
        if f.startswith("analysis_") and f.endswith(".md"):
            files.append(os.path.join(directory, f))
    return sorted(files)

def read_file(filepath, max_chars=2000):
    """Read file with size limit."""
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
            if len(content) > max_chars:
                content = content[:max_chars] + "\n[...truncated...]"
            return content
    except Exception as e:
        return f"[ERROR: {e}]"

def call_ollama(prompt, model=MODEL_NAME, timeout=180):
    """Send prompt to Ollama."""
    try:
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.4,
                    "num_predict": 800
                }
            },
            timeout=timeout
        )
        if response.status_code == 200:
            return response.json().get("response", "[NO RESPONSE]")
        else:
            return f"[OLLAMA ERROR: {response.status_code}]"
    except Exception as e:
        return f"[ERROR: {e}]"

def batch_files(files, batch_size):
    """Split files into batches."""
    for i in range(0, len(files), batch_size):
        yield files[i:i + batch_size]

# ============= MAIN EXECUTION =============

def main():
    print("=" * 60)
    print("🦅 Nova 30K Altitude Synthesizer (Phase 2)")
    print("=" * 60)
    print(f"Analysis Directory: {ANALYSIS_DIR}")
    print(f"Model: {MODEL_NAME}")
    print(f"Start Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("-" * 60)
    
    # Get all analysis files
    files = get_analysis_files(ANALYSIS_DIR)
    total_files = len(files)
    print(f"Found {total_files} individual analyses to synthesize.\n")
    
    if total_files == 0:
        print("No analysis files found. Run nova_overnight_analyzer.py first.")
        return
    
    # Test Ollama
    print("Testing Ollama connection...")
    test = call_ollama("Say 'ready'")
    if "ERROR" in test:
        print(f"❌ {test}")
        return
    print("✅ Ollama connected.\n")
    
    # Phase 2A: Batch Synthesis
    print("📦 Phase 2A: Batch Synthesis")
    print("-" * 40)
    
    batch_syntheses = []
    batches = list(batch_files(files, BATCH_SIZE))
    total_batches = len(batches)
    
    start_time = time.time()
    
    for i, batch in enumerate(batches, 1):
        print(f"[Batch {i}/{total_batches}] Processing {len(batch)} files...")
        
        # Read all files in batch
        summaries = ""
        for f in batch:
            filename = os.path.basename(f)
            content = read_file(f, max_chars=1500)
            summaries += f"\n--- {filename} ---\n{content}\n"
        
        # Get batch synthesis
        prompt = BATCH_SYNTHESIS_PROMPT.format(count=len(batch), summaries=summaries)
        synthesis = call_ollama(prompt)
        batch_syntheses.append(f"### Batch {i}\n{synthesis}")
        
        print(f"         ✅ Batch {i} synthesized.")
        time.sleep(1)
    
    # Phase 2B: Final 30K Synthesis
    print("\n🦅 Phase 2B: Final 30K Altitude Synthesis")
    print("-" * 40)
    
    all_batches = "\n\n".join(batch_syntheses)
    final_prompt = FINAL_SYNTHESIS_PROMPT.format(all_batches=all_batches)
    
    print("Generating strategic synthesis (this may take a minute)...")
    final_synthesis = call_ollama(final_prompt, timeout=300)
    
    # Save output
    total_time = (time.time() - start_time) / 60
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write(final_synthesis)
        f.write(f"\n\n---\n\n")
        f.write(f"*Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*\n")
        f.write(f"*Files Analyzed: {total_files}*\n")
        f.write(f"*Batches Processed: {total_batches}*\n")
        f.write(f"*Total Time: {total_time:.1f} minutes*\n")
    
    print("\n" + "=" * 60)
    print("✅ 30K ALTITUDE SYNTHESIS COMPLETE!")
    print("=" * 60)
    print(f"Files Synthesized: {total_files}")
    print(f"Batches Processed: {total_batches}")
    print(f"Total Time: {total_time:.1f} minutes")
    print(f"Output: {OUTPUT_FILE}")
    print("=" * 60)

if __name__ == "__main__":
    main()
