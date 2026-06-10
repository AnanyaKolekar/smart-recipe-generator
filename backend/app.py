"""
RecipeGenAI FastAPI Backend
REST API for the multi-agent recipe recommendation system.
"""

from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Literal

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

_BACKEND_DIR = Path(__file__).resolve().parent
load_dotenv(_BACKEND_DIR / ".env", override=True)

from auth import (
    TokenResponse,
    UserLogin,
    UserRegister,
    UserResponse,
    authenticate_user,
    get_current_user,
    get_optional_user,
    register_user,
)
from database import init_db
from memory import get_user_memory, update_user_memory
from multi_agent_system import get_llm, run_recipe_workflow
from translate import translate_recipe_content

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
    cuisine: str = Field(default="Indian", examples=["Indian"])
    diet: str = Field(default="Vegetarian", examples=["Vegetarian"])
    cooking_time: str = Field(default="30", examples=["30"])
    language: Literal["en", "kn"] = Field(
        default="en",
        description="Response language: en (English) or kn (Kannada)",
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
    calories: float = 0
    protein: float = 0
    carbs: float = 0
    fat: float = 0
    fiber: float = 0
    sodium: float = 0
    serving_size: str = "1 serving"
    notes: str = ""


class UserMemoryResponse(BaseModel):
    preferred_cuisine: str = "Indian"
    preferred_diet: str = "Vegetarian"
    preferred_language: str = "en"
    favorite_ingredients: list[str] = Field(default_factory=list)
    recent_recipes: list[str] = Field(default_factory=list)
    generation_count: int = 0


class RecipeResponse(BaseModel):
    recipe_name: str = ""
    description: str = ""
    image_url: str = ""
    ingredients: list[str] = Field(default_factory=list)
    missing_ingredients: list[str] = Field(default_factory=list)
    missing_ingredient_suggestions: list[str] = Field(default_factory=list)
    shopping_list: list[str] = Field(default_factory=list)
    nutrition: NutritionInfo = Field(default_factory=NutritionInfo)
    instructions: list[str] = Field(default_factory=list)
    tips: list[str] = Field(default_factory=list)
    serving_suggestions: list[str] = Field(default_factory=list)
    language: str = "en"
    personalized: bool = False
    error: str | None = None


class TranslateRequest(BaseModel):
    recipe_name: str = ""
    description: str = ""
    ingredients: list[str] = Field(default_factory=list)
    instructions: list[str] = Field(default_factory=list)
    tips: list[str] = Field(default_factory=list)
    serving_suggestions: list[str] = Field(default_factory=list)
    source_language: Literal["en", "kn"] = "en"
    target_language: Literal["en", "kn"] = "kn"


class TranslateResponse(BaseModel):
    recipe_name: str = ""
    description: str = ""
    ingredients: list[str] = Field(default_factory=list)
    instructions: list[str] = Field(default_factory=list)
    tips: list[str] = Field(default_factory=list)
    serving_suggestions: list[str] = Field(default_factory=list)
    language: str = "en"


class HealthResponse(BaseModel):
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
    init_db()
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
    version="2.0.0",
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
# Auth Endpoints
# ---------------------------------------------------------------------------


@app.post("/auth/register", response_model=UserResponse, tags=["Auth"])
async def register(data: UserRegister) -> UserResponse:
    """Register a new user account."""
    return register_user(data)


@app.post("/auth/login", response_model=TokenResponse, tags=["Auth"])
async def login(data: UserLogin) -> TokenResponse:
    """Login and receive a JWT access token."""
    return authenticate_user(data)


@app.get("/auth/me", response_model=UserResponse, tags=["Auth"])
async def me(user: dict = Depends(get_current_user)) -> UserResponse:
    """Get the currently authenticated user."""
    return UserResponse(id=user["id"], username=user["username"], email=user["email"])


@app.get("/auth/memory", response_model=UserMemoryResponse, tags=["Auth"])
async def get_memory(user: dict = Depends(get_current_user)) -> UserMemoryResponse:
    """Get personalized agent memory for the authenticated user."""
    memory = get_user_memory(user["id"])
    return UserMemoryResponse(**memory)


# ---------------------------------------------------------------------------
# Recipe Endpoints
# ---------------------------------------------------------------------------


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check() -> HealthResponse:
    return HealthResponse(status="healthy", service="RecipeGenAI", version="2.0.0")


@app.post("/generate-recipe", response_model=RecipeResponse, tags=["Recipe"])
async def generate_recipe(
    request: RecipeRequest,
    user: dict | None = Depends(get_optional_user),
) -> RecipeResponse:
    """
    Generate a personalized recipe using the multi-agent LangGraph workflow.

    Workflow:
      Ingredient Analyzer -> Recipe Finder -> Parallel (Nutrition + Cooking + Image)

    When authenticated, agent memory personalizes recommendations.
    """
    user_memory = None
    if user:
        user_memory = get_user_memory(user["id"])
        logger.info("Using agent memory for user %s", user["username"])

    logger.info(
        "Recipe request: cuisine=%s, diet=%s, lang=%s, auth=%s",
        request.cuisine,
        request.diet,
        request.language,
        bool(user),
    )

    try:
        result: dict[str, Any] = run_recipe_workflow(
            ingredients=request.ingredients,
            cuisine=request.cuisine,
            diet=request.diet,
            cooking_time=request.cooking_time,
            language=request.language,
            user_memory=user_memory,
        )
    except ValueError as exc:
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

    if user:
        update_user_memory(
            user["id"],
            cuisine=request.cuisine,
            diet=request.diet,
            language=request.language,
            ingredients=request.ingredients,
            recipe_name=result.get("recipe_name", ""),
        )

    nutrition_data = result.get("nutrition", {})
    return RecipeResponse(
        recipe_name=result.get("recipe_name", ""),
        description=result.get("description", ""),
        image_url=result.get("image_url", ""),
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
        language=result.get("language", request.language),
        personalized=bool(user),
    )


@app.post("/translate-recipe", response_model=TranslateResponse, tags=["Recipe"])
async def translate_recipe(request: TranslateRequest) -> TranslateResponse:
    """Translate recipe text between English and Kannada for display and voice."""
    if request.source_language == request.target_language:
        return TranslateResponse(
            recipe_name=request.recipe_name,
            description=request.description,
            ingredients=request.ingredients,
            instructions=request.instructions,
            tips=request.tips,
            serving_suggestions=request.serving_suggestions,
            language=request.target_language,
        )

    try:
        result = translate_recipe_content(
            recipe_name=request.recipe_name,
            description=request.description,
            ingredients=request.ingredients,
            instructions=request.instructions,
            tips=request.tips,
            serving_suggestions=request.serving_suggestions,
            source_language=request.source_language,
            target_language=request.target_language,
        )
    except Exception as exc:
        logger.exception("Translation failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Translation failed: {exc}",
        ) from exc

    return TranslateResponse(**result, language=request.target_language)


@app.get("/", tags=["Root"])
async def root() -> dict[str, str]:
    return {
        "message": "Welcome to RecipeGenAI API",
        "docs": "/docs",
        "health": "/health",
        "version": "2.0.0",
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
