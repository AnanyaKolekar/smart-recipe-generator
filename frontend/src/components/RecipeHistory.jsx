export default function RecipeHistory({ recipes, onSelect, onRemove, onClear, title, emptyMessage }) {
  if (!recipes?.length) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center shadow-sm">
        <div className="text-4xl mb-3">📭</div>
        <p className="text-muted">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Clear All
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {recipes.map((recipe) => (
          <div
            key={recipe.id}
            className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm hover:shadow-md hover:border-brand-200 transition cursor-pointer group"
            onClick={() => onSelect(recipe)}
            onKeyDown={(e) => e.key === 'Enter' && onSelect(recipe)}
            role="button"
            tabIndex={0}
          >
            <div className="flex justify-between items-start gap-2">
              <div>
                <h3 className="font-semibold text-ink group-hover:text-brand-700 transition">
                  {recipe.recipe_name}
                </h3>
                <p className="text-sm text-muted mt-1 line-clamp-2">
                  {recipe.description}
                </p>
                <p className="text-xs text-stone-400 mt-2">
                  {new Date(recipe.savedAt || recipe.generatedAt).toLocaleString()}
                </p>
              </div>
              {onRemove && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemove(recipe.id)
                  }}
                  className="text-stone-400 hover:text-red-500 p-1"
                  aria-label="Remove"
                >
                  ✕
                </button>
              )}
            </div>
            {recipe.nutrition && (
              <div className="flex gap-3 mt-3 text-xs text-muted">
                <span>🔥 {recipe.nutrition.calories} kcal</span>
                <span>💪 {recipe.nutrition.protein}g</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
