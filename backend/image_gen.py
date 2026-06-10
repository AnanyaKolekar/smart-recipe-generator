"""Recipe image generation using free food image APIs."""

from __future__ import annotations

import base64
import logging
import urllib.parse

import httpx

logger = logging.getLogger(__name__)

# Map cuisine types to Foodish API categories
CUISINE_IMAGE_MAP: dict[str, str] = {
    "indian": "biryani",
    "italian": "pasta",
    "chinese": "samosa",
    "mexican": "burger",
    "continental": "pizza",
}

FOODISH_BASE = "https://foodish-api.com/images"


def _svg_placeholder_data_url(recipe_name: str, cuisine: str = "") -> str:
    """Generate an inline SVG placeholder when no external image is found."""
    title = (recipe_name or "Recipe")[:40]
    subtitle = (cuisine or "Delicious dish")[:30]
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#f97316"/>
      <stop offset="100%" style="stop-color:#ea580c"/>
    </linearGradient>
  </defs>
  <rect width="800" height="600" fill="url(#bg)"/>
  <text x="400" y="260" text-anchor="middle" fill="white" font-size="80">🍽️</text>
  <text x="400" y="340" text-anchor="middle" fill="white" font-family="sans-serif" font-size="32" font-weight="bold">{title}</text>
  <text x="400" y="380" text-anchor="middle" fill="#ffedd5" font-family="sans-serif" font-size="20">{subtitle}</text>
</svg>"""
    encoded = base64.b64encode(svg.encode()).decode()
    return f"data:image/svg+xml;base64,{encoded}"


def _search_themealdb(recipe_name: str) -> str | None:
    """Search TheMealDB for a matching recipe thumbnail."""
    query = urllib.parse.quote(recipe_name.strip())
    url = f"https://www.themealdb.com/api/json/v1/1/search.php?s={query}"
    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.get(url)
            if response.status_code != 200:
                return None
            data = response.json()
            meals = data.get("meals")
            if not meals:
                # Try first word only (e.g. "Paneer Tikka" -> "Paneer")
                first_word = recipe_name.split()[0] if recipe_name.split() else ""
                if first_word and first_word != recipe_name:
                    return _search_themealdb_first_word(first_word)
                return None
            thumb = meals[0].get("strMealThumb")
            return thumb if thumb and thumb.startswith("http") else None
    except Exception as exc:
        logger.warning("TheMealDB search failed: %s", exc)
        return None


def _search_themealdb_first_word(word: str) -> str | None:
    url = f"https://www.themealdb.com/api/json/v1/1/search.php?s={urllib.parse.quote(word)}"
    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.get(url)
            data = response.json()
            meals = data.get("meals")
            if meals:
                return meals[0].get("strMealThumb")
    except Exception:
        pass
    return None


def _foodish_url(cuisine: str) -> str | None:
    """Get a Foodish API image URL based on cuisine."""
    category = CUISINE_IMAGE_MAP.get(cuisine.lower().strip(), "biryani")
    # Foodish serves images at predictable paths; pick variant 1-10
    seed = abs(hash(cuisine)) % 10 + 1
    url = f"{FOODISH_BASE}/{category}/{category}{seed}.jpg"
    try:
        with httpx.Client(timeout=10.0, follow_redirects=True) as client:
            response = client.head(url)
            if response.status_code == 200:
                return url
            # Fallback to variant 1
            fallback = f"{FOODISH_BASE}/{category}/{category}1.jpg"
            if client.head(fallback).status_code == 200:
                return fallback
    except Exception as exc:
        logger.warning("Foodish lookup failed: %s", exc)
    return None


def _validate_image_url(url: str) -> bool:
    """Verify that a URL returns an actual image."""
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
) -> str:
    """
    Resolve a working recipe image URL.

    Strategy:
      1. TheMealDB search by recipe name
      2. Foodish API by cuisine category
      3. SVG placeholder (always works, embedded data URL)
    """
    if not recipe_name:
        return _svg_placeholder_data_url("Recipe", cuisine)

    # 1. TheMealDB — best match for named dishes
    themealdb_url = _search_themealdb(recipe_name)
    if themealdb_url and _validate_image_url(themealdb_url):
        logger.info("Image from TheMealDB for '%s'", recipe_name)
        return themealdb_url

    # 2. Foodish — cuisine-based food photography
    foodish_url = _foodish_url(cuisine)
    if foodish_url and _validate_image_url(foodish_url):
        logger.info("Image from Foodish for cuisine '%s'", cuisine)
        return foodish_url

    # 3. Guaranteed placeholder
    logger.info("Using SVG placeholder for '%s'", recipe_name)
    return _svg_placeholder_data_url(recipe_name, cuisine)
