import httpx
from bs4 import BeautifulSoup
from typing import Dict, Any

async def scrape_url(url: str) -> Dict[str, Any]:
    async with httpx.AsyncClient(follow_redirects=True, timeout=15.0) as client:
        response = await client.get(url)
        response.raise_for_status()
        
        html_content = response.text
        soup = BeautifulSoup(html_content, "html.parser")
        
        # Simple extraction
        title = soup.title.string if soup.title else ""
        text_content = soup.get_text(separator=' ', strip=True)
        
        return {
            "title": title,
            "raw_html": html_content,
            "text": text_content[:50000] # Clamp to avoid massive payloads
        }
