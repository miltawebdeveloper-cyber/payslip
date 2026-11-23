import apiClient from './client.js';

export async function fetchSalaryData(params) {
  const { data } = await apiClient.get('/salary-data', { params });
  return data;
}

export async function createSalaryRow(payload) {
  const { data } = await apiClient.post('/salary-data', payload);
  return data;
}

export async function updateSalaryRow(id, payload) {
  const { data } = await apiClient.put(`/salary-data/${encodeURIComponent(id)}`, payload);
  return data;
}

export async function deleteSalaryRow(id) {
  await apiClient.delete(`/salary-data/${encodeURIComponent(id)}`);
}

// `selection` is either { ids: [...] } or { allMatching: true, filters: {...} }.
export async function fetchSelectionSummary(selection) {
  const { data } = await apiClient.post('/salary-data/selection-summary', selection);
  return data;
}

export async function bulkDeleteSalaryRows(selection) {
  const { data } = await apiClient.post('/salary-data/bulk-delete', selection);
  return data;
}

export async function lookupEmployeeById(employeeId) {
  try {
    const { data } = await apiClient.get(`/salary-data/employee/${encodeURIComponent(employeeId)}`);
    return data;
  } catch (err) {
    if (err.response?.status === 404) return null;
    throw err;
  }
}

export async function importSalaryExcel(file) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.post('/salary-data/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function downloadSalaryTemplate() {
  const response = await apiClient.get('/salary-data/template', { responseType: 'blob' });
  return response.data;
}
