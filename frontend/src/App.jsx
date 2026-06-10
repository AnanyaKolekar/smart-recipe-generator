import { useState } from 'react'
import Header from './components/Header'
import HomePage from './pages/HomePage'

export default function App() {
  const [activeTab, setActiveTab] = useState('generate')

  return (
    <div className="min-h-screen">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <HomePage activeTab={activeTab} onTabChange={setActiveTab} />
      </main>

      <footer className="border-t border-stone-200 bg-white/50 mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 text-center text-sm text-muted">
          <p>
            RecipeGenAI — Multi-Agent System powered by LangGraph &amp; Groq
          </p>
          <p className="mt-1 text-xs">
            4 Agents: Ingredient Analyzer → Recipe Finder → Nutrition → Cooking Instruction
          </p>
        </div>
      </footer>
    </div>
  )
}
