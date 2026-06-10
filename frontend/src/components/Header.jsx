import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import AuthModal from './AuthModal'

export default function Header({ activeTab, onTabChange }) {
  const { t } = useLanguage()
  const { user, isAuthenticated, logout } = useAuth()
  const [authOpen, setAuthOpen] = useState(false)

  const tabs = [
    { id: 'generate', label: t('generate'), icon: '✨' },
    { id: 'saved', label: t('saved'), icon: '❤️' },
    { id: 'history', label: t('history'), icon: '📋' },
  ]

  return (
    <>
      <header className="bg-white/80 backdrop-blur-md border-b border-stone-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-xl shadow-lg shadow-brand-200">
                🍽️
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold text-ink tracking-tight">
                  RecipeGenAI
                </h1>
                <p className="text-xs text-muted">{t('tagline')}</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <nav className="flex gap-1 bg-stone-100 p-1 rounded-xl">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => onTabChange(tab.id)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeTab === tab.id
                        ? 'bg-white text-brand-700 shadow-sm'
                        : 'text-muted hover:text-ink'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </nav>

              <div className="flex items-center gap-2">
                {isAuthenticated ? (
                  <>
                    <span className="text-sm text-muted hidden sm:inline">
                      {t('welcome')}, <strong className="text-ink">{user?.username}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={logout}
                      className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-red-600 border border-stone-200 rounded-lg hover:border-red-200 transition"
                    >
                      {t('logout')}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAuthOpen(true)}
                    className="px-4 py-2 text-sm font-medium bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition"
                  >
                    {t('login')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  )
}
