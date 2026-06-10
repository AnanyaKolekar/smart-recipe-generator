"""
RecipeGenAI FastAPI Backend
REST API for the multi-agent recipe recommendation system.
"""

from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

_BACKEND_DIR = Path(__file__).resolve().parent
load_dotenv(_BACKEND_DIR / ".env", override=True)

from multi_agent_system import get_llm, run_recipe_workflow

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------------------------


class RecipeRequest(BaseModel):
    """Request body for recipe generation."""

    ingredients: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="Comma-separated list of available ingredients",
        examples=["tomato, onion, paneer, garlic"],
    )
    cuisine: str = Field(
        default="Indian",
        description="Preferred cuisine type",
        examples=["Indian"],
    )
    diet: str = Field(
        default="Vegetarian",
        description="Dietary preference",
        examples=["Vegetarian"],
    )
    cooking_time: str = Field(
        default="30",
        description="Maximum cooking time in minutes",
        examples=["30"],
    )

    @field_validator("ingredients")
    @classmethod
    def validate_ingredients(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Ingredients cannot be empty")
        return cleaned

    @field_validator("cuisine", "diet")
    @classmethod
    def validate_non_empty_strings(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Field cannot be empty")
        return cleaned


class NutritionInfo(BaseModel):
    """Nutritional estimate per serving."""

    calories: float = 0
    protein: float = 0
    carbs: float = 0
    fat: float = 0
    fiber: float = 0
    sodium: float = 0
    serving_size: str = "1 serving"
    notes: str = ""


class RecipeResponse(BaseModel):
    """Structured recipe response from the multi-agent pipeline."""

    recipe_name: str = ""
    description: str = ""
    ingredients: list[str] = Field(default_factory=list)
    missing_ingredients: list[str] = Field(default_factory=list)
    missing_ingredient_suggestions: list[str] = Field(default_factory=list)
    shopping_list: list[str] = Field(default_factory=list)
    nutrition: NutritionInfo = Field(default_factory=NutritionInfo)
    instructions: list[str] = Field(default_factory=list)
    tips: list[str] = Field(default_factory=list)
    serving_suggestions: list[str] = Field(default_factory=list)
    error: str | None = None


class HealthResponse(BaseModel):
    """Health check response."""

    status: str
    service: str
    version: str


# ---------------------------------------------------------------------------
# Application Setup
# ---------------------------------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    logger.info("RecipeGenAI backend starting up")
    try:
        get_llm()
        logger.info("Groq API key loaded successfully")
    except ValueError as exc:
        logger.error("Groq API key check failed: %s", exc)
    yield
    logger.info("RecipeGenAI backend shutting down")


app = FastAPI(
    title="RecipeGenAI API",
    description="Multi-Agent Recipe Recommendation System powered by LangGraph and Groq",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check() -> HealthResponse:
    """Return service health status."""
    return HealthResponse(
        status="healthy",
        service="RecipeGenAI",
        version="1.0.0",
    )


@app.post(
    "/generate-recipe",
    response_model=RecipeResponse,
    tags=["Recipe"],
    summary="Generate a personalized recipe",
    description="Runs the 4-agent LangGraph pipeline to create a recipe recommendation.",
)
async def generate_recipe(request: RecipeRequest) -> RecipeResponse:
    """
    Generate a personalized recipe using the multi-agent LangGraph workflow.

    Agents: Ingredient Analyzer -> Recipe Finder -> Nutrition -> Cooking Instruction
    """
    logger.info(
        "Recipe request: cuisine=%s, diet=%s, time=%s min",
        request.cuisine,
        request.diet,
        request.cooking_time,
    )

    try:
        result: dict[str, Any] = run_recipe_workflow(
            ingredients=request.ingredients,
            cuisine=request.cuisine,
            diet=request.diet,
            cooking_time=request.cooking_time,
        )
    except ValueError as exc:
        logger.error("Configuration error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        logger.exception("Recipe generation failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Recipe generation failed: {exc}",
        ) from exc

    if result.get("error"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=result["error"],
        )

    nutrition_data = result.get("nutrition", {})
    return RecipeResponse(
        recipe_name=result.get("recipe_name", ""),
        description=result.get("description", ""),
        ingredients=result.get("ingredients", []),
        missing_ingredients=result.get("missing_ingredients", []),
        missing_ingredient_suggestions=result.get(
            "missing_ingredient_suggestions", []
        ),
        shopping_list=result.get("shopping_list", []),
        nutrition=NutritionInfo(**nutrition_data),
        instructions=result.get("instructions", []),
        tips=result.get("tips", []),
        serving_suggestions=result.get("serving_suggestions", []),
    )


@app.get("/", tags=["Root"])
async def root() -> dict[str, str]:
    """API root with documentation link."""
    return {
        "message": "Welcome to RecipeGenAI API",
        "docs": "/docs",
        "health": "/health",
    }


def run_server() -> None:
    """Start the FastAPI development server."""
    import uvicorn

    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "8000"))
    reload = os.getenv("RELOAD", "true").lower() in ("1", "true", "yes")

    logger.info("Starting RecipeGenAI server at http://%s:%s", host, port)
    uvicorn.run("app:app", host=host, port=port, reload=reload)


if __name__ == "__main__":
    run_server()
