import os
import json
import asyncio
from typing import Dict, Any
from google import genai
from google.genai import types
from dotenv import load_dotenv
from .prompts import EEAT_PROMPT, VIBE_CODE_PROMPT, PATTERN_SNIFFER_PROMPT, SYNTHESIS_PROMPT

load_dotenv()

# We depend on GEMINI_API_KEY environment variable handling from google-genai
try:
    client = genai.Client()
except Exception:
    client = None
MODEL_ID = 'gemini-2.5-flash' # Reverted to 2.5-flash to avoid 429 Quota errors on free-tier keys

async def async_generate(system_instruction: str, content: str, retries: int = 2) -> Dict[str, Any]:
    def _generate():
        if not client:
            return {"error": "GEMINI_API_KEY not configured. Backend cannot generate audit."}
        try:
            response = client.models.generate_content(
                model=MODEL_ID,
                contents=content,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.1,
                    response_mime_type="application/json"
                )
            )
            return json.loads(response.text)
        except Exception as e:
            return {"error": str(e), "raw": getattr(response, 'text', '') if 'response' in locals() else ''}
            
    for attempt in range(retries):
        res = await asyncio.to_thread(_generate)
        if "error" not in res:
            return res
        await asyncio.sleep(1)
    return res

async def run_audit_pipeline(scraped_data: Dict[str, Any]) -> Dict[str, Any]:
    text_content = scraped_data.get("text", "")
    html_content = scraped_data.get("raw_html", "")[:150000] # Increased limit for Gemini 3.1 Pro's massive context window
    url = scraped_data.get("url", "Unknown")
    
    results = await asyncio.gather(
        async_generate(EEAT_PROMPT, f"Text to analyze:\\n{text_content}\\n\\nHTML Snippet:\\n{html_content}"),
        async_generate(VIBE_CODE_PROMPT, f"URL: {url}\\n\\nHTML snippet:\\n{html_content}"),
        async_generate(PATTERN_SNIFFER_PROMPT, f"Text to analyze:\\n{text_content}")
    )
    
    eeat_res, tech_res, pattern_res = results
    
    synthesis_input = SYNTHESIS_PROMPT.format(
        eeat_json=json.dumps(eeat_res),
        technical_json=json.dumps(tech_res),
        content_json=json.dumps(pattern_res)
    )
    
    synthesis_res = await async_generate(
        system_instruction="You are a strict JSON responding agent. Just output the requested JSON schema for synthesis. DO NOT MARKDOWN FORMAT YOUR RESPONSE.",
        content=synthesis_input 
    )
    
    return {
        "eeat": eeat_res,
        "technical": tech_res,
        "content_patterns": pattern_res,
        "synthesis": synthesis_res
    }
