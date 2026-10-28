import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Activity, Plus, RefreshCw, CheckCircle2, AlertTriangle, LoaderCircle,
  Sprout, Radio, BatteryCharging, Zap, Code, ShieldCheck, Sliders, X
} from 'lucide-react';
import { api } from '../services/api';
import Panel from '../components/Panel';

const initial = {
  field_name: 'North Field',
  soil_moisture: 38,
  temperature: 29,
  humidity: 60,
  rainfall: 0,
  forecast_rainfall: 0,
  soil_type: 'Loamy',
  crop_type: 'Wheat',
  growth_stage: 'Vegetative',
  source_type: 'manual',
  device_id: '',
  notes: '',
};

const fmt = (value, lang = 'en') => {
  if (!value) return '—';
  const locale = lang === 'hi' ? 'hi-IN' : lang === 'mr' ? 'mr-IN' : lang === 'gu' ? 'gu-IN' : 'en-IN';
  try {
    return new Date(value).toLocaleString(locale, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  } catch {
    return new Date(value).toLocaleString();
  }
};

export default function SensorHistory() {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'en';

  const [form, setForm] = useState(initial);
  const [items, setItems] = useState([]);
  const [devices, setDevices] = useState([]);
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Modals
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [showCalModal, setShowCalModal] = useState(false);
  const [calAir, setCalAir] = useState(3200);
  const [calWater, setCalWater] = useState(1450);
  const [testRaw, setTestRaw] = useState(2300);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [readingsRes, devicesRes, fieldsRes] = await Promise.all([
        api.readings(100),
        api.iotDevices(),
        api.fields(),
      ]);
      setItems(readingsRes.items || []);
      setDevices(devicesRes.devices || []);
      setFields(fieldsRes || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function change(event) {
    setForm((old) => ({
      ...old,
      [event.target.name]: event.target.type === 'number' ? Number(event.target.value) : event.target.value,
    }));
  }

  function handleFieldSelect(e) {
    const name = e.target.value;
    const matched = fields.find((f) => f.name === name);
    setForm((prev) => ({
      ...prev,
      field_name: name,
      soil_type: matched?.soil_type || prev.soil_type,
      crop_type: matched?.crop_type || prev.crop_type,
      growth_stage: matched?.growth_stage || prev.growth_stage,
      device_id: matched?.device_id || prev.device_id,
    }));
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await api.addReading(form);
      setMessage(t('sensors.readingSavedSuccess', 'Manual sensor reading saved successfully.'));
      setForm(initial);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSimulate() {
    setSimulating(true);
    setError('');
    setMessage('');
    try {
      const res = await api.simulateReading();
      setMessage(res.message || t('sensors.telemetryGenerated', 'Simulated live telemetry reading recorded.'));
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSimulating(false);
    }
  }

  // Calibrated test percentage: (Air - Raw) / (Air - Water) * 100
  const computedPct = Math.round(
    Math.max(0, Math.min(100, ((calAir - testRaw) / Math.max(100, calAir - calWater)) * 100))
  );

  return (
    <div className="page-content">
      <div className="welcome-row">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" /> {t('sensors.eyebrow', 'PHASE 2: TELEMETRY & IOT')}
          </div>
          <h2 className="welcome-title">
            {t('sensors.title', 'Sensor History & IoT Feeds')}
          </h2>
          <p className="welcome-copy">
            {t('sensors.subtitle', 'Record manual observations or inspect automated telemetry from ESP32 field nodes with calibration curves.')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            className="button button-outline"
            onClick={() => setShowCodeModal(true)}
            title="View ESP32 Arduino C++ firmware snippet"
          >
            <Code size={15} /> {t('sensors.esp32Code', 'ESP32 Code')}
          </button>
          <button
            className="button button-outline"
            onClick={() => setShowCalModal(true)}
            title="Sensor calibration tool"
          >
            <Sliders size={15} /> {t('sensors.calibrate', 'Calibrate')}
          </button>
          <button
            className="button button-primary"
            onClick={handleSimulate}
            disabled={simulating}
          >
            {simulating ? <LoaderCircle className="spin" size={15} /> : <Zap size={15} />}
            {simulating ? t('dashboard.simulating', 'Simulating…') : t('dashboard.simulateTelemetry', 'Simulate Telemetry')}
          </button>
        </div>
      </div>

      {error && (
        <div className="notice notice-error">
          <AlertTriangle size={18} />
          <div>
            <strong>{t('common.error', 'Error')}</strong>
            <span>{error}</span>
          </div>
        </div>
      )}

      {message && (
        <div className="notice notice-success">
          <CheckCircle2 size={18} />
          <div>
            <strong>{t('common.success', 'Success')}</strong>
            <span>{message}</span>
          </div>
        </div>
      )}

      {/* IoT Device Health Nodes */}
      {devices.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '12px' }}>
          {devices.map((dev) => (
            <div
              key={dev.device_id}
              style={{
                background: '#fff',
                border: '1px solid #e5eee7',
                borderRadius: '12px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: '0 2px 8px rgba(25, 60, 35, 0.04)',
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: dev.is_online ? '#e5f5ea' : '#fdede8',
                  color: dev.is_online ? '#2b8455' : '#c65942',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                }}
              >
                <Radio size={18} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '11px', color: '#274433' }}>{dev.device_id}</strong>
                  <span
                    style={{
                      fontSize: '8px',
                      fontWeight: '800',
                      color: dev.is_online ? '#278051' : '#c25841',
                      background: dev.is_online ? '#e6f5eb' : '#fdede9',
                      padding: '2px 5px',
                      borderRadius: '4px',
                    }}
                  >
                    {dev.is_online ? t('settings.connected', 'ONLINE') : t('settings.offline', 'OFFLINE')}
                  </span>
                </div>
                <div style={{ fontSize: '9px', color: '#88968d', marginTop: '2px' }}>
                  {dev.field_name} · {dev.soil_moisture}%
                </div>
                <div style={{ fontSize: '8px', color: '#97a39a', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <BatteryCharging size={11} /> {dev.battery_voltage ? `${dev.battery_voltage}V` : '3.9V'} ({dev.battery_status})
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Grid: Add Reading Form & Table Log */}
      <div className="content-grid sensor-grid">
        <Panel
          title={t('sensors.addReadingTitle', 'Add a sensor reading')}
          subtitle={t('sensors.addReadingSubtitle', 'Enter manual measurements or use demo presets.')}
        >
          <form onSubmit={submit} className="field-form compact-form">
            <label className="form-field full-width">
              <span>{t('prediction.fieldName', 'Field Name')}</span>
              <select name="field_name" value={form.field_name} onChange={handleFieldSelect}>
                {fields.map((f) => (
                  <option key={f.id} value={f.name}>
                    {f.name} ({t(`crops.${f.crop_type}`, f.crop_type)})
                  </option>
                ))}
              </select>
            </label>

            <div className="form-row">
              <label className="form-field">
                <span>{t('prediction.soilMoisture', 'Soil Moisture (%)')}</span>
                <input
                  type="number"
                  name="soil_moisture"
                  value={form.soil_moisture}
                  onChange={change}
                  min="0"
                  max="100"
                  step="0.1"
                  required
                />
              </label>
              <label className="form-field">
                <span>{t('prediction.temperature', 'Temperature (°C)')}</span>
                <input
                  type="number"
                  name="temperature"
                  value={form.temperature}
                  onChange={change}
                  min="-10"
                  max="60"
                  step="0.1"
                  required
                />
              </label>
            </div>

            <div className="form-row">
              <label className="form-field">
                <span>{t('prediction.humidity', 'Relative Humidity (%)')}</span>
                <input
                  type="number"
                  name="humidity"
                  value={form.humidity}
                  onChange={change}
                  min="0"
                  max="100"
                  step="0.1"
                  required
                />
              </label>
              <label className="form-field">
                <span>{t('prediction.rainfall', 'Recent Rainfall (mm)')}</span>
                <input
                  type="number"
                  name="rainfall"
                  value={form.rainfall}
                  onChange={change}
                  min="0"
                  max="300"
                  step="0.1"
                  required
                />
              </label>
            </div>

            <div className="form-row">
              <label className="form-field">
                <span>{t('prediction.forecastRainfall', 'Forecast Rain (mm)')}</span>
                <input
                  type="number"
                  name="forecast_rainfall"
                  value={form.forecast_rainfall}
                  onChange={change}
                  min="0"
                  max="300"
                  step="0.1"
                  required
                />
              </label>
              <label className="form-field">
                <span>{t('prediction.soilType', 'Soil Type')}</span>
                <select name="soil_type" value={form.soil_type} onChange={change}>
                  {['Sandy', 'Loamy', 'Clay', 'Silty'].map((x) => (
                    <option key={x} value={x}>{t(`soilTypes.${x}`, x)}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="form-row">
              <label className="form-field">
                <span>{t('prediction.cropType', 'Crop Type')}</span>
                <select name="crop_type" value={form.crop_type} onChange={change}>
                  {['Wheat', 'Rice', 'Maize', 'Cotton', 'Vegetables'].map((x) => (
                    <option key={x} value={x}>{t(`crops.${x}`, x)}</option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span>{t('prediction.growthStage', 'Growth Stage')}</span>
                <select name="growth_stage" value={form.growth_stage} onChange={change}>
                  {['Seedling', 'Vegetative', 'Flowering', 'Maturity'].map((x) => (
                    <option key={x} value={x}>{t(`growthStages.${x}`, x)}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className="form-field full-width">
              <span>{t('dashboard.colSource', 'Source')}</span>
              <select name="source_type" value={form.source_type} onChange={change}>
                <option value="manual">Manual Entry</option>
                <option value="esp32_iot">ESP32 Hardware Telemetry</option>
                <option value="simulated">Simulated Reading</option>
              </select>
            </label>

            <label className="form-field full-width">
              <span>{t('sensors.notes', 'Notes & Observations')}</span>
              <textarea
                name="notes"
                value={form.notes}
                onChange={change}
                maxLength={300}
                rows={2}
                placeholder={t('sensors.notesPlaceholder', 'e.g., Post-weeding observation, slight leaf discoloration on north border')}
              />
            </label>

            <button type="submit" className="button button-primary button-full" disabled={saving}>
              {saving ? <LoaderCircle size={17} className="spin" /> : <Plus size={17} />}
              {saving ? t('common.saving', 'Saving…') : t('sensors.saveReadingButton', 'Save Sensor Reading')}
            </button>
          </form>
        </Panel>

        {/* Readings Log Table */}
        <Panel
          title={t('sensors.historyTitle', 'Chronological Sensor History')}
          subtitle={`${items.length} ${t('sensors.historySubtitle', 'observations in database')}`}
          action={
            <button className="button button-outline button-small" onClick={loadData}>
              <RefreshCw size={14} /> Refresh
            </button>
          }
        >
          {loading ? (
            <div className="loading-state">
              <LoaderCircle className="spin" size={21} /> {t('common.loading', 'Loading...')}
            </div>
          ) : (
            <div className="table-scroll history-table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('analytics.colDateTime', 'Timestamp')}</th>
                    <th>{t('dashboard.colField', 'Field')} / {t('dashboard.colSource', 'Source')}</th>
                    <th>{t('dashboard.colMoisture', 'Moisture')}</th>
                    <th>{t('dashboard.colTemp', 'Temp')} / {t('dashboard.humidity', 'Hum')}</th>
                    <th>{t('prediction.rainfall', 'Rainfall')}</th>
                    <th>Device</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const src = item.source_type || 'manual';
                    return (
                      <tr key={item.id}>
                        <td className="muted-cell timestamp-cell">{fmt(item.timestamp, currentLang)}</td>
                        <td>
                          <div className="field-table-name">
                            <span className="field-table-icon">
                              <Sprout size={14} />
                            </span>
                            <span>
                              <strong>{item.field_name}</strong>
                              <small>
                                <span
                                  style={{
                                    fontSize: '8px',
                                    fontWeight: '800',
                                    padding: '1px 5px',
                                    borderRadius: '3px',
                                    background: src === 'esp32_iot' ? '#d8f2df' : src === 'simulated' ? '#f4ebfa' : '#edf2f7',
                                    color: src === 'esp32_iot' ? '#247348' : src === 'simulated' ? '#7b54a8' : '#52667a',
                                  }}
                                >
                                  {src === 'esp32_iot' ? 'ESP32 IoT' : src === 'simulated' ? 'Simulated' : 'Manual'}
                                </span>
                                {' '}· {t(`crops.${item.crop_type}`, item.crop_type)}
                              </small>
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className={`moisture-pill ${item.soil_moisture < 25 ? 'low' : item.soil_moisture > 70 ? 'high' : 'normal'}`}>
                            {item.soil_moisture}%
                          </span>
                        </td>
                        <td>
                          {item.temperature}°C / {item.humidity}%
                        </td>
                        <td>{item.rainfall} {t('common.mm', 'mm')}</td>
                        <td style={{ fontSize: '10px', color: '#7a8980' }}>
                          {item.device_id || '—'}
                          {item.battery_voltage ? ` (${item.battery_voltage}V)` : ''}
                        </td>
                      </tr>
                    );
                  })}
                  {!items.length && (
                    <tr>
                      <td colSpan={6} className="empty-cell">
                        {t('dashboard.noReadings', 'No sensor readings found.')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      {/* Modal: ESP32 Firmware Snippet */}
      {showCodeModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 35, 23, 0.7)',
            backdropFilter: 'blur(3px)',
            zIndex: 100,
            display: 'grid',
            placeItems: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '16px',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#254432' }}>
                  ESP32 Arduino Firmware Integration
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '11px', color: '#88988e' }}>
                  HTTP POST code for sending Capacitive Moisture & DHT22 readings to the API.
                </p>
              </div>
              <button className="icon-button" onClick={() => setShowCodeModal(false)}>
                <X size={17} />
              </button>
            </div>

            <pre
              style={{
                background: '#1b2d23',
                color: '#d4ebd9',
                padding: '16px',
                borderRadius: '10px',
                fontSize: '11px',
                fontFamily: 'Consolas, monospace',
                overflowX: 'auto',
                lineHeight: '1.5',
              }}
            >{`#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "DHT.h"

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* serverUrl = "http://YOUR_SERVER_IP:8000/api/sensors/ingest";

#define SOIL_PIN 34    // Analog pin for Capacitive Soil Moisture v1.2
#define DHT_PIN 4
#define DHTTYPE DHT22
DHT dht(DHT_PIN, DHTTYPE);

void setup() {
  Serial.begin(115200);
  dht.begin();
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println("\\nWiFi connected.");
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");

    int rawMoisture = analogRead(SOIL_PIN);
    float temp = dht.readTemperature();
    float hum = dht.readHumidity();

    StaticJsonDocument<256> doc;
    doc["device_id"] = "ESP32-NODE-01";
    doc["field_name"] = "North Field";
    doc["raw_moisture"] = rawMoisture;
    doc["temperature"] = temp;
    doc["humidity"] = hum;
    doc["battery_voltage"] = 3.95;

    String jsonStr;
    serializeJson(doc, jsonStr);
    int httpResponseCode = http.POST(jsonStr);
    Serial.printf("POST status: %d\\n", httpResponseCode);
    http.end();
  }
  delay(600000); // Send every 10 minutes
}`}</pre>
            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="button button-primary" onClick={() => setShowCodeModal(false)}>
                {t('common.done', 'Done')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Sensor Calibration Tool */}
      {showCalModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 35, 23, 0.7)',
            backdropFilter: 'blur(3px)',
            zIndex: 100,
            display: 'grid',
            placeItems: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '16px',
              maxWidth: '520px',
              width: '100%',
              padding: '24px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#254432' }}>
                  Soil Moisture Sensor Calibration
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '11px', color: '#88988e' }}>
                  Calibrate raw ADC voltage (0-4095) for accurate Volumetric Water Content.
                </p>
              </div>
              <button className="icon-button" onClick={() => setShowCalModal(false)}>
                <X size={17} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <label className="form-field">
                <span>{t('sensors.dryReference', 'Dry Air Reference ADC (0% Moisture)')}</span>
                <input
                  type="number"
                  value={calAir}
                  onChange={(e) => setCalAir(Number(e.target.value))}
                />
                <small>Hold sensor clean and dry in air. Typical: 3100 - 3300</small>
              </label>

              <label className="form-field">
                <span>{t('sensors.waterReference', 'Submerged Water Reference ADC (100% Moisture)')}</span>
                <input
                  type="number"
                  value={calWater}
                  onChange={(e) => setCalWater(Number(e.target.value))}
                />
                <small>Immerse sensor up to maximum line in a cup of water. Typical: 1350 - 1500</small>
              </label>

              <label className="form-field">
                <span>{t('sensors.testRaw', 'Test Raw Analog ADC Value')}</span>
                <input
                  type="number"
                  value={testRaw}
                  onChange={(e) => setTestRaw(Number(e.target.value))}
                />
              </label>

              <div style={{ background: '#f5faf6', border: '1px solid #ddecde', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                <span style={{ fontSize: '10px', color: '#688272' }}>{t('sensors.calibratedMoisture', 'Calibrated Soil Moisture:')}</span>
                <div style={{ fontSize: '28px', fontWeight: '800', color: '#23734a', margin: '4px 0' }}>
                  {computedPct}%
                </div>
                <div className="mini-progress" style={{ height: '6px', maxWidth: '240px', margin: '0 auto' }}>
                  <i style={{ width: `${computedPct}%` }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button className="button button-primary" onClick={() => setShowCalModal(false)}>
                  {t('common.close', 'Close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
