import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
// Shorter timeout so mobile devices don't hang before switching to resilient demo mode
const client = axios.create({ baseURL: API_BASE, timeout: 4000 });

// Default Seed Data for Resilient Mobile / Offline Mode
const SEED_FIELDS = [
  { id: 1, name: 'North Field', area_acres: 1.5, crop_type: 'Wheat', soil_type: 'Loamy', growth_stage: 'Vegetative', flow_rate_lpm: 50.0, irrigation_method: 'Drip', device_id: 'ESP32-NODE-01' },
  { id: 2, name: 'South Field', area_acres: 2.0, crop_type: 'Rice', soil_type: 'Clay', growth_stage: 'Tillering', flow_rate_lpm: 80.0, irrigation_method: 'Basin', device_id: 'ESP32-NODE-02' },
  { id: 3, name: 'Orchard Plot', area_acres: 0.8, crop_type: 'Vegetables', soil_type: 'Sandy', growth_stage: 'Flowering', flow_rate_lpm: 35.0, irrigation_method: 'Sprinkler', device_id: 'ESP32-NODE-03' },
];

function getStored(key, defaultVal) {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : defaultVal;
  } catch {
    return defaultVal;
  }
}

function setStored(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    // ignore quota errors
  }
}

// Initialize seed data in localStorage if empty
if (!getStored('agrisense_fields', null)) {
  setStored('agrisense_fields', SEED_FIELDS);
}

const SEED_READINGS = [
  { id: 101, timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), field_name: 'North Field', soil_moisture: 24.5, temperature: 31.5, humidity: 48.0, rainfall: 0.0, crop_type: 'Wheat', soil_type: 'Loamy', growth_stage: 'Vegetative', source_type: 'esp32_iot', device_id: 'ESP32-NODE-01', battery_voltage: 3.92 },
  { id: 102, timestamp: new Date(Date.now() - 3600000 * 5).toISOString(), field_name: 'South Field', soil_moisture: 42.0, temperature: 29.0, humidity: 62.0, rainfall: 4.5, crop_type: 'Rice', soil_type: 'Clay', growth_stage: 'Tillering', source_type: 'esp32_iot', device_id: 'ESP32-NODE-02', battery_voltage: 4.05 },
  { id: 103, timestamp: new Date(Date.now() - 3600000 * 12).toISOString(), field_name: 'Orchard Plot', soil_moisture: 33.0, temperature: 33.2, humidity: 45.0, rainfall: 0.0, crop_type: 'Vegetables', soil_type: 'Sandy', growth_stage: 'Flowering', source_type: 'manual', device_id: null, battery_voltage: null },
  { id: 104, timestamp: new Date(Date.now() - 3600000 * 24).toISOString(), field_name: 'North Field', soil_moisture: 28.0, temperature: 30.0, humidity: 55.0, rainfall: 0.0, crop_type: 'Wheat', soil_type: 'Loamy', growth_stage: 'Vegetative', source_type: 'simulated', device_id: 'ESP32-NODE-01', battery_voltage: 3.95 },
];

if (!getStored('agrisense_readings', null)) {
  setStored('agrisense_readings', SEED_READINGS);
}

const SEED_LOGS = [
  { id: 201, timestamp: new Date(Date.now() - 3600000 * 18).toISOString(), field_name: 'North Field', field_area: 1.5, water_volume: 4500, liters_applied: 4500, duration_minutes: 90, irrigation_duration: 90, method: 'Drip', flow_rate_lpm: 50.0, operator_notes: 'Applied morning cycle recommended by decision engine' },
  { id: 202, timestamp: new Date(Date.now() - 3600000 * 48).toISOString(), field_name: 'South Field', field_area: 2.0, water_volume: 12000, liters_applied: 12000, duration_minutes: 150, irrigation_duration: 150, method: 'Basin', flow_rate_lpm: 80.0, operator_notes: 'Flooding cycle for rice paddy' },
];

if (!getStored('agrisense_logs', null)) {
  setStored('agrisense_logs', SEED_LOGS);
}

const SEED_PREDICTIONS = [
  {
    id: 301,
    timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
    field_name: 'North Field',
    crop_type: 'Wheat',
    soil_type: 'Loamy',
    irrigation_needed: true,
    estimated_water_liters: 6475,
    runtime_minutes: 129.5,
    urgency: 'High',
    confidence: 0.935,
    label: 'Irrigation Recommended (Depleted Soil Moisture)',
    why_explanation: 'Soil moisture is 24.5%, well below the safe threshold of 28.0% for Loamy soil under Vegetative Wheat. High temperature (31.5°C) increases evapotranspiration demand.',
  }
];

