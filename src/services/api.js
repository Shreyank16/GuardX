import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 8000,
  headers: { Accept: 'application/json' },
})

export function getApiBaseUrl() {
  return api.defaults.baseURL
}

export function describeError(error) {
  if (error?.response) {
    return `GuardX API returned HTTP ${error.response.status}.`
  }
  if (error?.code === 'ECONNABORTED') return 'GuardX API timed out.'
  return 'GuardX API is unreachable. No telemetry was substituted.'
}
