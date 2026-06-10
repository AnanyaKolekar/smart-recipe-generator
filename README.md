# RecipeGenAI — Multi-Agent Recipe Recommendation System

A production-ready, end-to-end AI application where **4 specialized agents** collaborate via **LangGraph** to generate personalized recipes from your available ingredients and preferences.

---

## Project Overview

RecipeGenAI accepts user ingredients, cuisine preference, dietary restrictions, and cooking time — then orchestrates a sequential multi-agent pipeline powered by **Groq** to deliver:

- Personalized recipe recommendation
- Full ingredients list and missing ingredients
- Nutrition estimates (calories, protein, carbs, fat)
- Step-by-step cooking instructions
- Cooking tips and serving suggestions
- Shopping list and ingredient substitution suggestions

---

## Architecture

```mermaid
flowchart TB
    subgraph Frontend["React Frontend (Vite + Tailwind)"]
        UI[RecipeGenAI UI]
        API_CLIENT[Axios API Client]
        STORAGE[Local Storage]
        PDF[jsPDF Export]
    end

    subgraph Backend["FastAPI Backend"]
        ENDPOINT[POST /generate-recipe]
        MAS[multi_agent_system.py]
    end

    subgraph LangGraph["LangGraph Workflow"]
        START((START))
        A1[Ingredient Analyzer Agent]
        A2[Recipe Finder Agent]
        A3[Nutrition Agent]
        A4[Cooking Instruction Agent]
        BUILD[Build Final Response]
        END_NODE((END))
    end

    subgraph External["External Services"]
        GROQ[Groq API]
    end

    UI --> API_CLIENT
    API_CLIENT --> ENDPOINT
    ENDPOINT --> MAS
    MAS --> START
    START --> A1 --> A2 --> A3 --> A4 --> BUILD --> END_NODE
    A1 & A2 & A3 & A4 --> GROQ
    UI --> STORAGE
    UI --> PDF
```

---

## Multi-Agent Workflow

| Agent | Responsibility | Input | Output |
|-------|---------------|-------|--------|
| **1. Ingredient Analyzer** | Analyze ingredients, categories, recipe opportunities | `ingredients` | `ingredient_analysis` |
| **2. Recipe Finder** | Match cuisine/diet, select best recipe, find missing items | `ingredient_analysis` | `recipe_name`, `required_ingredients`, `missing_ingredients` |
| **3. Nutrition Agent** | Estimate macros and calories | Recipe data | `nutrition` |
| **4. Cooking Instruction** | Generate steps, tips, serving ideas | Recipe data | `instructions`, `tips`, `serving_suggestions` |

All agents share a common **`RecipeState`** TypedDict managed by LangGraph `StateGraph`.

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **AI / Orchestration** | LangChain, LangGraph, Groq |
| **Backend** | Python, FastAPI, Pydantic, Uvicorn |
| **Frontend** | React, Vite, Axios, Tailwind CSS |
| **Bonus** | LocalStorage, jsPDF |

---

## Project Structure

```
Recipe-Multi-Agent/
├── README.md
├── backend/
│   ├── app.py                    # FastAPI application
│   ├── multi_agent_system.py     # Complete LangGraph implementation
│   ├── requirements.txt
│   ├── .env.example
│   └── README.md
└── frontend/
    ├── src/
    │   ├── components/           # UI components
    │   ├── pages/                # Page views
    │   ├── services/             # API, storage, PDF
    │   └── App.jsx
    ├── package.json
    ├── .env.example
    └── README.md
```

---

## Installation

### Prerequisites

- Python 3.10+
- Node.js 18+
- Groq API key ([Get one here](https://console.groq.com/keys))

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env` and set your API key:

```env
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
```

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env              # optional
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | Yes | Groq API key |
| `GROQ_MODEL` | No | Model name (default: `llama-3.3-70b-versatile`) |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | No | Backend URL (default: `http://localhost:8000`) |

---

## Running the Application

### Start Backend

```bash
cd backend
source venv/bin/activate
python app.py
```

API: `http://localhost:8000` | Docs: `http://localhost:8000/docs`

### Start Frontend

```bash
cd frontend
npm run dev
```

App: `http://localhost:5173`

### CLI Mode (Assignment Requirement)

```bash
cd backend
python multi_agent_system.py
```

Interactive prompts for ingredients, cuisine, diet, and cooking time.

---

## API Reference

### `POST /generate-recipe`

**Request:**

```json
{
  "ingredients": "tomato,onion,paneer",
  "cuisine": "Indian",
  "diet": "Vegetarian",
  "cooking_time": "30"
}
```

**Response:**

```json
{
  "recipe_name": "Paneer Tikka Masala",
  "description": "...",
  "ingredients": ["..."],
  "missing_ingredients": ["..."],
  "missing_ingredient_suggestions": ["..."],
  "shopping_list": ["..."],
  "nutrition": {
    "calories": 350,
    "protein": 18,
    "carbs": 25,
    "fat": 20
  },
  "instructions": ["..."],
  "tips": ["..."],
  "serving_suggestions": ["..."]
}
```

---

## Bonus Features

| Feature | Implementation |
|---------|---------------|
| Missing Ingredient Suggestions | Recipe Finder Agent + UI display |
| Shopping List Generation | Recipe Finder Agent + dedicated UI section |
| Save Recipe | LocalStorage persistence |
| Recipe History | LocalStorage with history tab |
| Download PDF | jsPDF client-side export |

---

## Future Enhancements

- User authentication and cloud recipe storage
- Image generation for recipes
- Voice input for ingredients
- Multi-language support
- Ingredient barcode scanning
- Meal planning calendar
- Integration with grocery delivery APIs
- Agent memory for personalized preferences
- Parallel agent execution for faster responses
- Recipe rating and feedback loop

---

