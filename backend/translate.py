"""Translate recipe content between English and Kannada using Groq."""

from __future__ import annotations

import json
import re
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage

from multi_agent_system import get_llm

TRANSLATE_PROMPT = """You are a professional culinary translator for RecipeGenAI.

Translate ALL recipe content to the target language accurately.
Keep cooking terms clear and natural for home cooks.

Return ONLY valid JSON:
{
  "recipe_name": "translated name",
  "description": "translated description",
  "ingredients": ["translated ingredient 1", "..."],
  "instructions": ["translated step 1", "..."],
  "tips": ["translated tip 1", "..."],
  "serving_suggestions": ["translated suggestion 1", "..."],
  "nutrition_serving_size": "translated serving size",
  "nutrition_notes": "translated nutrition note"
}

For Kannada (kn): use Kannada script (ಕನ್ನಡ) throughout.
For English (en): use clear English throughout."""


def _parse_json(text: str) -> dict[str, Any]:
    text = text.strip()
    match = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if match:
        text = match.group(1).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        brace = re.search(r"\{[\s\S]*\}", text)
        if brace:
            return json.loads(brace.group())
        raise ValueError(f"Could not parse translation JSON: {text[:200]}")


def translate_recipe_content(
    *,
    recipe_name: str,
    description: str,
    ingredients: list[str],
    instructions: list[str],
    tips: list[str],
    serving_suggestions: list[str],
    nutrition_serving_size: str = "",
    nutrition_notes: str = "",
    source_language: str,
    target_language: str,
) -> dict[str, Any]:
    """Translate recipe fields from source_language to target_language."""
    if source_language == target_language:
        return {
            "recipe_name": recipe_name,
            "description": description,
            "ingredients": ingredients,
            "instructions": instructions,
            "tips": tips,
            "serving_suggestions": serving_suggestions,
            "nutrition_serving_size": nutrition_serving_size,
            "nutrition_notes": nutrition_notes,
        }

    target_label = "Kannada (ಕನ್ನಡ)" if target_language == "kn" else "English"
    source_label = "Kannada (ಕನ್ನಡ)" if source_language == "kn" else "English"

    user_prompt = f"""Translate from {source_label} to {target_label}.

Recipe name: {recipe_name}
Description: {description}
Ingredients: {json.dumps(ingredients, ensure_ascii=False)}
Instructions: {json.dumps(instructions, ensure_ascii=False)}
Tips: {json.dumps(tips, ensure_ascii=False)}
Serving suggestions: {json.dumps(serving_suggestions, ensure_ascii=False)}
Nutrition serving size: {nutrition_serving_size}
Nutrition notes: {nutrition_notes}

Translate everything to {target_label}."""

    llm = get_llm()
    response = llm.invoke(
        [
            SystemMessage(content=TRANSLATE_PROMPT),
            HumanMessage(content=user_prompt),
        ]
    )
    content = response.content if hasattr(response, "content") else str(response)
    result = _parse_json(content)

    return {
        "recipe_name": result.get("recipe_name", recipe_name),
        "description": result.get("description", description),
        "ingredients": result.get("ingredients", ingredients),
        "instructions": result.get("instructions", instructions),
        "tips": result.get("tips", tips),
        "serving_suggestions": result.get("serving_suggestions", serving_suggestions),
        "nutrition_serving_size": result.get(
            "nutrition_serving_size", nutrition_serving_size
        ),
        "nutrition_notes": result.get("nutrition_notes", nutrition_notes),
    }
