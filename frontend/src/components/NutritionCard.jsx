export default function NutritionCard({ nutrition }) {
  const items = [
    { label: 'Calories', value: nutrition?.calories, unit: 'kcal', icon: '🔥', color: 'bg-orange-50 text-orange-700' },
    { label: 'Protein', value: nutrition?.protein, unit: 'g', icon: '💪', color: 'bg-blue-50 text-blue-700' },
    { label: 'Carbs', value: nutrition?.carbs, unit: 'g', icon: '🌾', color: 'bg-amber-50 text-amber-700' },
    { label: 'Fat', value: nutrition?.fat, unit: 'g', icon: '🥑', color: 'bg-green-50 text-green-700' },
  ]

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
      <h3 className="font-display text-lg font-semibold text-ink mb-1">Nutrition</h3>
      <p className="text-xs text-muted mb-4">
        Per serving{nutrition?.serving_size ? ` (${nutrition.serving_size})` : ''}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {items.map((item) => (
          <div
            key={item.label}
            className={`rounded-xl p-4 text-center ${item.color}`}
          >
            <div className="text-xl mb-1">{item.icon}</div>
            <div className="text-2xl font-bold">
              {item.value ?? '—'}
              <span className="text-sm font-normal ml-0.5">{item.unit}</span>
            </div>
            <div className="text-xs font-medium mt-1 opacity-80">{item.label}</div>
          </div>
        ))}
      </div>
      {nutrition?.notes && (
        <p className="text-xs text-muted mt-4 italic">{nutrition.notes}</p>
      )}
    </div>
  )
}