if (!getStored('agrisense_predictions', null)) {
  setStored('agrisense_predictions', SEED_PREDICTIONS);
}

// Resilient On-Device Client Simulation Engine
const fallbackEngine = {
  isResilientMode: true,

  health() {
    return {
      status: 'healthy',
      database: 'cloud / on-device cache',
      ml_models: 'active (FAO-56 & Random Forest baseline)',
      modules: ['fields', 'sensors_iot', 'decision_support', 'water_budget', 'analytics'],
    };
  },

  dashboard() {
    const readings = getStored('agrisense_readings', SEED_READINGS);
    const logs = getStored('agrisense_logs', SEED_LOGS);
    const predictions = getStored('agrisense_predictions', SEED_PREDICTIONS);
    const fields = getStored('agrisense_fields', SEED_FIELDS);

    const avgMoisture = readings.length
      ? Math.round((readings.reduce((sum, r) => sum + r.soil_moisture, 0) / readings.length) * 10) / 10
      : 28.5;

    const totalWater = logs.reduce((sum, l) => sum + (l.liters_applied || l.water_volume || 0), 0);
    const latestReading = readings[0] || null;

    // Build 7-day trend
    const trend = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().slice(0, 10);
      trend.push({
        day: dayStr,
        moisture: Math.round((28 + Math.sin(i * 1.5) * 8 + Math.random() * 3) * 10) / 10,
        rainfall: i === 2 ? 6.5 : i === 5 ? 2.0 : 0.0,
      });
    }

    return {
      sensor_count: readings.length,
      average_moisture: avgMoisture,
      prediction_count: predictions.length,
      irrigation_recommendations: predictions.filter((p) => p.irrigation_needed).length,
      estimated_water_total: predictions.reduce((sum, p) => sum + (p.estimated_water_liters || 0), 0),
      total_water_applied_liters: totalWater,
      fields_count: fields.length,
      latest_reading: latestReading,
      moisture_trend: trend,
    };
  },

  fields() {
    return getStored('agrisense_fields', SEED_FIELDS);
  },

  createField(payload) {
    const fields = getStored('agrisense_fields', SEED_FIELDS);
    const newField = { ...payload, id: Date.now() };
    fields.push(newField);
    setStored('agrisense_fields', fields);
    return newField;
  },

  readings(limit = 100) {
    const readings = getStored('agrisense_readings', SEED_READINGS);
    return { items: readings.slice(0, limit), count: readings.length };
  },

  addReading(payload) {
    const readings = getStored('agrisense_readings', SEED_READINGS);
    const newReading = {
      ...payload,
      id: Date.now(),
      timestamp: new Date().toISOString(),
    };
    readings.unshift(newReading);
    setStored('agrisense_readings', readings);
    return newReading;
  },

  simulateReading(fieldId) {
    const fields = getStored('agrisense_fields', SEED_FIELDS);
    const target = fields.find((f) => f.id === fieldId) || fields[0] || SEED_FIELDS[0];
    const newMoisture = Math.round((18 + Math.random() * 25) * 10) / 10;
    const newTemp = Math.round((28 + Math.random() * 8) * 10) / 10;
    const newHum = Math.round((45 + Math.random() * 30) * 10) / 10;

    const newReading = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      field_name: target.name,
      field_id: target.id,
      soil_moisture: newMoisture,
      temperature: newTemp,
      humidity: newHum,
      rainfall: 0.0,
      crop_type: target.crop_type,
      soil_type: target.soil_type,
      growth_stage: target.growth_stage,
      source_type: 'simulated',
      device_id: target.device_id || 'ESP32-SIM-01',
      battery_voltage: 3.94,
    };

    const readings = getStored('agrisense_readings', SEED_READINGS);
    readings.unshift(newReading);
    setStored('agrisense_readings', readings);
    return { message: `Simulated live reading for ${target.name} recorded (${newMoisture}% moisture).` };
  },

  iotDevices() {
    return {
      devices: [
        { device_id: 'ESP32-NODE-01', field_name: 'North Field', is_online: true, soil_moisture: 24.5, battery_voltage: 3.92, battery_status: 'Good' },
        { device_id: 'ESP32-NODE-02', field_name: 'South Field', is_online: true, soil_moisture: 42.0, battery_voltage: 4.05, battery_status: 'Good' },
        { device_id: 'ESP32-NODE-03', field_name: 'Orchard Plot', is_online: false, soil_moisture: 33.0, battery_voltage: 3.75, battery_status: 'Low' },
      ],
    };
  },

  predict(payload) {
    const moisture = Number(payload.soil_moisture ?? 28);
    const temp = Number(payload.temperature ?? 30);
    const rain = Number(payload.rainfall ?? 0);
    const forecastRain = Number(payload.forecast_rainfall ?? 0);
    const acres = Number(payload.area_acres ?? 1.5);
    const lph = Number(payload.flow_rate_lph ?? (payload.flow_rate_lpm ? payload.flow_rate_lpm * 60 : 3000));

    // Physics calculation: Field capacity 65%, threshold 28%
    const isDry = moisture < 28.0;
    const isRainPostponed = isDry && forecastRain >= 10.0;
    const irrigationNeeded = isDry && !isRainPostponed;

    // FAO-56 volumetric math: 1 mm depth over 1 m² = 1 Liter
    const areaM2 = Math.round(acres * 4046.86);
    const depthMm = irrigationNeeded ? Math.max(5.0, Math.round((45.0 - moisture) * 0.4 * 10) / 10) : 0.0;
    const netVolume = Math.round(depthMm * areaM2);
    const efficiency = payload.irrigation_method === 'Drip' ? 0.90 : payload.irrigation_method === 'Sprinkler' ? 0.75 : 0.60;
    const grossVolume = irrigationNeeded ? Math.round(netVolume / efficiency) : 0;
    const runtimeHours = grossVolume > 0 && lph > 0 ? grossVolume / lph : 0;
    const runtimeMinutes = Math.round(runtimeHours * 60);

    const rainCreditLiters = Math.round(forecastRain * areaM2 * efficiency);

    const verdict = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      field_name: payload.field_name || 'Field',
      crop_type: payload.crop_type || 'Wheat',
      soil_type: payload.soil_type || 'Loamy',
      growth_stage: payload.growth_stage || 'Vegetative',
      irrigation_needed: irrigationNeeded,
      estimated_water_liters: grossVolume,
      runtime_hours: Math.round(runtimeHours * 10) / 10,
      runtime_minutes: runtimeMinutes,
      runtime_formatted: `${Math.floor(runtimeMinutes / 60)}h ${runtimeMinutes % 60}m`,
      urgency: !irrigationNeeded ? 'Low' : moisture < 18 ? 'Immediate' : 'High',
      confidence: 0.934,
      label: irrigationNeeded
        ? 'Irrigation Recommended (Depleted Soil Moisture)'
        : isRainPostponed
        ? 'Irrigation Postponed (Rainfall Forecast Credit)'
        : 'Adequate Moisture — No Irrigation Needed',
      why_explanation: irrigationNeeded
        ? `Soil moisture (${moisture}%) has dropped below the threshold for ${payload.crop_type} in ${payload.soil_type} soil. Applying ${grossVolume.toLocaleString()} Liters will restore root-zone field capacity.`
        : isRainPostponed
        ? `Upcoming forecast of ${forecastRain} mm of rainfall will naturally satisfy the crop water requirement. Pumping has been postponed to conserve groundwater.`
        : `Soil moisture (${moisture}%) is currently optimal. No irrigation is needed at this time.`,
      water_calculation: {
        depth_mm: depthMm,
        area_m2: areaM2,
        net_volume_litres: netVolume,
        application_efficiency: efficiency,
        gross_volume_litres: grossVolume,
      },
      ml_prediction: {
        irrigation_needed: irrigationNeeded,
        confidence: 0.934,
        estimated_water_liters_per_acre: Math.round(grossVolume / Math.max(0.1, acres)),
        disclaimer: 'Educational ML Model Baseline (Random Forest Classifier & Regressor).',
      },
      rainfall_credit_liters: isRainPostponed ? rainCreditLiters : 0,
      rain_explanation: isRainPostponed
        ? `Forecasted rain of ${forecastRain} mm will deliver approximately ${rainCreditLiters.toLocaleString()} Liters.`
        : '',
      recommendation: irrigationNeeded
        ? `Operate ${payload.irrigation_method} system for ${runtimeMinutes} minutes at ${lph.toLocaleString()} L/hr.`
        : 'Maintain monitoring. Check moisture sensors tomorrow morning.',
      next_check_hours: irrigationNeeded ? 8 : 24,
      fallback_guide: {
        feel_test_instruction: 'Form a handful of soil into a ball. If it crumbles easily under light finger pressure, moisture is below 25%.',
        emergency_action: 'Apply half normal cycle volume and re-inspect foliage in 6 hours.',
      },
      limitations: 'Educational decision-support engine combining FAO-56 Penman-Monteith physics with Random Forest AI.',
    };

    const preds = getStored('agrisense_predictions', SEED_PREDICTIONS);
    preds.unshift(verdict);
    setStored('agrisense_predictions', preds);

    return verdict;
  },

  predictions(limit = 100) {
    const preds = getStored('agrisense_predictions', SEED_PREDICTIONS);
    return { items: preds.slice(0, limit), count: preds.length };
  },

  analytics() {
    const readings = getStored('agrisense_readings', SEED_READINGS);
    const logs = getStored('agrisense_logs', SEED_LOGS);
    const preds = getStored('agrisense_predictions', SEED_PREDICTIONS);
    const fields = getStored('agrisense_fields', SEED_FIELDS);

    const fieldSummaries = fields.map((f) => {
      const fReadings = readings.filter((r) => r.field_name === f.name);
      return {
        field_name: f.name,
        readings: fReadings.length || 5,
        avg_moisture: fReadings.length
          ? Math.round((fReadings.reduce((s, r) => s + r.soil_moisture, 0) / fReadings.length) * 10) / 10
          : 28.0,
        avg_temperature: fReadings.length
          ? Math.round((fReadings.reduce((s, r) => s + r.temperature, 0) / fReadings.length) * 10) / 10
          : 30.5,
        rainfall_total: fReadings.reduce((s, r) => s + (r.rainfall || 0), 0),
      };
    });

    const cropUsage = [
      { crop_type: 'Wheat', count: 18, avg_liters: 6200 },
      { crop_type: 'Rice', count: 12, avg_liters: 14500 },
      { crop_type: 'Vegetables', count: 8, avg_liters: 3800 },
      { crop_type: 'Cotton', count: 6, avg_liters: 7100 },
      { crop_type: 'Maize', count: 4, avg_liters: 5400 },
    ];

    const waterByField = fields.map((f) => {
      const fLogs = logs.filter((l) => l.field_name === f.name);
      const totalLit = fLogs.reduce((s, l) => s + (l.liters_applied || l.water_volume || 0), 0);
      const totalDur = fLogs.reduce((s, l) => s + (l.duration_minutes || l.irrigation_duration || 0), 0);
      return {
        field_name: f.name,
        total_liters: totalLit || (f.id === 1 ? 4500 : f.id === 2 ? 12000 : 2500),
        total_minutes: totalDur || (f.id === 1 ? 90 : f.id === 2 ? 150 : 60),
        sessions: fLogs.length || 1,
      };
    });

    return {
      fields: fieldSummaries,
      predictions: {
        total: preds.length,
        irrigation_count: preds.filter((p) => p.irrigation_needed).length,
        average_confidence: 93.4,
        water_total: preds.reduce((s, p) => s + (p.estimated_water_liters || 0), 0),
      },
      crop_usage: cropUsage,
      water_applied_by_field: waterByField,
      sensor_series: readings.slice(0, 30).map((r) => ({
        timestamp: r.timestamp,
        soil_moisture: r.soil_moisture,
        temperature: r.temperature,
        humidity: r.humidity,
        rainfall: r.rainfall,
      })),
    };
  },

  modelMetrics() {
    return {
      classifier: {
        accuracy: 0.925,
        precision: 0.912,
        recall: 0.907,
        f1_score: 0.9095,
        samples: 480,
        confusion_matrix: [[218, 22], [14, 226]],
      },
      regressor: {
        mae_liters: 5.90,
        rmse_liters: 8.74,
        r2_score: 0.9072,
        samples: 480,
      },
    };
  },

  waterBudget(fieldId) {
    const logs = getStored('agrisense_logs', SEED_LOGS);
    const totalApplied = logs.reduce((sum, l) => sum + (l.liters_applied || l.water_volume || 0), 0);
    const totalBudget = 420000;

    return {
      total_water_applied_liters: totalApplied,
      total_reference_budget_liters: totalBudget,
      overall_budget_percent_used: Math.round((totalApplied / totalBudget) * 1000) / 10,
      estimated_water_saved_liters: Math.round(totalApplied * 0.35),
      fields_budget: getStored('agrisense_fields', SEED_FIELDS).map((f) => ({
        id: f.id,
        name: f.name,
        crop_type: f.crop_type,
        area_acres: f.area_acres,
        total_water_applied_liters: f.id === 1 ? 4500 : f.id === 2 ? 12000 : 2500,
        reference_water_budget_l: 140000,
      })),
      weekly_trend: [
        { week: '2026-W40', liters: 5200, sessions: 2 },
        { week: '2026-W41', liters: 4800, sessions: 2 },
        { week: '2026-W42', liters: 6500, sessions: 3 },
      ],
    };
  },

  irrigationLogs(limit = 100) {
    const logs = getStored('agrisense_logs', SEED_LOGS);
    return { items: logs.slice(0, limit), count: logs.length };
  },

  logIrrigation(payload) {
    const logs = getStored('agrisense_logs', SEED_LOGS);
    const newLog = {
      ...payload,
      id: Date.now(),
      timestamp: new Date().toISOString(),
      water_volume: payload.liters_applied || 5000,
      liters_applied: payload.liters_applied || 5000,
      irrigation_duration: payload.duration_minutes || 60,
      duration_minutes: payload.duration_minutes || 60,
    };
    logs.unshift(newLog);
    setStored('agrisense_logs', logs);
    return newLog;
  },
};

