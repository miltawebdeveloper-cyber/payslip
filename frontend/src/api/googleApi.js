import apiClient from './client.js';

export async function fetchGoogleStatus() {
  const { data } = await apiClient.get('/google/status');
  return data;
}

export async function fetchOAuthUrl() {
  const { data } = await apiClient.get('/google/auth-url');
  return data;
}
