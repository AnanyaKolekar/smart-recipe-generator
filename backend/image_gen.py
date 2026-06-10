"""Recipe image generation using free food image APIs — unique per recipe."""

from __future__ import annotations

import base64
import logging
import re
import urllib.parse

import httpx

logger = logging.getLogger(__name__)

CUISINE_AREA_MAP: dict[str, str] = {
    "indian": "Indian",
    "italian": "Italian",
    "chinese": "Chinese",
    "mexican": "Mexican",
    "continental": "British",
}

CUISINE_FOODISH_MAP: dict[str, str] = {
    "indian": "biryani",
    "italian": "pasta",
    "chinese": "samosa",
    "mexican": "burger",
    "continental": "pizza",
}

# Keywords in recipe name → Foodish category for better visual match
KEYWORD_CATEGORY_MAP: dict[str, str] = {
    "biryani": "biryani",
    "paneer": "butter-chicken",
    "tikka": "butter-chicken",
    "curry": "butter-chicken",
    "masala": "butter-chicken",
    "pasta": "pasta",
    "pizza": "pizza",
    "burger": "burger",
    "samosa": "samosa",
    "dosa": "dosa",
    "idli": "idly",
    "idly": "idly",
    "rajma": "rajma",
    "dessert": "dessert",
    "cake": "dessert",
    "sweet": "dessert",
}

FOODISH_BASE = "https://foodish-api.com/images"
FOODISH_VARIANTS = 10


def _recipe_seed(recipe_name: str, cuisine: str = "") -> int:
    """Stable numeric seed unique to each recipe."""
    return abs(hash(f"{recipe_name.lower().strip()}|{cuisine.lower().strip()}"))


def _name_similarity(recipe_name: str, meal_name: str) -> float:
    """Score how closely a TheMealDB result matches the recipe name."""
    a = set(re.findall(r"[a-z0-9]+", recipe_name.lower()))
    b = set(re.findall(r"[a-z0-9]+", meal_name.lower()))
    if not a or not b:
        return 0.0
    overlap = len(a & b)
    return overlap / max(len(a), len(b))


def _svg_placeholder_data_url(recipe_name: str, cuisine: str = "") -> str:
    """Unique SVG placeholder per recipe (color derived from recipe name)."""
    seed = _recipe_seed(recipe_name, cuisine)
    hue = seed % 360
    title = (recipe_name or "Recipe")[:40]
    subtitle = (cuisine or "Delicious dish")[:30]
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:hsl({hue},70%,55%)"/>
      <stop offset="100%" style="stop-color:hsl({(hue + 40) % 360},75%,42%)"/>
    </linearGradient>
  </defs>
  <rect width="800" height="600" fill="url(#bg)"/>
  <text x="400" y="260" text-anchor="middle" fill="white" font-size="80">🍽️</text>
  <text x="400" y="340" text-anchor="middle" fill="white" font-family="sans-serif" font-size="28" font-weight="bold">{title}</text>
  <text x="400" y="380" text-anchor="middle" fill="white" font-family="sans-serif" font-size="18" opacity="0.9">{subtitle}</text>
