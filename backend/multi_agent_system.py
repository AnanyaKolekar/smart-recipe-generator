"""
RecipeGenAI - Multi-Agent Recipe Recommendation System
LangGraph orchestration with 4 collaborating AI agents powered by Groq.
Features: parallel execution, multi-language, agent memory, image generation.
"""

from __future__ import annotations

import json
import os
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any, TypedDict

from dotenv import load_dotenv
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_groq import ChatGroq
from langgraph.graph import END, START, StateGraph

from image_gen import generate_recipe_image_url
from memory import format_memory_for_prompt

_BACKEND_DIR = Path(__file__).resolve().parent
_ENV_FILE = _BACKEND_DIR / ".env"

LANGUAGE_NAMES = {
    "en": "English",
    "kn": "Kannada (ಕನ್ನಡ)",
}


def _load_env() -> None:
    """Load .env and always prefer values from the file over stale process env."""
    load_dotenv(_ENV_FILE, override=True)


_load_env()


# ---------------------------------------------------------------------------
# Shared State
# ---------------------------------------------------------------------------


class RecipeState(TypedDict, total=False):
    """Shared state passed between all agents in the LangGraph workflow."""

    ingredients: str
    cuisine: str
    diet: str
    cooking_time: str
    language: str
    user_memory: dict[str, Any]

    ingredient_analysis: dict[str, Any]

    recipe_name: str
    recipe_description: str
    required_ingredients: list[str]
    missing_ingredients: list[str]
    missing_ingredient_suggestions: list[str]
    shopping_list: list[str]

    nutrition: dict[str, Any]
    image_url: str

    instructions: list[str]
    tips: list[str]
    serving_suggestions: list[str]

    final_response: dict[str, Any]
    error: str


# ---------------------------------------------------------------------------
# LLM Configuration
# ---------------------------------------------------------------------------


def get_llm() -> ChatGroq:
    """Create a reusable Groq LLM instance from environment configuration."""
    _load_env()
    api_key = (os.getenv("GROQ_API_KEY") or "").strip().strip('"').strip("'")
    if not api_key:
        raise ValueError(
            "GROQ_API_KEY environment variable is not set. "
            "Copy .env.example to .env and add your API key."
        )
    if not api_key.startswith("gsk_"):
        raise ValueError(
            "Invalid GROQ_API_KEY format. Groq keys must start with 'gsk_'. "
            "Get a valid key at https://console.groq.com/keys"
        )
    model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    return ChatGroq(
        model=model,
        groq_api_key=api_key,
        temperature=0.7,
    )


def _lang_instruction(language: str) -> str:
    """Return language directive for agent prompts."""
    lang = language if language in LANGUAGE_NAMES else "en"
    name = LANGUAGE_NAMES[lang]
    if lang == "kn":
        return (
            f"\n\nIMPORTANT: Respond entirely in {name}. "
            "All recipe names, descriptions, ingredients, instructions, tips, "
            "and serving suggestions MUST be written in Kannada script (ಕನ್ನಡ)."
        )
    return f"\n\nRespond in {name}."


def _parse_json_response(text: str) -> dict[str, Any]:
    """Extract and parse JSON from an LLM response string."""
    text = text.strip()
    fence_match = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fence_match:
        text = fence_match.group(1).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        brace_match = re.search(r"\{[\s\S]*\}", text)
        if brace_match:
            return json.loads(brace_match.group())
        raise ValueError(f"Could not parse JSON from LLM response: {text[:200]}")


def _invoke_agent(system_prompt: str, user_prompt: str) -> dict[str, Any]:
    """Run a single agent prompt and return parsed JSON output."""
    llm = get_llm()
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_prompt),
    ]
    response = llm.invoke(messages)
    content = response.content if hasattr(response, "content") else str(response)
    return _parse_json_response(content)


# ---------------------------------------------------------------------------
# Agent 1: Ingredient Analyzer
# ---------------------------------------------------------------------------

INGREDIENT_ANALYZER_PROMPT = """You are the Ingredient Analyzer Agent for RecipeGenAI.

Analyze the user's available ingredients and produce a structured analysis.

Return ONLY valid JSON with this exact structure:
{
  "primary_ingredients": ["list of main/star ingredients"],
  "categories": {
    "vegetables": [],
    "proteins": [],
    "grains": [],
    "dairy": [],
    "spices_herbs": [],
    "others": []
  },
  "recipe_opportunities": ["3-5 recipe ideas possible with these ingredients"],
  "notes": "brief analysis summary"
}"""


