import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BrainCircuit, Droplets, Gauge, Leaf, LoaderCircle, CheckCircle2,
  AlertTriangle, RotateCcw, Clock, CloudRain, ShieldCheck, ArrowRight,
  Layers, Info, Calendar, Calculator
} from 'lucide-react';
import { api } from '../services/api';
import Panel from '../components/Panel';

export default function Prediction() {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'en';
  const location = useLocation();
  const preSelectedField = location.state?.selectedField;

  const [fields, setFields] = useState([]);
  const [selectedFieldId, setSelectedFieldId] = useState(preSelectedField?.id || '');

  const [form, setForm] = useState({
    field_id: preSelectedField?.id || null,
    field_name: preSelectedField?.name || 'North Field',
    area_acres: preSelectedField?.area_acres || 1.5,
    flow_rate_lpm: preSelectedField?.flow_rate_lpm || 50.0,
    flow_rate_lph: (preSelectedField?.flow_rate_lpm || 50.0) * 60,
    irrigation_method: preSelectedField?.irrigation_method || 'Drip',
    crop_type: preSelectedField?.crop_type || 'Wheat',
    growth_stage: preSelectedField?.growth_stage || 'Vegetative',
    soil_type: preSelectedField?.soil_type || 'Loamy',
    soil_moisture: preSelectedField?.latest_reading?.soil_moisture || 28.0,
    temperature: preSelectedField?.latest_reading?.temperature || 31.0,
    humidity: preSelectedField?.latest_reading?.humidity || 55.0,
    rainfall: 0.0,
    forecast_rainfall: 2.0,
  });

  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loggedNotice, setLoggedNotice] = useState('');

  // Load fields for dropdown
  useEffect(() => {
    api.fields()
      .then((data) => {
        setFields(data || []);
        if (!selectedFieldId && data?.length > 0) {
          applyField(data[0]);
        }
      })
      .catch(() => {});
  }, []);

  function applyField(field) {
    setSelectedFieldId(field.id);
    const lpm = field.flow_rate_lpm || 50.0;
    setForm((prev) => ({
      ...prev,
      field_id: field.id,
      field_name: field.name,
      area_acres: field.area_acres || 1.0,
      flow_rate_lpm: lpm,
      flow_rate_lph: lpm * 60,
      irrigation_method: field.irrigation_method || 'Drip',
      crop_type: field.crop_type || 'Wheat',
      growth_stage: field.growth_stage || 'Vegetative',
      soil_type: field.soil_type || 'Loamy',
      soil_moisture: field.latest_reading?.soil_moisture || prev.soil_moisture,
      temperature: field.latest_reading?.temperature || prev.temperature,
      humidity: field.latest_reading?.humidity || prev.humidity,
    }));
  }

  function handleFieldSelect(e) {
    const fieldId = Number(e.target.value);
    const found = fields.find((f) => f.id === fieldId);
    if (found) {
      applyField(found);
    }
  }

  const setFieldVal = (e) => {
    const { name, value, type } = e.target;
    const parsed = type === 'number' ? Number(value) : value;
    setForm((current) => {
      const next = { ...current, [name]: parsed };
      if (name === 'flow_rate_lpm' && typeof parsed === 'number') {
        next.flow_rate_lph = Math.round(parsed * 60);
      } else if (name === 'flow_rate_lph' && typeof parsed === 'number') {
        next.flow_rate_lpm = Math.round((parsed / 60) * 10) / 10;
      }
      return next;
    });
  };

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setResult(null);
    setLoggedNotice('');
    try {
      const payload = {
        ...form,
        flow_rate_lph: form.flow_rate_lph || (form.flow_rate_lpm ? form.flow_rate_lpm * 60 : undefined),
      };
      const output = await api.predict(payload);
      setResult(output);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleQuickLogIrrigation() {
    if (!result) return;
    try {
      await api.logIrrigation({
        field_id: form.field_id,
        field_name: form.field_name,
        duration_minutes: result.runtime_minutes || 60,
        liters_applied: result.estimated_water_liters || 5000,
        method: form.irrigation_method,
        flow_rate_lpm: form.flow_rate_lpm,
        operator_notes: `Logged directly from AI decision recommendation (${result.urgency} priority)`,
      });
      setLoggedNotice(t('prediction.sessionRecorded', 'Irrigation event successfully recorded into Water Records.'));
    } catch (err) {
      setError(err.message);
    }
  }

  function handlePreset(type) {
    if (type === 'dry') {
      setForm((prev) => ({
        ...prev,
        soil_moisture: 18.0,
        temperature: 34.0,
        humidity: 35.0,
        rainfall: 0.0,
        forecast_rainfall: 0.0,
      }));
    } else if (type === 'optimal') {
      setForm((prev) => ({
        ...prev,
        soil_moisture: 52.0,
        temperature: 26.0,
        humidity: 65.0,
        rainfall: 0.0,
        forecast_rainfall: 0.0,
      }));
    } else if (type === 'rainy') {
      setForm((prev) => ({
        ...prev,
        soil_moisture: 24.0,
        temperature: 28.0,
        humidity: 75.0,
        rainfall: 12.0,
        forecast_rainfall: 18.0,
      }));
    }
  }

  return (
    <div className="page-content">
      <div className="page-intro">
        <div className="intro-icon purple-icon">
          <BrainCircuit size={24} />
        </div>
        <div>
          <div className="eyebrow">{t('prediction.eyebrow', 'HYBRID DECISION ENGINE')}</div>
          <h2>{t('prediction.title', 'Irrigation Decision Support Workspace')}</h2>
          <p>{t('prediction.subtitle', 'Combines FAO-56 soil-water physics with Random Forest machine learning to answer the farmer’s core questions.')}</p>
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

      {loggedNotice && (
        <div className="notice notice-success">
          <CheckCircle2 size={18} />
          <div>
            <strong>{t('common.success', 'Success')}</strong>
            <span>{loggedNotice}</span>
          </div>
        </div>
      )}

      <div className="content-grid prediction-grid">
        {/* Left Column: Form */}
        <div>
          <Panel
            title={t('prediction.fieldConditions', 'Field Conditions & Parameters')}
            subtitle={t('prediction.fieldConditionsSubtitle', 'Input latest sensor readings or pick a preset scenario')}
            action={
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  className="preset-pill warning-pill"
                  onClick={() => handlePreset('dry')}
                  title="Load extreme dry scenario"
                >
                  {t('prediction.presetDry', 'Dry Stress')}
                </button>
                <button
                  type="button"
                  className="preset-pill success-pill"
                  onClick={() => handlePreset('optimal')}
                  title="Load optimal moisture scenario"
                >
                  {t('prediction.presetOptimal', 'Optimal')}
                </button>
                <button
                  type="button"
                  className="preset-pill info-pill"
                  onClick={() => handlePreset('rainy')}
                  title="Load forecasted rainfall scenario"
                >
                  {t('prediction.presetRain', 'Rain Forecast')}
                </button>
              </div>
            }
          >
            <form onSubmit={handleSubmit} className="field-form">
              {/* Field Preset Selector */}
              {fields.length > 0 && (
                <label className="form-field full-width">
                  <span>{t('prediction.selectField', 'Select Registered Farm Field (Auto-populates setup)')}</span>
                  <select value={selectedFieldId} onChange={handleFieldSelect}>
                    <option value="">{t('prediction.manualEntry', 'Manual Entry (No Field Link)')}</option>
                    {fields.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} — {t(`crops.${f.crop_type}`, f.crop_type)} ({f.area_acres} {t('common.acres', 'acres')} · {t(`irrigationMethods.${f.irrigation_method}`, f.irrigation_method)})
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <div className="form-section-title">
                <span>01</span> {t('prediction.sec01', 'Crop & Irrigation Setup')}
              </div>

              <div className="form-row">
                <label className="form-field">
                  <span>{t('prediction.fieldName', 'Field Name')}</span>
                  <input name="field_name" value={form.field_name} onChange={setFieldVal} required maxLength={80} />
                </label>
                <label className="form-field">
                  <span>{t('prediction.fieldArea', 'Field Area (Acres)')}</span>
                  <input type="number" step="0.1" min="0.1" max="1000" name="area_acres" value={form.area_acres} onChange={setFieldVal} required />
                </label>
              </div>

              <div className="form-row">
                <label className="form-field">
                  <span>{t('prediction.cropType', 'Crop Type')}</span>
                  <select name="crop_type" value={form.crop_type} onChange={setFieldVal}>
                    {['Wheat', 'Rice', 'Maize', 'Cotton', 'Vegetables'].map((x) => (
                      <option key={x} value={x}>{t(`crops.${x}`, x)}</option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>{t('prediction.growthStage', 'Growth Stage')}</span>
                  <select name="growth_stage" value={form.growth_stage} onChange={setFieldVal}>
                    {['Seedling', 'Vegetative', 'Flowering', 'Maturity'].map((x) => (
                      <option key={x} value={x}>{t(`growthStages.${x}`, x)}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="form-row">
                <label className="form-field">
                  <span>{t('prediction.soilType', 'Soil Type')}</span>
                  <select name="soil_type" value={form.soil_type} onChange={setFieldVal}>
                    {['Sandy', 'Loamy', 'Clay', 'Silty'].map((x) => (
                      <option key={x} value={x}>{t(`soilTypes.${x}`, x)}</option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>{t('prediction.irrigationMethod', 'Irrigation Method')}</span>
                  <select name="irrigation_method" value={form.irrigation_method} onChange={setFieldVal}>
                    {['Drip', 'Sprinkler', 'Furrow', 'Basin'].map((x) => (
                      <option key={x} value={x}>{t(`irrigationMethods.${x}`, x)}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="form-row">
                <label className="form-field">
                  <span>{t('prediction.flowRateLpm', 'Flow Rate (LPM)')}</span>
                  <input type="number" step="5" min="5" max="10000" name="flow_rate_lpm" value={form.flow_rate_lpm} onChange={setFieldVal} required />
                  <small>{t('prediction.flowRateLpmHelp', 'Discharge in Liters / min')}</small>
                </label>
                <label className="form-field">
                  <span>{t('prediction.flowRateLph', 'Flow Rate (L/hr)')}</span>
                  <input type="number" step="100" min="100" max="600000" name="flow_rate_lph" value={form.flow_rate_lph} onChange={setFieldVal} required />
                  <small>{t('prediction.flowRateLphHelp', 'Litres Per Hour for runtime')}</small>
                </label>
              </div>

              <div className="form-section-title form-section-spaced">
                <span>02</span> {t('prediction.sec02', 'Current Soil & Weather Conditions')}
              </div>
              <div className="form-row">
                <label className="form-field">
                  <span>{t('prediction.soilMoisture', 'Soil Moisture (%)')}</span>
                  <input type="number" min="0" max="100" step="0.1" name="soil_moisture" value={form.soil_moisture} onChange={setFieldVal} required />
                </label>
                <label className="form-field">
                  <span>{t('prediction.temperature', 'Temperature (°C)')}</span>
                  <input type="number" min="-10" max="60" step="0.1" name="temperature" value={form.temperature} onChange={setFieldVal} required />
                </label>
              </div>

              <div className="form-row">
                <label className="form-field">
                  <span>{t('prediction.humidity', 'Relative Humidity (%)')}</span>
                  <input type="number" min="0" max="100" step="0.1" name="humidity" value={form.humidity} onChange={setFieldVal} required />
                </label>
                <label className="form-field">
                  <span>{t('prediction.rainfall', 'Recent Rainfall (mm)')}</span>
                  <input type="number" min="0" max="300" step="0.1" name="rainfall" value={form.rainfall} onChange={setFieldVal} required />
                </label>
              </div>

              <label className="form-field full-width">
                <span>{t('prediction.forecastRainfall', 'Forecast Rainfall next 24-48h (mm)')}</span>
                <input type="number" min="0" max="300" step="0.1" name="forecast_rainfall" value={form.forecast_rainfall} onChange={setFieldVal} />
                <small>{t('prediction.forecastRainfallHelp', 'Allows the agronomic model to postpone pumping if natural rainfall will satisfy crop need.')}</small>
              </label>

              <button type="submit" className="button button-primary button-full" disabled={busy}>
                {busy ? <LoaderCircle className="spin" size={17} /> : <BrainCircuit size={17} />}
                {busy ? t('prediction.calculatingButton', 'Evaluating Farm Physics & AI Models…') : t('prediction.calculateButton', 'Calculate Irrigation Need')}
              </button>
            </form>
          </Panel>
        </div>

        {/* Right Column: Results */}
        <div>
          <Panel
            title={t('prediction.verdictTitle', 'Decision Support Verdict')}
            subtitle={t('prediction.verdictSubtitle', 'Physics-based FAO-56 calculation & Random Forest ML assessment')}
            action={
              result && (
                <span className="source-tag">
                  {t(`urgency.${result.urgency}`, `${result.urgency} Priority`)}
                </span>
              )
            }
          >
            {!result ? (
              <div className="result-placeholder">
                <div className="placeholder-icon">
                  <BrainCircuit size={36} />
                </div>
                <h3>{t('prediction.noEvaluationLoaded', 'No evaluation loaded')}</h3>
                <p>
                  {t('prediction.noEvaluationPrompt', 'Submit the form on the left or select a preset scenario to view the irrigation decision, volumetric water needs, and system run duration.')}
                </p>
              </div>
            ) : (
              <div className="result-content">
                {/* Data Quality Notice */}
                {result.data_quality === 'insufficient' && (
                  <div style={{ background: '#fef9ee', border: '1px solid #f6e6bd', borderRadius: '10px', padding: '10px 12px', marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <AlertTriangle size={16} style={{ color: '#d97706', flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ fontSize: '11px', color: '#92400e', lineHeight: '1.5' }}>
                      {t('prediction.approxNotice', { missing: result.missing_context?.join(', ') || 'soil/crop', defaultValue: `Context Notice: Missing or defaulted parameters (${result.missing_context?.join(', ') || 'soil/crop'}). Estimates are approximate.` })}
                    </div>
                  </div>
                )}

                {/* 1. Does this field need water now? */}
                <div className={`prediction-status ${result.irrigation_needed ? 'needs-water' : 'no-water'}`}>
                  <span className="result-status-icon">
                    {result.irrigation_needed ? <Droplets size={24} /> : <CheckCircle2 size={24} />}
                  </span>
                  <div>
                    <span className="result-overline">{t('prediction.actionableRecommendation', 'ACTIONABLE RECOMMENDATION')}</span>
                    <h3 style={{ fontSize: '17px', margin: '3px 0' }}>
                      {result.irrigation_needed
                        ? t('dashboard.irrigationRecommended', 'Irrigation Recommended')
                        : t('dashboard.noIrrigationIndicated', 'Adequate Moisture — No Irrigation Needed')}
                    </h3>
                    <p style={{ fontWeight: '600' }}>
                      {t('analytics.precision', 'Priority')}: <strong style={{ color: result.irrigation_needed ? '#1d6e43' : '#3d6f96' }}>{t(`urgency.${result.urgency}`, result.urgency)}</strong> · {t('prediction.mlConfidence', 'Confidence:')} {(result.confidence * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>

                {/* 2. Why is irrigation recommended or not recommended? */}
                <div style={{ background: '#f8faf7', border: '1px solid #e5eee7', borderRadius: '12px', padding: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '800', color: '#274b35', marginBottom: '6px' }}>
                    <Info size={15} style={{ color: '#2b8254' }} /> {t('prediction.whyRecommendation', 'Why this recommendation?')}
                  </div>
                  <p style={{ margin: 0, fontSize: '11px', lineHeight: '1.65', color: '#445b4c' }}>
                    {result.why_explanation}
                  </p>
                </div>

                {/* 3. Water Volume & Pump Runtime */}
                <div className="result-stat-grid">
                  <div className="result-stat">
                    <span><Droplets size={15} /> {t('prediction.waterVolumeNeeded', 'Water Volume Needed')}</span>
                    <strong>
                      {result.estimated_water_liters?.toLocaleString() || 0}
                      <small> {t('common.liters', 'Liters')}</small>
                    </strong>
                    <p>{t('prediction.forAcres', { volumeM3: (result.estimated_water_liters / 1000).toFixed(1), acres: form.area_acres, defaultValue: `${(result.estimated_water_liters / 1000).toFixed(1)} m³ for ${form.area_acres} acres` })}</p>
                  </div>

                  <div className="result-stat">
                    <span><Clock size={15} /> {t('prediction.systemRunTime', 'System Run Time')}</span>
                    <strong>
                      {result.runtime_hours != null
                        ? `${Math.floor(result.runtime_hours)}${t('common.hours', 'h')} ${Math.round((result.runtime_hours % 1) * 60)}${t('common.minutes', 'm')}`
                        : (result.runtime_formatted || '0 mins')}
                    </strong>
                    <p>{t('prediction.atFlowRate', { flowRate: form.flow_rate_lph ? `${form.flow_rate_lph.toLocaleString()} L/hr` : `${form.flow_rate_lpm} L/min`, defaultValue: `at ${form.flow_rate_lph ? `${form.flow_rate_lph.toLocaleString()} L/hr` : `${form.flow_rate_lpm} L/min`}` })}</p>
                  </div>
                </div>

                {/* Water Calculation Detail Card */}
                {result.water_calculation && (
                  <div style={{ background: '#f4f8f5', border: '1px solid #ddecde', borderRadius: '10px', padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '800', color: '#275237', marginBottom: '6px' }}>
                      <Calculator size={14} style={{ color: '#278051' }} /> {t('prediction.waterDepthAndVolume', 'Water Depth & Volume Calculation')}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', fontSize: '10px', color: '#385845' }}>
                      <div>{t('prediction.depth', 'Depth:')} <strong>{result.water_calculation.depth_mm} mm</strong></div>
                      <div>{t('prediction.area', 'Area:')} <strong>{result.water_calculation.area_m2.toLocaleString()} m²</strong></div>
                      <div>{t('prediction.netVolume', 'Net Volume:')} <strong>{result.water_calculation.net_volume_litres.toLocaleString()} L</strong></div>
                      <div>{t('prediction.efficiency', 'Efficiency:')} <strong>{(result.water_calculation.application_efficiency * 100).toFixed(0)}%</strong></div>
                    </div>
                    <small style={{ display: 'block', marginTop: '6px', fontSize: '9px', color: '#557461' }}>
                      {t('prediction.physicalFormulaNote', 'Physical formula: 1 mm depth over 1 m² = 1 litre net; gross volume = net ÷ application efficiency.')}
                    </small>
                  </div>
                )}

                {/* 4. Educational ML Prediction Block */}
                {result.ml_prediction && (
                  <div style={{ background: '#f6f4fc', border: '1px solid #e3def7', borderRadius: '10px', padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '800', color: '#443585', marginBottom: '6px' }}>
                      <BrainCircuit size={14} style={{ color: '#6854b8' }} /> {t('prediction.educationalMlTitle', 'Educational Machine Learning Inference')}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', fontSize: '10px', color: '#50447c' }}>
                      <div>{t('prediction.mlDecision', 'ML Decision:')} <strong>{result.ml_prediction.irrigation_needed ? t('prediction.waterNeeded', 'Water Needed') : t('prediction.adequate', 'Adequate')}</strong></div>
                      <div>{t('prediction.mlConfidence', 'Confidence:')} <strong>{(result.ml_prediction.confidence * 100).toFixed(1)}%</strong></div>
                      <div>{t('prediction.mlBaseline', 'Baseline:')} <strong>{result.ml_prediction.estimated_water_liters_per_acre} L/ac</strong></div>
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: '9px', color: '#6c6294', fontStyle: 'italic', lineHeight: '1.4' }}>
                      {result.ml_prediction.disclaimer}
                    </p>
                  </div>
                )}

                {/* 5. Rain Credit Card */}
                {result.rainfall_credit_liters > 0 && (
                  <div style={{ background: '#eef6fc', border: '1px solid #dbe9f4', borderRadius: '10px', padding: '11px 13px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <CloudRain size={18} style={{ color: '#3173a5', marginTop: '2px', flexShrink: 0 }} />
                    <div style={{ fontSize: '10px', color: '#2c597d', lineHeight: '1.55' }}>
                      <strong style={{ display: 'block', fontSize: '11px' }}>{t('prediction.rainfallCreditApplied', 'Rainfall Credit Applied')}</strong>
                      {result.rain_explanation}
                      <span style={{ display: 'block', marginTop: '3px', fontWeight: '700' }}>
                        {t('prediction.groundwaterConserved', { liters: result.rainfall_credit_liters.toLocaleString(), defaultValue: `Conserves ~${result.rainfall_credit_liters.toLocaleString()} Liters of groundwater.` })}
                      </span>
                    </div>
                  </div>
                )}

                {/* 6. Suggested Action & Next Check */}
                <div className="recommendation-box">
                  <span className="recommendation-mark"><Leaf size={18} /></span>
                  <div>
                    <strong>{t('prediction.suggestedAction', 'Suggested Action')}</strong>
                    <p>{result.recommendation}</p>
                    <div style={{ marginTop: '8px', fontSize: '10px', color: '#5b7664', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={13} />
                      {t('prediction.nextInspectionAdvised', { hours: result.next_check_hours, defaultValue: `Next inspection advised in: ~${result.next_check_hours} hours` })}
                    </div>
                  </div>
                </div>

                {/* Quick Action: Log Irrigation Event */}
                {result.irrigation_needed && (
                  <button
                    type="button"
                    className="button button-soft button-full"
                    style={{ margin: 0 }}
                    onClick={handleQuickLogIrrigation}
                  >
                    <Droplets size={15} /> {t('prediction.recordAppliedSession', 'Record This Applied Session to Farm Water Log')}
                  </button>
                )}

                {/* Fallback Protocol Note */}
                {result.fallback_guide && (
                  <div style={{ background: '#fcfbf6', border: '1px solid #f0ead9', borderRadius: '10px', padding: '12px', fontSize: '10px', color: '#7c6d48' }}>
                    <div style={{ fontWeight: '800', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <ShieldCheck size={14} /> {t('prediction.ifSensorsUnavailable', 'If Sensors Become Unavailable:')}
                    </div>
                    <p style={{ margin: '0 0 4px', lineHeight: '1.5' }}>
                      <strong>{t('prediction.soilFeelTest', 'Soil Feel Test:')}</strong> {result.fallback_guide.feel_test_instruction}
                    </p>
                    <p style={{ margin: 0, lineHeight: '1.5' }}>
                      <strong>{t('prediction.emergencyRule', 'Emergency Rule:')}</strong> {result.fallback_guide.emergency_action}
                    </p>
                  </div>
                )}

                <p className="model-limit-note">
                  <AlertTriangle size={14} /> {result.limitations}
                </p>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
