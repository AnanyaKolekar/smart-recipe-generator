# RecipeGenAI Backend

FastAPI backend with LangGraph multi-agent pipeline powered by Groq.

## Quick Start

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Set GROQ_API_KEY and JWT_SECRET_KEY in .env
python app.py
```

API: `http://localhost:8000` | Docs: `http://localhost:8000/docs`

## Workflow (v2.0)

```
START → Ingredient Analyzer → Recipe Finder
     → Parallel (Nutrition + Cooking Instruction + Image)
     → Build Response → END
```

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | No | Register user |
| POST | `/auth/login` | No | Login, get JWT |
| GET | `/auth/me` | Yes | Current user |
| GET | `/auth/memory` | Yes | Agent memory preferences |
| POST | `/generate-recipe` | Optional | Run multi-agent pipeline |
| GET | `/health` | No | Health check |

## CLI Mode

```bash
python multi_agent_system.py
```
