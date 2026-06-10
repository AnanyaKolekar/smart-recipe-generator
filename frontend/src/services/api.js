import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 120000,
})

export function setAuthToken(token) {
  if (token) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`
  } else {
    delete apiClient.defaults.headers.common.Authorization
  }
}

export async function registerUser(payload) {
  const response = await apiClient.post('/auth/register', payload)
  return response.data
}

export async function loginUser(payload) {
  const response = await apiClient.post('/auth/login', payload)
  return response.data
}

export async function getMemory(token) {
  const response = await apiClient.get('/auth/memory', {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.data
}

/**
 * @param {object} payload
 * @param {string|null} token
 */
export async function generateRecipe(payload, token = null) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {}
  const response = await apiClient.post('/generate-recipe', payload, { headers })
  return response.data
}

export async function checkHealth() {
  const response = await apiClient.get('/health')
  return response.data
}

export default apiClient