</svg>"""
    encoded = base64.b64encode(svg.encode()).decode()
    return f"data:image/svg+xml;base64,{encoded}"


def _themealdb_search(query: str) -> list[dict]:
    url = f"https://www.themealdb.com/api/json/v1/1/search.php?s={urllib.parse.quote(query.strip())}"
    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.get(url)
            if response.status_code != 200:
                return []
            return response.json().get("meals") or []
    except Exception as exc:
        logger.warning("TheMealDB search failed for '%s': %s", query, exc)
        return []


def _best_themealdb_match(recipe_name: str) -> str | None:
    """Search TheMealDB with multiple queries and pick the best name match."""
    queries: list[str] = [recipe_name.strip()]
    words = [w for w in re.findall(r"[A-Za-z0-9]+", recipe_name) if len(w) > 2]
    if len(words) >= 2:
        queries.append(" ".join(words[:2]))
    for word in sorted(words, key=len, reverse=True):
        if word.lower() not in {q.lower() for q in queries}:
            queries.append(word)

    best_url: str | None = None
    best_score = 0.35  # minimum threshold

    seen_ids: set[str] = set()
    for query in queries:
        for meal in _themealdb_search(query):
            meal_id = meal.get("idMeal", "")
            if meal_id in seen_ids:
                continue
            seen_ids.add(meal_id)

            score = _name_similarity(recipe_name, meal.get("strMeal", ""))
            if score > best_score:
                thumb = meal.get("strMealThumb", "")
                if thumb and thumb.startswith("http"):
                    best_score = score
                    best_url = thumb

    return best_url


def _themealdb_by_cuisine(recipe_name: str, cuisine: str) -> str | None:
    """Pick a unique meal from TheMealDB cuisine filter using recipe hash."""
    area = CUISINE_AREA_MAP.get(cuisine.lower().strip())
    if not area:
        return None

    url = f"https://www.themealdb.com/api/json/v1/1/filter.php?a={urllib.parse.quote(area)}"
    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.get(url)
            if response.status_code != 200:
                return None
            meals = response.json().get("meals") or []
            if not meals:
                return None

            index = _recipe_seed(recipe_name, cuisine) % len(meals)
            meal_id = meals[index].get("idMeal")
            if not meal_id:
                return None

            detail = client.get(
                f"https://www.themealdb.com/api/json/v1/1/lookup.php?i={meal_id}"
            )
            detail_meals = detail.json().get("meals") or []
            if detail_meals:
                thumb = detail_meals[0].get("strMealThumb")
                return thumb if thumb and thumb.startswith("http") else None
    except Exception as exc:
        logger.warning("TheMealDB cuisine filter failed: %s", exc)
    return None


def _detect_foodish_category(recipe_name: str, cuisine: str, ingredients: list[str]) -> str:
    """Pick the most relevant Foodish category from name, cuisine, and ingredients."""
    combined = f"{recipe_name} {' '.join(ingredients)}".lower()
    for keyword, category in KEYWORD_CATEGORY_MAP.items():
        if keyword in combined:
            return category
    return CUISINE_FOODISH_MAP.get(cuisine.lower().strip(), "biryani")


def _foodish_url(recipe_name: str, cuisine: str, ingredients: list[str] | None = None) -> str:
    """Foodish image URL — variant index is unique per recipe name."""
    category = _detect_foodish_category(recipe_name, cuisine, ingredients or [])
    variant = (_recipe_seed(recipe_name, cuisine) % FOODISH_VARIANTS) + 1
    return f"{FOODISH_BASE}/{category}/{category}{variant}.jpg"


def _validate_image_url(url: str) -> bool:
    if url.startswith("data:"):
        return True
    try:
        with httpx.Client(timeout=12.0, follow_redirects=True) as client:
            response = client.head(url)
            if response.status_code != 200:
                response = client.get(url)
            content_type = response.headers.get("content-type", "")
            return response.status_code == 200 and "image" in content_type
    except Exception:
        return False


def generate_recipe_image_url(
    recipe_name: str,
    cuisine: str = "",
    description: str = "",
    ingredients: list[str] | None = None,
) -> str:
    """
    Resolve a unique recipe image URL.

    Strategy (each step tries to return a different image per recipe):
      1. TheMealDB — best name match across multiple search queries
      2. TheMealDB — cuisine area filter, index by recipe hash
      3. Foodish — category from keywords + variant by recipe hash
      4. Unique SVG placeholder per recipe
    """
    if not recipe_name:
        return _svg_placeholder_data_url("Recipe", cuisine)

    ingredients = ingredients or []

    # 1. Best name match on TheMealDB
    themealdb_url = _best_themealdb_match(recipe_name)
    if themealdb_url and _validate_image_url(themealdb_url):
        logger.info("TheMealDB name match for '%s'", recipe_name)
        return themealdb_url

    # 2. Cuisine-filtered TheMealDB (unique index per recipe)
    cuisine_url = _themealdb_by_cuisine(recipe_name, cuisine)
    if cuisine_url and _validate_image_url(cuisine_url):
        logger.info("TheMealDB cuisine pick for '%s' (%s)", recipe_name, cuisine)
        return cuisine_url

    # 3. Foodish with recipe-specific variant
    foodish = _foodish_url(recipe_name, cuisine, ingredients)
    if _validate_image_url(foodish):
        logger.info("Foodish image for '%s': %s", recipe_name, foodish)
        return foodish

    # 4. Unique SVG fallback
    logger.info("SVG placeholder for '%s'", recipe_name)
    return _svg_placeholder_data_url(recipe_name, cuisine)
