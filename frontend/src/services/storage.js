const SAVED_RECIPES_KEY = 'recipegenai_saved_recipes'
const HISTORY_KEY = 'recipegenai_history'

/**
 * @returns {Array<object>}
 */
export function getSavedRecipes() {
  try {
    return JSON.parse(localStorage.getItem(SAVED_RECIPES_KEY) || '[]')
  } catch {
    return []
  }
}

/**
 * @param {object} recipe
 */
export function saveRecipe(recipe) {
  const saved = getSavedRecipes()
  const entry = {
    ...recipe,
    savedAt: new Date().toISOString(),
    id: crypto.randomUUID(),
  }
  const exists = saved.some((r) => r.recipe_name === recipe.recipe_name)
  if (!exists) {
    saved.unshift(entry)
    localStorage.setItem(SAVED_RECIPES_KEY, JSON.stringify(saved.slice(0, 50)))
  }
  return entry
}

/**
 * @param {string} id
 */
export function removeSavedRecipe(id) {
  const saved = getSavedRecipes().filter((r) => r.id !== id)
  localStorage.setItem(SAVED_RECIPES_KEY, JSON.stringify(saved))
}

/**
 * @returns {Array<object>}
 */
export function getRecipeHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
  } catch {
    return []
  }
}

/**
 * @param {object} recipe
 */
export function addToHistory(recipe) {
  const history = getRecipeHistory()
  const entry = {
    ...recipe,
    generatedAt: new Date().toISOString(),
    id: crypto.randomUUID(),
  }
  history.unshift(entry)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 30)))
}

/**
 * Clear all recipe history.
 */
export function clearHistory() {
  localStorage.removeItem(HISTORY_KEY)
}
