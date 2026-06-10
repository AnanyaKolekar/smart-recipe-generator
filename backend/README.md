# RecipeGenAI Backend

FastAPI backend with a LangGraph multi-agent recipe recommendation pipeline powered by Groq.

## Quick Start

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env and set GROQ_API_KEY
python app.py
```

API runs at `http://localhost:8000`. Interactive docs: `http://localhost:8000/docs`.

## CLI Mode (Assignment)

```bash
python multi_agent_system.py
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/generate-recipe` | Run multi-agent pipeline |

## Multi-Agent Workflow

```
START → Ingredient Analyzer → Recipe Finder → Nutrition → Cooking Instruction → END
```

All agents share `RecipeState` via LangGraph `StateGraph`.
