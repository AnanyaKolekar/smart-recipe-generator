import { useState } from 'react'
import RecipeForm from '../components/RecipeForm'
import RecipeResult from '../components/RecipeResult'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorAlert from '../components/ErrorAlert'
import RecipeHistory from '../components/RecipeHistory'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
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

export default function HomePage({ activeTab, onTabChange }) {
  const { t, language } = useLanguage()
  const { token, refreshMemory } = useAuth()

  const [formData, setFormData] = useState({
    ingredients: '',
    cuisine: 'South Indian',
    diet: 'Vegetarian',
    cooking_time: '30',
    language,
  })
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
      const payload = { ...formData, language }
      const result = await generateRecipe(payload, token)
      setRecipe(result)
      addToHistory(result)
      setHistory(getRecipeHistory())
      if (token) refreshMemory()
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
        title={t('savedRecipes')}
        emptyMessage={t('savedEmpty')}
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
        title={t('historyTitle')}
        emptyMessage={t('historyEmpty')}
        onSelect={handleSelectRecipe}
        onClear={() => {
          clearHistory()
          setHistory([])
        }}
        clearLabel={t('clearAll')}
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

      <ErrorAlert message={error} onDismiss={() => setError(null)} title={t('errorTitle')} />

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
