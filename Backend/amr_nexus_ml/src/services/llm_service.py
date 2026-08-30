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

    client = _get_client()

    system_prompt = """
    You are an expert in antimicrobial resistance surveillance and stewardship.
    Given an alert, provide a structured response with these sections:
    1. **Why this alert was triggered** – Explain the top contributing factors in plain language.
    2. **Level of concern** – Assess severity based on risk score, pathogen, and drug class.
    3. **Recommended action** – Provide role-specific recommendations (national policy vs county clinical/veterinary).
    4. **Who should be notified** – List relevant stakeholders.

    Keep the response concise (under 150 words) and evidence-based.
    """

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
                max_output_tokens=1024,
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
                max_output_tokens=1024,
            ),
        )
        return response.text
    except Exception as e:
        logger.error(f"Gemini comparison call failed: {str(e)}")
        raise