def ingredient_analyzer_agent(state: RecipeState) -> RecipeState:
    """Analyze user ingredients, categories, and recipe opportunities."""
    lang = state.get("language", "en")
    memory_ctx = format_memory_for_prompt(state.get("user_memory"))

    user_prompt = f"""Available ingredients: {state.get('ingredients', '')}
Cuisine preference: {state.get('cuisine', 'Any')}
Dietary preference: {state.get('diet', 'Any')}
Maximum cooking time: {state.get('cooking_time', '30')} minutes

{memory_ctx}

Analyze these ingredients thoroughly.{_lang_instruction(lang)}"""

    try:
        analysis = _invoke_agent(INGREDIENT_ANALYZER_PROMPT, user_prompt)
        return {"ingredient_analysis": analysis}
    except Exception as exc:
        return {"error": f"Ingredient Analyzer failed: {exc}"}


# ---------------------------------------------------------------------------
# Agent 2: Recipe Finder
# ---------------------------------------------------------------------------

RECIPE_FINDER_PROMPT = """You are the Recipe Finder Agent for RecipeGenAI.

Based on ingredient analysis and user preferences, select the BEST matching recipe.
Consider the user's personalization memory when making your selection.

Return ONLY valid JSON with this exact structure:
{
  "recipe_name": "Name of the selected recipe",
  "recipe_description": "2-3 sentence appetizing description",
  "required_ingredients": ["all ingredients needed with quantities"],
  "missing_ingredients": ["ingredients user does NOT have but recipe needs"],
  "missing_ingredient_suggestions": ["substitutes or where to buy missing items"],
  "shopping_list": ["organized shopping list for missing + staple items"]
}

Match cuisine and dietary preferences strictly. Respect the cooking time limit."""


def recipe_finder_agent(state: RecipeState) -> RecipeState:
    """Generate and select the best recipe matching preferences."""
    if state.get("error"):
        return {}

    lang = state.get("language", "en")
    memory_ctx = format_memory_for_prompt(state.get("user_memory"))
    analysis = state.get("ingredient_analysis", {})

    user_prompt = f"""Ingredient Analysis:
{json.dumps(analysis, indent=2)}

User available ingredients: {state.get('ingredients', '')}
Cuisine: {state.get('cuisine', 'Any')}
Diet: {state.get('diet', 'Any')}
Max cooking time: {state.get('cooking_time', '30')} minutes

{memory_ctx}

Select the best recipe and identify missing ingredients.{_lang_instruction(lang)}"""

    try:
        result = _invoke_agent(RECIPE_FINDER_PROMPT, user_prompt)
        return {
            "recipe_name": result.get("recipe_name", ""),
            "recipe_description": result.get("recipe_description", ""),
            "required_ingredients": result.get("required_ingredients", []),
            "missing_ingredients": result.get("missing_ingredients", []),
            "missing_ingredient_suggestions": result.get(
                "missing_ingredient_suggestions", []
            ),
            "shopping_list": result.get("shopping_list", []),
        }
    except Exception as exc:
        return {"error": f"Recipe Finder failed: {exc}"}


# ---------------------------------------------------------------------------
# Agent 3: Nutrition Agent
# ---------------------------------------------------------------------------

NUTRITION_AGENT_PROMPT = """You are the Nutrition Agent for RecipeGenAI.

Estimate nutritional information per serving for the given recipe.

Return ONLY valid JSON with this exact structure:
{
  "calories": 350,
  "protein_g": 12,
  "carbohydrates_g": 45,
  "fat_g": 10,
  "fiber_g": 5,
  "sodium_mg": 400,
  "serving_size": "1 plate",
  "notes": "brief nutrition note"
}

Use realistic estimates based on ingredients and portion sizes. All numeric values should be numbers, not strings."""


def nutrition_agent(state: RecipeState) -> RecipeState:
    """Estimate calories, protein, carbs, and fats for the recipe."""
    if state.get("error"):
        return {}

    lang = state.get("language", "en")
    user_prompt = f"""Recipe: {state.get('recipe_name', '')}
Description: {state.get('recipe_description', '')}
Ingredients: {json.dumps(state.get('required_ingredients', []))}
Diet: {state.get('diet', 'Any')}
Cuisine: {state.get('cuisine', 'Any')}

Estimate nutrition per serving.{_lang_instruction(lang)}"""

    try:
        nutrition = _invoke_agent(NUTRITION_AGENT_PROMPT, user_prompt)
        return {"nutrition": nutrition}
    except Exception as exc:
        return {"error": f"Nutrition Agent failed: {exc}"}


# ---------------------------------------------------------------------------
# Agent 4: Cooking Instruction Agent
# ---------------------------------------------------------------------------

COOKING_INSTRUCTION_PROMPT = """You are the Cooking Instruction Agent for RecipeGenAI.

Generate detailed, practical cooking guidance for the recipe.

Return ONLY valid JSON with this exact structure:
{
  "instructions": ["step 1", "step 2", "... numbered detailed steps"],
  "tips": ["3-5 pro cooking tips"],
  "serving_suggestions": ["2-4 serving and pairing suggestions"]
}

Steps should be clear, actionable, and respect the maximum cooking time.
Include prep time estimates where helpful."""


