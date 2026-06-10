export default function LoadingSpinner({ message = 'Generating your recipe...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="relative w-20 h-20 mb-6">
        <div className="absolute inset-0 rounded-full border-4 border-brand-200" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-brand-500 animate-spin-slow" />
        <div className="absolute inset-3 rounded-full bg-brand-100 animate-pulse-ring flex items-center justify-center text-2xl">
          🍳
        </div>
      </div>
      <p className="text-lg font-medium text-ink">{message}</p>
      <p className="text-sm text-muted mt-2 text-center max-w-sm">
        Our 4 AI agents are collaborating: analyzing ingredients, finding recipes,
        estimating nutrition, and writing instructions...
      </p>
      <div className="flex gap-2 mt-6">
        {['Analyzer', 'Finder', 'Nutrition', 'Chef'].map((agent, i) => (
          <span
            key={agent}
            className="px-3 py-1 text-xs rounded-full bg-brand-100 text-brand-700 font-medium"
            style={{ animationDelay: `${i * 0.3}s` }}
          >
            {agent}
          </span>
        ))}
      </div>
    </div>
  )
}
