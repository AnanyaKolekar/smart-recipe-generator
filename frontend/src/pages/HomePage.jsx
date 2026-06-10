import { useState } from 'react'
import RecipeForm from '../components/RecipeForm'
import RecipeResult from '../components/RecipeResult'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorAlert from '../components/ErrorAlert'
import RecipeHistory from '../components/RecipeHistory'
import { generateRecipe } from '../services/api'
import {
  saveRecipe,
  getSavedRecipes,
  removeSavedRecipe,
  getRecipeHistory,
  addToHistory,
  clearHistory,
} from '../services/storage'
import { downloadRecipePDF } from '../services/pdf'

const DEFAULT_FORM = {
  ingredients: '',
  cuisine: 'Indian',
  diet: 'Vegetarian',
  cooking_time: '30',
}

export default function HomePage({ activeTab, onTabChange }) {
  const [formData, setFormData] = useState(DEFAULT_FORM)
  const [recipe, setRecipe] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [savedRecipes, setSavedRecipes] = useState(getSavedRecipes)
  const [history, setHistory] = useState(getRecipeHistory)
  const [isSaved, setIsSaved] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    setRecipe(null)
    setIsSaved(false)

    try {
      const result = await generateRecipe(formData)
      setRecipe(result)
      addToHistory(result)
      setHistory(getRecipeHistory())
    } catch (err) {
      const detail =
        err.response?.data?.detail ||
        err.message ||
        'Failed to generate recipe. Please try again.'
      setError(typeof detail === 'string' ? detail : JSON.stringify(detail))
    } finally {
      setLoading(false)
    }
  }

  const handleSave = () => {
    if (!recipe) return
    saveRecipe(recipe)
    setSavedRecipes(getSavedRecipes())
    setIsSaved(true)
  }

  const handleDownload = () => {
    if (recipe) downloadRecipePDF(recipe)
  }

  const handleSelectRecipe = (selected) => {
    setRecipe(selected)
    setIsSaved(savedRecipes.some((r) => r.recipe_name === selected.recipe_name))
    onTabChange('generate')
  }

  if (activeTab === 'saved') {
    return (
      <RecipeHistory
        recipes={savedRecipes}
        title="Saved Recipes"
        emptyMessage="No saved recipes yet. Generate and save a recipe to see it here."
        onSelect={handleSelectRecipe}
        onRemove={(id) => {
          removeSavedRecipe(id)
          setSavedRecipes(getSavedRecipes())
        }}
      />
    )
  }

  if (activeTab === 'history') {
    return (
      <RecipeHistory
        recipes={history}
        title="Recipe History"
        emptyMessage="No recipe history yet. Your generated recipes will appear here."
        onSelect={handleSelectRecipe}
        onClear={() => {
          clearHistory()
          setHistory([])
        }}
      />
    )
  }

  return (
    <div className="space-y-8">
      <RecipeForm
        formData={formData}
        onChange={setFormData}
        onSubmit={handleGenerate}
        loading={loading}
      />

      <ErrorAlert message={error} onDismiss={() => setError(null)} />

      {loading && <LoadingSpinner />}

      {!loading && recipe && (
        <RecipeResult
          recipe={recipe}
          onSave={handleSave}
          onDownload={handleDownload}
          isSaved={isSaved}
        />
      )}
    </div>
  )
}
