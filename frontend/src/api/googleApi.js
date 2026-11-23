import apiClient from './client.js';

export async function fetchGoogleStatus() {
  const { data } = await apiClient.get('/google/status');
  return data;
}

export async function syncGoogleSheet() {
  const { data } = await apiClient.post('/google/sync-sheet');
  return data;
}

export async function fetchOAuthUrl() {
  const { data } = await apiClient.get('/google/auth-url');
  return data;
}
