#!/usr/bin/env python3
"""
Nova Overnight Analyzer
=======================
Batch-processes all files in Nova_Training_Corpus through Ollama (Nova model).
Run this before bed and wake up to a comprehensive analysis report.

Usage:
    python nova_overnight_analyzer.py

Requirements:
    - Ollama running locally (ollama serve)
    - Nova or another model pulled (ollama pull llama3.2 or your preferred model)
    - pip install requests

Author: Alpha (Antigravity)
Date: December 2025
"""

import os
import sys
import json
import time
import requests
from datetime import datetime
from pathlib import Path

# ============= CONFIGURATION =============
CORPUS_PATH = r"C:\AI Fusion Labs\Nova_Training_Corpus"
OUTPUT_DIR = r"C:\AI Fusion Labs\Nova_Training_Corpus\00_Analysis_Results"
OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "llama3:latest"  # Change to your preferred model (e.g., "mistral", "gemma3:4b")

# Analysis prompt template
ANALYSIS_PROMPT = """You are an AI systems analyst reviewing files from an AI Agent Factory project.

Analyze this file and provide:
1. **Summary**: What is this file about? (2-3 sentences)
2. **Key Insights**: What are the most important learnings? (bullet points)
3. **Reusable Patterns**: What can be extracted as a template for future agents?
4. **Improvements**: Any suggestions for optimization?

FILE NAME: {filename}
FILE CONTENT:
{content}

Respond in clean markdown format.
"""

# ============= HELPER FUNCTIONS =============

def get_all_files(directory):
    """Recursively get all text files from directory."""
    extensions = {'.txt', '.md', '.json', '.py', '.ts', '.tsx', '.js', '.jsx'}
    files = []
    for root, dirs, filenames in os.walk(directory):
        # Skip hidden directories
        dirs[:] = [d for d in dirs if not d.startswith('.')]
        for filename in filenames:
            if Path(filename).suffix.lower() in extensions:
                files.append(os.path.join(root, filename))
    return files

def read_file_content(filepath, max_chars=8000):
    """Read file content with size limit."""
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
            if len(content) > max_chars:
                content = content[:max_chars] + "\n\n[... TRUNCATED ...]"
            return content
    except Exception as e:
        return f"[ERROR READING FILE: {e}]"

def call_ollama(prompt, model=MODEL_NAME):
    """Send prompt to Ollama and get response."""
    try:
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.3,
                    "num_predict": 1000
                }
            },
            timeout=120
        )
        if response.status_code == 200:
            return response.json().get("response", "[NO RESPONSE]")
        else:
            return f"[OLLAMA ERROR: {response.status_code}]"
    except requests.exceptions.ConnectionError:
        return "[ERROR: Ollama not running. Start with 'ollama serve']"
    except Exception as e:
        return f"[ERROR: {e}]"

def analyze_file(filepath):
    """Analyze a single file."""
    filename = os.path.basename(filepath)
    relative_path = os.path.relpath(filepath, CORPUS_PATH)
    content = read_file_content(filepath)
    
    prompt = ANALYSIS_PROMPT.format(filename=relative_path, content=content)
    analysis = call_ollama(prompt)
    
    return {
        "file": relative_path,
        "analysis": analysis
    }

def save_individual_analysis(result, output_dir):
    """Save individual file analysis."""
    safe_name = result["file"].replace("\\", "_").replace("/", "_").replace(" ", "_")
    output_file = os.path.join(output_dir, f"analysis_{safe_name}.md")
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(f"# Analysis: {result['file']}\n\n")
        f.write(result["analysis"])
    
    return output_file

def create_master_report(results, output_dir, total_time):
    """Create master synthesis report."""
    report_path = os.path.join(output_dir, "MASTER_ANALYSIS_REPORT.md")
    
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write("# 🧠 Nova Overnight Analysis Report\n\n")
        f.write(f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"**Files Analyzed:** {len(results)}\n")
        f.write(f"**Total Runtime:** {total_time:.1f} minutes\n")
        f.write(f"**Model Used:** {MODEL_NAME}\n\n")
        f.write("---\n\n")
        
        # Table of Contents
        f.write("## 📋 Table of Contents\n\n")
        for i, result in enumerate(results, 1):
            f.write(f"{i}. [{result['file']}](#{i})\n")
        f.write("\n---\n\n")
        
        # Individual Analyses
        f.write("## 📊 File Analyses\n\n")
        for i, result in enumerate(results, 1):
            f.write(f"### <a name=\"{i}\"></a>{i}. {result['file']}\n\n")
            f.write(result["analysis"])
            f.write("\n\n---\n\n")
    
    return report_path

# ============= MAIN EXECUTION =============

def main():
    print("=" * 60)
    print("🧠 Nova Overnight Analyzer")
    print("=" * 60)
    print(f"Corpus Path: {CORPUS_PATH}")
    print(f"Model: {MODEL_NAME}")
    print(f"Start Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("-" * 60)
    
    # Create output directory
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Get all files
    files = get_all_files(CORPUS_PATH)
    total_files = len(files)
    print(f"Found {total_files} files to analyze.\n")
    
    if total_files == 0:
        print("No files found. Check CORPUS_PATH.")
        return
    
    # Test Ollama connection
    print("Testing Ollama connection...")
    test = call_ollama("Say 'ready' if you're online.", MODEL_NAME)
    if "ERROR" in test:
        print(f"❌ {test}")
        print("\nMake sure Ollama is running: ollama serve")
        return
    print("✅ Ollama connected.\n")
    
    # Process files
    results = []
    start_time = time.time()
    
    for i, filepath in enumerate(files, 1):
        filename = os.path.basename(filepath)
        print(f"[{i}/{total_files}] Analyzing: {filename[:50]}...")
        
        try:
            result = analyze_file(filepath)
            results.append(result)
            
            # Save individual analysis
            save_individual_analysis(result, OUTPUT_DIR)
            
            # Progress update
            elapsed = (time.time() - start_time) / 60
            avg_time = elapsed / i
            remaining = avg_time * (total_files - i)
            print(f"         ✅ Done. ETA: {remaining:.1f} min remaining")
            
        except Exception as e:
            print(f"         ❌ Error: {e}")
            results.append({"file": filepath, "analysis": f"[ERROR: {e}]"})
        
        # Small delay to avoid overwhelming Ollama
        time.sleep(1)
    
    # Create master report
    total_time = (time.time() - start_time) / 60
    report_path = create_master_report(results, OUTPUT_DIR, total_time)
    
    print("\n" + "=" * 60)
    print("✅ ANALYSIS COMPLETE!")
    print("=" * 60)
    print(f"Files Analyzed: {len(results)}")
    print(f"Total Time: {total_time:.1f} minutes")
    print(f"Master Report: {report_path}")
    print(f"Individual Analyses: {OUTPUT_DIR}")
    print("=" * 60)

if __name__ == "__main__":
    main()
