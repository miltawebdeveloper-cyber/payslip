import apiClient from './client.js';

export async function fetchAvailableMonths() {
  const { data } = await apiClient.get('/payslip/months');
  return data;
}

export async function fetchEmployeesForMonth(month, year) {
  const { data } = await apiClient.get('/payslip/employees', { params: { month, year } });
  return data;
}

export async function fetchPayslipPreview(employeeId, month, year) {
  const { data } = await apiClient.get('/payslip/preview', { params: { employeeId, month, year } });
  return data;
}

// The same HTML the PDF is rendered from, for the browser's print dialog.
export async function fetchPayslipPrintHtml(employeeId, month, year) {
  const { data } = await apiClient.get('/payslip/print', {
    params: { employeeId, month, year },
    responseType: 'text',
  });
  return data;
}

function filenameFrom(response, fallback) {
  const disposition = response.headers['content-disposition'] || '';
  const match = disposition.match(/filename="(.+)"/);
  return match ? match[1] : fallback;
}

export async function generatePayslipPdf(employeeId, month, year) {
  const response = await apiClient.post(
    '/payslip/generate',
    { employeeId, month, year },
    { responseType: 'blob' }
  );
  return { blob: response.data, filename: filenameFrom(response, `Payslip_${employeeId}_${month}_${year}.pdf`) };
}

export async function generateAllPayslips(month, year) {
  const response = await apiClient.post(
    '/payslip/generate-all',
    { month, year },
    { responseType: 'blob' }
  );
  return { blob: response.data, filename: filenameFrom(response, `Payslips_${month}_${year}.zip`) };
}

// Requests made with responseType 'blob' or 'text' receive their JSON error
// bodies as a Blob or string too, so unwrap those before reading the message.
export async function getErrorMessage(err, fallback) {
  const data = err.response?.data;
  if (data instanceof Blob || typeof data === 'string') {
    try {
      const text = typeof data === 'string' ? data : await data.text();
      return JSON.parse(text).message || fallback;
    } catch {
      return fallback;
    }
  }
  return data?.message || fallback;
}