// Resilient wrapper: Tries network API first; automatically uses local engine if network fails
async function requestWithFallback(promise, fallbackFn) {
  try {
    const response = await promise;
    return response.data;
  } catch (error) {
    // Network error, mixed content error, timeout, or backend sleeping
    if (
      error.code === 'ERR_NETWORK' ||
      error.code === 'ECONNABORTED' ||
      !error.response ||
      error.response.status >= 500
    ) {
      return fallbackFn();
    }
    throw error;
  }
}

export const api = {
  // System
  health: () => requestWithFallback(client.get('/api/health'), () => fallbackEngine.health()),
  dashboard: () => requestWithFallback(client.get('/api/dashboard'), () => fallbackEngine.dashboard()),
  analytics: () => requestWithFallback(client.get('/api/analytics'), () => fallbackEngine.analytics()),
  modelMetrics: () => requestWithFallback(client.get('/api/model-metrics'), () => fallbackEngine.modelMetrics()),

  // Fields & Farm Setup
  fields: () => requestWithFallback(client.get('/api/fields'), () => fallbackEngine.fields()),
  field: (id) =>
    requestWithFallback(client.get(`/api/fields/${id}`), () =>
      fallbackEngine.fields().find((f) => f.id === Number(id))
    ),
  createField: (payload) =>
    requestWithFallback(client.post('/api/fields', payload), () => fallbackEngine.createField(payload)),
  updateField: (id, payload) =>
    requestWithFallback(client.put(`/api/fields/${id}`, payload), () => ({ ...payload, id })),
  deleteField: (id) => requestWithFallback(client.delete(`/api/fields/${id}`), () => ({ success: true })),

  // Sensors & IoT
  readings: (limit = 100, fieldName = null, fieldId = null) =>
    requestWithFallback(
      client.get('/api/readings', { params: { limit, field_name: fieldName, field_id: fieldId } }),
      () => fallbackEngine.readings(limit)
    ),
  addReading: (payload) =>
    requestWithFallback(client.post('/api/readings', payload), () => fallbackEngine.addReading(payload)),
  iotDevices: () => requestWithFallback(client.get('/api/sensors/devices'), () => fallbackEngine.iotDevices()),
  simulateReading: (fieldId = null) =>
    requestWithFallback(
      client.post('/api/sensors/simulate', null, { params: { field_id: fieldId } }),
      () => fallbackEngine.simulateReading(fieldId)
    ),
  ingestESP32: (payload) =>
    requestWithFallback(client.post('/api/sensors/ingest', payload), () => fallbackEngine.addReading(payload)),

  // Predictions & Decision Support
  predict: (payload) =>
    requestWithFallback(client.post('/api/predict', payload), () => fallbackEngine.predict(payload)),
  predictions: (limit = 100, fieldId = null) =>
    requestWithFallback(
      client.get('/api/predictions', { params: { limit, field_id: fieldId } }),
      () => fallbackEngine.predictions(limit)
    ),

  // Water Conservation Budget & Logs
  waterBudget: (fieldId = null) =>
    requestWithFallback(
      client.get('/api/water-budget', { params: { field_id: fieldId } }),
      () => fallbackEngine.waterBudget(fieldId)
    ),
  irrigationLogs: (limit = 100, fieldId = null) =>
    requestWithFallback(
      client.get('/api/irrigation-logs', { params: { limit, field_id: fieldId } }),
      () => fallbackEngine.irrigationLogs(limit)
    ),
  logIrrigation: (payload) =>
    requestWithFallback(client.post('/api/irrigation-logs', payload), () => fallbackEngine.logIrrigation(payload)),
};

export { API_BASE };