def cooking_instruction_agent(state: RecipeState) -> RecipeState:
    """Generate cooking steps, tips, and serving suggestions."""
    if state.get("error"):
        return {}

    lang = state.get("language", "en")
    user_prompt = f"""Recipe: {state.get('recipe_name', '')}
Description: {state.get('recipe_description', '')}
Ingredients: {json.dumps(state.get('required_ingredients', []))}
Cuisine: {state.get('cuisine', 'Any')}
Diet: {state.get('diet', 'Any')}
Max cooking time: {state.get('cooking_time', '30')} minutes

Generate complete cooking instructions.{_lang_instruction(lang)}"""

    try:
        result = _invoke_agent(COOKING_INSTRUCTION_PROMPT, user_prompt)
        return {
            "instructions": result.get("instructions", []),
            "tips": result.get("tips", []),
            "serving_suggestions": result.get("serving_suggestions", []),
        }
    except Exception as exc:
        return {"error": f"Cooking Instruction Agent failed: {exc}"}


# ---------------------------------------------------------------------------
# Agent 5: Image Generation (runs in parallel — no LLM call)
# ---------------------------------------------------------------------------


def image_generation_agent(state: RecipeState) -> RecipeState:
    """Generate a recipe image URL."""
    if state.get("error") or not state.get("recipe_name"):
        return {}

    try:
        url = generate_recipe_image_url(
            recipe_name=state.get("recipe_name", ""),
            cuisine=state.get("cuisine", ""),
            description=state.get("recipe_description", ""),
        )
        return {"image_url": url}
    except Exception as exc:
        return {"image_url": "", "error": f"Image generation failed: {exc}"}


# ---------------------------------------------------------------------------
# Parallel Execution Node
# ---------------------------------------------------------------------------


def parallel_agents_node(state: RecipeState) -> RecipeState:
    """
    Run Nutrition, Cooking Instruction, and Image Generation in parallel
    for faster response times.
    """
    if state.get("error"):
        return {}

    merged: RecipeState = {}
    errors: list[str] = []

    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = [
            executor.submit(nutrition_agent, state),
            executor.submit(cooking_instruction_agent, state),
            executor.submit(image_generation_agent, state),
        ]
        for future in as_completed(futures):
            result = future.result()
            if result.get("error"):
                errors.append(result["error"])
            merged.update({k: v for k, v in result.items() if k != "error"})

    # Only fail on critical agent errors (nutrition/cooking), not image
    critical = [e for e in errors if "Image" not in e]
    if critical:
        merged["error"] = critical[0]
    return merged


# ---------------------------------------------------------------------------
# Final Response Builder
# ---------------------------------------------------------------------------


def build_final_response(state: RecipeState) -> RecipeState:
    """Assemble the final structured response from all agent outputs."""
    if state.get("error"):
        return {
            "final_response": {
                "error": state["error"],
                "recipe_name": "",
                "description": "",
                "image_url": "",
                "ingredients": [],
                "missing_ingredients": [],
                "missing_ingredient_suggestions": [],
                "shopping_list": [],
                "nutrition": {},
                "instructions": [],
                "tips": [],
                "serving_suggestions": [],
                "language": state.get("language", "en"),
            }
        }

    nutrition = state.get("nutrition", {})
    image_url = state.get("image_url", "")
    if not image_url and state.get("recipe_name"):
        image_url = generate_recipe_image_url(
            recipe_name=state.get("recipe_name", ""),
            cuisine=state.get("cuisine", ""),
            description=state.get("recipe_description", ""),
        )

    final = {
        "recipe_name": state.get("recipe_name", ""),
        "description": state.get("recipe_description", ""),
        "image_url": image_url,
        "ingredients": state.get("required_ingredients", []),
        "missing_ingredients": state.get("missing_ingredients", []),
        "missing_ingredient_suggestions": state.get(
            "missing_ingredient_suggestions", []
        ),
        "shopping_list": state.get("shopping_list", []),
        "nutrition": {
            "calories": nutrition.get("calories", 0),
            "protein": nutrition.get("protein_g", nutrition.get("protein", 0)),
            "carbs": nutrition.get(
                "carbohydrates_g", nutrition.get("carbs", 0)
            ),
            "fat": nutrition.get("fat_g", nutrition.get("fat", 0)),
            "fiber": nutrition.get("fiber_g", nutrition.get("fiber", 0)),
            "sodium": nutrition.get("sodium_mg", nutrition.get("sodium", 0)),
            "serving_size": nutrition.get("serving_size", "1 serving"),
            "notes": nutrition.get("notes", ""),
        },
        "instructions": state.get("instructions", []),
        "tips": state.get("tips", []),
        "serving_suggestions": state.get("serving_suggestions", []),
        "language": state.get("language", "en"),
    }
    return {"final_response": final}


