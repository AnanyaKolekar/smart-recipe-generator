import { useEffect, useRef, useState } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { translateRecipeContent } from '../services/api'
import NutritionCard from './NutritionCard'
import RecipeImage from './RecipeImage'
import VoiceCookingAgent from './VoiceCookingAgent'

function ListSection({ title, items, icon, variant = 'default' }) {
  if (!items?.length) return null

  const styles = {
    default: 'bg-stone-50 border-stone-200',
    warning: 'bg-amber-50 border-amber-200',
    info: 'bg-blue-50 border-blue-200',
  }

  return (
    <div className={`rounded-xl border p-5 ${styles[variant]}`}>
      <h3 className="font-semibold text-ink mb-3 flex items-center gap-2">
        <span>{icon}</span> {title}
      </h3>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-stone-700 flex items-start gap-2">
            <span className="text-brand-500 mt-0.5">•</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function RecipeResult({ recipe, onSave, onDownload, isSaved }) {
  const { t } = useLanguage()
  const [activeStep, setActiveStep] = useState(-1)
  const [viewLang, setViewLang] = useState(recipe?.language || 'en')
  const [translating, setTranslating] = useState(false)
  const [displayRecipe, setDisplayRecipe] = useState(recipe)
  const cacheRef = useRef({})

  const originalLang = recipe?.language || 'en'

  const loadLanguage = async (lang) => {
    if (!recipe) return

    if (lang === originalLang) {
      setDisplayRecipe(recipe)
      return
    }

    if (cacheRef.current[lang]) {
      setDisplayRecipe({
        ...recipe,
        ...cacheRef.current[lang],
        nutrition: cacheRef.current[lang].nutrition ?? recipe.nutrition,
        language: lang,
      })
      return
    }

    setTranslating(true)
    try {
      const translated = await translateRecipeContent({
        recipe_name: recipe.recipe_name,
        description: recipe.description,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        tips: recipe.tips,
        serving_suggestions: recipe.serving_suggestions,
        nutrition_serving_size: recipe.nutrition?.serving_size || '',
        nutrition_notes: recipe.nutrition?.notes || '',
        source_language: originalLang,
        target_language: lang,
      })
      const nutrition = {
        ...recipe.nutrition,
        serving_size:
          translated.nutrition_serving_size || recipe.nutrition?.serving_size || '',
        notes: translated.nutrition_notes || recipe.nutrition?.notes || '',
      }
      const merged = { ...translated, nutrition, language: lang }
      cacheRef.current[lang] = merged
      setDisplayRecipe({ ...recipe, ...merged })
    } catch {
      setDisplayRecipe(recipe)
    } finally {
      setTranslating(false)
    }
  }

  useEffect(() => {
    if (!recipe) return
    const lang = recipe.language || 'en'
    setViewLang(lang)
    cacheRef.current = {}
    setDisplayRecipe(recipe)
    setActiveStep(-1)
  }, [recipe])

  const handleViewLangChange = async (lang) => {
    setViewLang(lang)
    setActiveStep(-1)
    await loadLanguage(lang)
  }

  if (!recipe || !displayRecipe) return null

  return (
    <div className="space-y-6 animate-in fade-in">
      <RecipeImage imageUrl={recipe.image_url} recipeName={displayRecipe.recipe_name} />

      <div className="bg-gradient-to-br from-brand-500 to-brand-700 rounded-2xl p-6 sm:p-8 text-white shadow-xl shadow-brand-200">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <p className="text-brand-100 text-sm font-medium mb-1">
              {t('yourRecipe')}
              {recipe.personalized && (
                <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                  ✨ {t('personalized')}
                </span>
              )}
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold">
              {displayRecipe.recipe_name}
            </h2>
            <p className="text-brand-50 mt-3 leading-relaxed max-w-2xl">
              {displayRecipe.description}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={onSave}
              disabled={isSaved}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium backdrop-blur transition disabled:opacity-60"
            >
              {isSaved ? `❤️ ${t('savedLabel')}` : `🤍 ${t('save')}`}
            </button>
            <button
              type="button"
              onClick={onDownload}
              className="px-4 py-2 bg-white text-brand-700 hover:bg-brand-50 rounded-lg text-sm font-medium transition"
            >
              📄 {t('pdf')}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ListSection
          title={t('ingredientsList')}
          items={displayRecipe.ingredients}
          icon="🥗"
        />
        <ListSection
          title={t('missingIngredients')}
          items={recipe.missing_ingredients}
          icon="⚠️"
          variant="warning"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ListSection
          title={t('suggestions')}
          items={recipe.missing_ingredient_suggestions}
          icon="💡"
          variant="info"
        />
        <ListSection title={t('shoppingList')} items={recipe.shopping_list} icon="🛒" />
      </div>

      <NutritionCard nutrition={displayRecipe.nutrition ?? recipe.nutrition} />

      {displayRecipe.instructions?.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-5">
          <h3 className="font-display text-lg font-semibold text-ink flex items-center gap-2">
            <span>👨‍🍳</span> {t('instructions')}
          </h3>

          <VoiceCookingAgent
            recipeName={displayRecipe.recipe_name}
            instructions={displayRecipe.instructions}
            voiceLang={viewLang}
            onVoiceLangChange={handleViewLangChange}
            translating={translating}
            onStepChange={setActiveStep}
          />

          {translating && (
            <p className="text-sm text-violet-600 flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin-slow" />
              {t('translating')}
            </p>
          )}

          <ol className="space-y-4">
            {displayRecipe.instructions.map((step, i) => (
              <li
                key={i}
                className={`flex gap-4 rounded-xl p-2 transition-colors ${
                  activeStep === i ? 'bg-violet-50 ring-2 ring-violet-200' : ''
                }`}
              >
                <span
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    activeStep === i
                      ? 'bg-violet-500 text-white'
                      : 'bg-brand-100 text-brand-700'
                  }`}
                >
                  {i + 1}
                </span>
                <p className="text-stone-700 pt-1 leading-relaxed">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ListSection title={t('tips')} items={displayRecipe.tips} icon="💡" variant="info" />
        <ListSection
          title={t('serving')}
          items={displayRecipe.serving_suggestions}
          icon="🍽️"
        />
      </div>
    </div>
  )
}
