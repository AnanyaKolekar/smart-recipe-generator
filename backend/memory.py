"""Agent memory — personalized user preferences across sessions."""

from __future__ import annotations

import json
from typing import Any

from database import get_connection, init_db, row_to_dict


def _parse_json_list(value: str | None) -> list[str]:
    if not value:
        return []
    try:
        data = json.loads(value)
        return data if isinstance(data, list) else []
    except json.JSONDecodeError:
        return []


def get_user_memory(user_id: int) -> dict[str, Any]:
    """Load personalized preferences for agent context."""
    init_db()
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM user_preferences WHERE user_id = ?",
            (user_id,),
        ).fetchone()

    prefs = row_to_dict(row) or {}
    return {
        "preferred_cuisine": prefs.get("preferred_cuisine", "South Indian"),
        "preferred_diet": prefs.get("preferred_diet", "Vegetarian"),
        "preferred_language": prefs.get("preferred_language", "en"),
        "favorite_ingredients": _parse_json_list(prefs.get("favorite_ingredients")),
        "recent_recipes": _parse_json_list(prefs.get("recent_recipes")),
        "generation_count": prefs.get("generation_count", 0),
    }


def update_user_memory(
    user_id: int,
    *,
    cuisine: str | None = None,
    diet: str | None = None,
    language: str | None = None,
    ingredients: str | None = None,
    recipe_name: str | None = None,
) -> None:
    """Update preferences after a successful recipe generation."""
    init_db()
    memory = get_user_memory(user_id)

    fav = set(memory.get("favorite_ingredients", []))
    if ingredients:
        for item in ingredients.split(","):
            cleaned = item.strip().lower()
            if cleaned:
                fav.add(cleaned)

    recent = memory.get("recent_recipes", [])
    if recipe_name and recipe_name not in recent:
        recent.insert(0, recipe_name)
    recent = recent[:10]

    with get_connection() as conn:
        conn.execute(
            """
            UPDATE user_preferences SET
                preferred_cuisine = ?,
                preferred_diet = ?,
                preferred_language = ?,
                favorite_ingredients = ?,
                recent_recipes = ?,
                generation_count = generation_count + 1
            WHERE user_id = ?
            """,
            (
                cuisine or memory.get("preferred_cuisine", "South Indian"),
                diet or memory.get("preferred_diet", "Vegetarian"),
                language or memory.get("preferred_language", "en"),
                json.dumps(sorted(fav)[-30:]),
                json.dumps(recent),
                user_id,
            ),
        )
        conn.commit()


def format_memory_for_prompt(memory: dict[str, Any] | None) -> str:
    """Format user memory as context for LLM agents."""
    if not memory:
        return "No prior user preferences available."

    return f"""User personalization memory:
- Preferred cuisine: {memory.get('preferred_cuisine', 'N/A')}
- Preferred diet: {memory.get('preferred_diet', 'N/A')}
- Favorite ingredients: {', '.join(memory.get('favorite_ingredients', [])[:15]) or 'None yet'}
- Recently generated recipes: {', '.join(memory.get('recent_recipes', [])[:5]) or 'None yet'}
- Total recipes generated: {memory.get('generation_count', 0)}

Use this memory to personalize recommendations when appropriate."""
