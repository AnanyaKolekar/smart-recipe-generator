export default function ErrorAlert({ message, onDismiss, title = 'Something went wrong' }) {
  if (!message) return null

  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
      <span className="text-red-500 text-xl">⚠️</span>
      <div className="flex-1">
        <p className="font-medium text-red-800">{title}</p>
        <p className="text-sm text-red-600 mt-1">{message}</p>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-red-400 hover:text-red-600"
          aria-label="Dismiss"
        >
          ✕
        </button>
      )}
    </div>
  )
}