# ---------------------------------------------------------------------------
# LangGraph Workflow
# ---------------------------------------------------------------------------


def create_recipe_workflow() -> StateGraph:
    """
    Build and compile the LangGraph StateGraph workflow.

    Flow:
      START -> Ingredient Analyzer -> Recipe Finder
           -> Parallel (Nutrition + Cooking + Image) -> Build Response -> END
    """
    workflow = StateGraph(RecipeState)

    workflow.add_node("ingredient_analyzer", ingredient_analyzer_agent)
    workflow.add_node("recipe_finder", recipe_finder_agent)
    workflow.add_node("parallel_agents", parallel_agents_node)
    workflow.add_node("build_response", build_final_response)

    workflow.add_edge(START, "ingredient_analyzer")
    workflow.add_edge("ingredient_analyzer", "recipe_finder")
    workflow.add_edge("recipe_finder", "parallel_agents")
    workflow.add_edge("parallel_agents", "build_response")
    workflow.add_edge("build_response", END)

    return workflow.compile()


_recipe_graph = None


def get_recipe_graph():
    """Return the compiled LangGraph workflow (lazy singleton)."""
    global _recipe_graph
    if _recipe_graph is None:
        _recipe_graph = create_recipe_workflow()
    return _recipe_graph


def run_recipe_workflow(
    ingredients: str,
    cuisine: str,
    diet: str,
    cooking_time: str,
    language: str = "en",
    user_memory: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Execute the full multi-agent recipe generation workflow.

    Args:
        ingredients: Comma-separated list of available ingredients.
        cuisine: Preferred cuisine type.
        diet: Dietary preference.
        cooking_time: Maximum cooking time in minutes.
        language: Response language code ('en' or 'kn').
        user_memory: Optional personalized preferences from agent memory.

    Returns:
        Final structured recipe response dictionary.
    """
    initial_state: RecipeState = {
        "ingredients": ingredients.strip(),
        "cuisine": cuisine.strip(),
        "diet": diet.strip(),
        "cooking_time": str(cooking_time).strip(),
        "language": language if language in LANGUAGE_NAMES else "en",
        "user_memory": user_memory or {},
    }

    graph = get_recipe_graph()
    result = graph.invoke(initial_state)
    return result.get("final_response", {})


# ---------------------------------------------------------------------------
# CLI Entry Point (Assignment Requirement)
# ---------------------------------------------------------------------------


def main() -> None:
    """Interactive terminal entry point for dynamic user input."""
    print("=" * 60)
    print("  RecipeGenAI - Multi-Agent Recipe Recommendation System")
    print("=" * 60)
    print()

    ingredients = input("Enter ingredients (comma-separated): ").strip()
    cuisine = input("Enter cuisine: ").strip()
    diet = input("Enter dietary preference: ").strip()
    cooking_time = input("Enter cooking time (minutes): ").strip()
    language = input("Enter language (en/kn) [en]: ").strip() or "en"

    if not ingredients:
        print("Error: At least one ingredient is required.")
        return

    print("\nGenerating recipe through multi-agent pipeline...")
    print("  [1/4] Ingredient Analyzer Agent")
    print("  [2/4] Recipe Finder Agent")
    print("  [3-5] Nutrition + Cooking + Image (parallel)")
    print()

    try:
        result = run_recipe_workflow(
            ingredients, cuisine, diet, cooking_time, language=language
        )
    except Exception as exc:
        print(f"Workflow failed: {exc}")
        return

    if result.get("error"):
        print(f"Error: {result['error']}")
        return

    print("=" * 60)
    print(f"  RECIPE: {result.get('recipe_name', 'N/A')}")
    print("=" * 60)
    if result.get("image_url"):
        print(f"\nImage: {result['image_url']}")
    print(f"\nDescription:\n  {result.get('description', '')}")

    print("\nIngredients:")
    for item in result.get("ingredients", []):
        print(f"  - {item}")

    missing = result.get("missing_ingredients", [])
    if missing:
        print("\nMissing Ingredients:")
        for item in missing:
            print(f"  - {item}")

    nutrition = result.get("nutrition", {})
    print("\nNutrition (per serving):")
    print(f"  Calories:  {nutrition.get('calories', 'N/A')}")
    print(f"  Protein:   {nutrition.get('protein', 'N/A')}g")

    print("\nCooking Instructions:")
    for i, step in enumerate(result.get("instructions", []), 1):
        print(f"  {i}. {step}")

    print("\n" + "=" * 60)
    print("  Recipe generation complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()
