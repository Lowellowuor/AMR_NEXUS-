import json
import os
from typing import Dict, Any
from src.core.config import settings
from src.utils.logger import logger

try:
    from google import genai
    from google.genai import types
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    logger.warning("Google GenAI SDK not installed. LLM features will be unavailable.")


def _get_client():
    api_key = getattr(settings, "GEMINI_API_KEY", None) or os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "your_gemini_api_key":
        raise RuntimeError("GEMINI_API_KEY is not set in .env")
    return genai.Client(api_key=api_key)


def generate_llm_response(alert_data: Dict[str, Any], explanation: Dict[str, Any]) -> str:
    if not GEMINI_AVAILABLE:
        raise RuntimeError("Google GenAI SDK is not installed. Install with: pip install google-genai")

    cache_key = _insight_cache_key(context, data)
    cached = _insight_cache_get(cache_key)
    if cached:
        logger.info("LLM insight cache hit")
        return cached

    client = _get_client()

    system_prompt = """You are a senior antimicrobial resistance epidemiologist briefing a Ministry of Health officer. Write with the calm precision of a clinical brief.

Produce a brief with exactly three sections in this order:

1. A section titled "## Summary" containing two sentences: the headline rate or count, and the direction of the trend.
2. A section titled "## Key observations" containing three bullets, each citing a number.
3. A section titled "## Recommended action" containing one sentence of concrete, role-appropriate advice.

Rules:
- Bold every key number with double asterisks, e.g. **11.1%**.
- British English.
- No emoji, no exclamation marks.
- Never truncate a section. Complete every sentence.
- If data is missing, state that plainly rather than inventing values."""

    user_prompt = f"""
    Alert details:
    Pathogen: {alert_data.get('pathogen', 'Unknown')}
    Drug class: {alert_data.get('drugClass', alert_data.get('antibiotic_class', 'Unknown'))}
    County: {alert_data.get('county', 'Unknown')}
    Sub-county: {alert_data.get('subCounty', alert_data.get('sub_county', 'Unknown'))}
    Risk score: {alert_data.get('riskScore', alert_data.get('risk_score', 'Unknown'))}
    Sector: {alert_data.get('sector', 'Unknown')}

    SHAP explanation:
    Confidence: {explanation.get('confidence', 'N/A')}
    Top contributors:
    {chr(10).join([f"- {c['factor']}: {c['shap_value']:.3f} ({c['direction']})" for c in explanation.get('contributors', [])[:5]])}
    """

    try:
        response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                max_output_tokens=2048,
            ),
        )
        return response.text
    except Exception as e:
        logger.error(f"Gemini API call failed: {str(e)}")
        raise


def generate_comparison_response(prompt: str) -> str:
    if not GEMINI_AVAILABLE:
        raise RuntimeError("Google GenAI SDK is not installed. Install with: pip install google-genai")

    client = _get_client()

    try:
        response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                max_output_tokens=2048,
            ),
        )
        return response.text
    except Exception as e:
        logger.error(f"Gemini comparison call failed: {str(e)}")
        raise


import time as _time
import hashlib as _hashlib

_INSIGHT_CACHE: Dict[str, tuple] = {}
_INSIGHT_TTL_SECONDS = 24 * 60 * 60


def _insight_cache_key(context: str, data: Dict[str, Any]) -> str:
    try:
        payload = f"{context}::{json.dumps(data, sort_keys=True, default=str)}"
    except Exception:
        payload = f"{context}::{id(data)}"
    return _hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _insight_cache_get(key: str):
    hit = _INSIGHT_CACHE.get(key)
    if not hit:
        return None
    ts, text = hit
    if _time.time() - ts > _INSIGHT_TTL_SECONDS:
        _INSIGHT_CACHE.pop(key, None)
        return None
    return text


def _insight_cache_set(key: str, text: str) -> None:
    _INSIGHT_CACHE[key] = (_time.time(), text)
    if len(_INSIGHT_CACHE) > 500:
        oldest = sorted(_INSIGHT_CACHE.items(), key=lambda kv: kv[1][0])[:100]
        for k, _ in oldest:
            _INSIGHT_CACHE.pop(k, None)


def generate_insight_response(context: str, data: Dict[str, Any]) -> str:
    """Produce a structured surveillance brief for a given context and dataset."""
    if not GEMINI_AVAILABLE:
        raise RuntimeError("Google GenAI SDK is not installed. Install with: pip install google-genai")

    client = _get_client()

    system_prompt = """You are a senior antimicrobial resistance epidemiologist briefing a Ministry of Health officer.

Write with the calm precision of a clinical brief. Never open with "Sure" or "Here is". Never close with pleasantries. Output only the brief.

Structure your reply in exactly this markdown layout, with no other text:

## Summary
<One or two sentences. Bold the key number or rate with **double asterisks**. Name the direction of the trend in plain language.>

## Key observations
- Bullet one, one sentence, cite a number.
- Bullet two, one sentence, cite a number.
- Bullet three if warranted.

## Recommended action
<One or two sentences. Concrete, role-appropriate (national policy vs county-level).>

Rules:
- British English (organisation, not organization).
- Bold key numbers with **double asterisks**.
- No emoji. No exclamation marks.
- Total length under 150 words.
- If data is missing or empty, say so plainly. Do not invent values.
- Adapt section headers if the context demands it (e.g. for an alert, use "Why this was triggered" / "Level of concern" / "Recommended action")."""

    user_prompt = f"""Context: {context}

Data:
{json.dumps(data, indent=2, default=str)}

Produce the brief."""

    try:
        response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                max_output_tokens=2048,
            ),
        )
        _insight_cache_set(cache_key, response.text)
        return response.text
    except Exception as e:
        logger.error(f"Gemini insight call failed: {str(e)}")
        raise

