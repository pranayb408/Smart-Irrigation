import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const client = axios.create({ baseURL: API_BASE, timeout: 15000 });

function explainError(error) {
  if (error.response?.data?.detail) {
    const detail = error.response.data.detail;
    return typeof detail === 'string' ? detail : JSON.stringify(detail);
  }
  if (error.code === 'ECONNABORTED') return 'The API took too long to respond. Is the backend running?';
  if (error.code === 'ERR_NETWORK') return `Cannot connect to the API at ${API_BASE}. Start the FastAPI server in a separate terminal.`;
  return error.message || 'An unexpected API error occurred.';
}

async function request(promise) {
  try {
    const response = await promise;
    return response.data;
  } catch (error) {
    throw new Error(explainError(error));
  }
}

export const api = {
  // System
  health: () => request(client.get('/api/health')),
  dashboard: () => request(client.get('/api/dashboard')),
  analytics: () => request(client.get('/api/analytics')),
  modelMetrics: () => request(client.get('/api/model-metrics')),

  // Fields & Farm Setup
  fields: () => request(client.get('/api/fields')),
  field: (id) => request(client.get(`/api/fields/${id}`)),
  createField: (payload) => request(client.post('/api/fields', payload)),
  updateField: (id, payload) => request(client.put(`/api/fields/${id}`, payload)),
  deleteField: (id) => request(client.delete(`/api/fields/${id}`)),

  // Sensors & IoT
  readings: (limit = 100, fieldName = null, fieldId = null) =>
    request(client.get('/api/readings', { params: { limit, field_name: fieldName, field_id: fieldId } })),
  addReading: (payload) => request(client.post('/api/readings', payload)),
  iotDevices: () => request(client.get('/api/sensors/devices')),
  simulateReading: (fieldId = null) =>
    request(client.post('/api/sensors/simulate', null, { params: { field_id: fieldId } })),
  ingestESP32: (payload) => request(client.post('/api/sensors/ingest', payload)),

  // Predictions & Decision Support
  predict: (payload) => request(client.post('/api/predict', payload)),
  predictions: (limit = 100, fieldId = null) =>
    request(client.get('/api/predictions', { params: { limit, field_id: fieldId } })),

  // Water Conservation Budget & Logs
  waterBudget: (fieldId = null) => request(client.get('/api/water-budget', { params: { field_id: fieldId } })),
  irrigationLogs: (limit = 100, fieldId = null) =>
    request(client.get('/api/irrigation-logs', { params: { limit, field_id: fieldId } })),
  logIrrigation: (payload) => request(client.post('/api/irrigation-logs', payload)),
};

export { API_BASE };
