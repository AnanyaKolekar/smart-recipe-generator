import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 120000,
})

/**
 * Generate a personalized recipe via the multi-agent backend.
 * @param {{ ingredients: string, cuisine: string, diet: string, cooking_time: string }} payload
 */
export async function generateRecipe(payload) {
  const response = await apiClient.post('/generate-recipe', payload)
  return response.data
}

/**
 * Check backend health status.
 */
export async function checkHealth() {
  const response = await apiClient.get('/health')
  return response.data
}

export default apiClient
