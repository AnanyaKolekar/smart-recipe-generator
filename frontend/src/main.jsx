import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { setAuthToken } from './services/api'

const savedToken = localStorage.getItem('recipegenai_token')
if (savedToken) setAuthToken(savedToken)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
