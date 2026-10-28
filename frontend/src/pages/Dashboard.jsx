import { useEffect, useState } from 'react';
import {
  Activity, Droplets, Leaf, Thermometer, ArrowUpRight, Plus, BrainCircuit,
  CloudRain, CircleAlert, CheckCircle2, Zap, Clock, ShieldCheck, Layers,
  Calendar, Waves
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import StatCard from '../components/StatCard';
import Panel from '../components/Panel';
import MoistureChart from '../components/MoistureChart';

const formatTime = (value, lang = 'en') => {
  if (!value) return '—';
  const locale = lang === 'hi' ? 'hi-IN' : lang === 'mr' ? 'mr-IN' : lang === 'gu' ? 'gu-IN' : 'en-IN';
  try {
    return new Date(value).toLocaleString(locale, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return new Date(value).toLocaleString();
  }
};

export default function Dashboard({ activeField, fields = [] }) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'en';

  const [summary, setSummary] = useState(null);
  const [readings, setReadings] = useState([]);
  const [latestPrediction, setLatestPrediction] = useState(null);
  const [irrigationHistory, setIrrigationHistory] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [simulating, setSimulating] = useState(false);
  const [simNotice, setSimNotice] = useState('');

  async function loadDashboard() {
    try {
      const [dash, readingResponse, predResponse, logResponse] = await Promise.all([
        api.dashboard(),
        api.readings(6),
        api.predictions(1),
        api.irrigationLogs(5),
      ]);
      setSummary(dash);
      setReadings(readingResponse.items || []);
      setLatestPrediction(predResponse?.items?.[0] || null);
      setIrrigationHistory(logResponse?.items || []);
      setStatus('online');
    } catch (err) {
      setError(err.message);
      setStatus('offline');
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  async function handleQuickSimulate() {
    setSimulating(true);
    setSimNotice('');
    try {
      const res = await api.simulateReading(activeField?.id);
      setSimNotice(res.message || t('sensors.telemetryGenerated', 'Simulated live telemetry reading recorded.'));
      await loadDashboard();
    } catch (err) {
      setError(err.message);
    } finally {
      setSimulating(false);
    }
  }

  const chartData = (summary?.moisture_trend || []).map((item) => ({
    ...item,
    day: new Date(`${item.day}T12:00:00`).toLocaleDateString(
      currentLang === 'hi' ? 'hi-IN' : currentLang === 'mr' ? 'mr-IN' : currentLang === 'gu' ? 'gu-IN' : 'en-IN',
      { month: 'short', day: 'numeric' }
    ),
  }));

  const latest = summary?.latest_reading;
  const isDry = latest && latest.soil_moisture < 28.0;

  return (
    <div className="page-content">
      <div className="welcome-row">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" /> {t('dashboard.eyebrow', 'PRECISION FARMING WORKSPACE')}
          </div>
          <h2 className="welcome-title">
            {t('dashboard.welcomeTitle', 'Grow Smarter,')} <em>{t('dashboard.welcomeHighlight', 'Conserve Every Drop.')}</em>
          </h2>
          <p className="welcome-copy">
            {t('dashboard.welcomeCopy', 'Real-time telemetry, soil moisture depletion modeling, and field irrigation recommendations.')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="button button-outline"
            onClick={handleQuickSimulate}
            disabled={simulating}
            title="Generate live simulated IoT reading"
          >
            {simulating ? <Activity className="spin" size={15} /> : <Zap size={15} />}
            {simulating ? t('dashboard.simulating', 'Simulating…') : t('dashboard.simulateTelemetry', 'Simulate Telemetry')}
          </button>
          <Link to="/prediction" className="button button-primary">
            <BrainCircuit size={16} /> {t('dashboard.runDecisionSupport', 'Run Decision Support')}
          </Link>
        </div>
      </div>

      {status === 'offline' && (
        <div className="notice notice-info">
          <CircleAlert size={18} />
          <div>
            <strong>Interactive Cloud Demo Mode</strong>
            <span>Active on mobile & public devices. Connected to on-device agronomic calculation engine.</span>
          </div>
        </div>
      )}

      {simNotice && (
        <div className="notice notice-success">
          <CheckCircle2 size={18} />
          <div>
            <strong>Live Telemetry Generated</strong>
            <span>{simNotice}</span>
          </div>
        </div>
      )}

      {/* Top Stat Cards */}
      <div className="stat-grid">
        <StatCard
          label={t('dashboard.statAvgMoisture', 'Average Soil Moisture')}
          value={summary ? `${summary.average_moisture}` : '—'}
          unit="%"
          note={t('dashboard.statAcrossNodes', 'Across active sensor nodes')}
          icon={Droplets}
          tone="green"
        />
        <StatCard
          label={t('dashboard.statTotalWater', 'Total Water Applied')}
          value={summary ? Number(summary.total_water_applied_liters || 0).toLocaleString() : '—'}
          unit={t('common.litersUnit', 'L')}
          note={t('dashboard.statTrackedInLogs', 'Tracked in irrigation logs')}
          icon={Leaf}
          tone="blue"
        />
        <StatCard
          label={t('dashboard.statEvaluations', 'Decision Evaluations')}
          value={summary ? summary.prediction_count : '—'}
          note={t('dashboard.statWaterAdvised', { count: summary?.irrigation_recommendations ?? 0, defaultValue: `${summary?.irrigation_recommendations ?? 0} advised watering` })}
          icon={BrainCircuit}
          tone="purple"
        />
        <StatCard
          label={t('dashboard.statFields', 'Managed Farm Fields')}
          value={summary ? summary.fields_count : '—'}
          note={t('dashboard.statRegisteredInDb', 'Registered in SQLite')}
          icon={Layers}
          tone="amber"
        />
      </div>

      {/* Latest Water Estimate Banner (When Available) */}
      {latestPrediction && (
        <div style={{
          background: latestPrediction.irrigation_needed ? '#f7fcf8' : '#f8fbfd',
          border: `1px solid ${latestPrediction.irrigation_needed ? '#d4edda' : '#d7eaf5'}`,
          borderRadius: '14px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: latestPrediction.irrigation_needed ? '#28a74520' : '#17a2b820',
              display: 'grid',
              placeItems: 'center',
              color: latestPrediction.irrigation_needed ? '#1e7e34' : '#117a8b'
            }}>
              <Droplets size={22} />
            </div>
            <div>
              <span style={{ fontSize: '10px', fontWeight: '800', letterSpacing: '0.05em', color: '#68786d', textTransform: 'uppercase' }}>
                {t('dashboard.latestEstimateTitle', { field: latestPrediction.field_name, defaultValue: `Latest AI Decision & Water Estimate · ${latestPrediction.field_name}` })}
              </span>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#274b34' }}>
                {latestPrediction.irrigation_needed
                  ? t('dashboard.irrigationRecommended', 'Irrigation Recommended')
                  : t('dashboard.noIrrigationIndicated', 'Adequate Moisture — No Irrigation Needed')}
                {' '}
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#68786d' }}>
                  ({formatTime(latestPrediction.timestamp, currentLang)})
                </span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#55695b' }}>
                {t('dashboard.estimatedWaterRequired', 'Estimated Water Required:')} <strong>{Number(latestPrediction.estimated_water_liters || 0).toLocaleString()} {t('common.liters', 'Liters')}</strong>
                {latestPrediction.runtime_minutes ? ` · ${t('dashboard.estimatedRuntime', 'Estimated Runtime:')} ${Math.round(latestPrediction.runtime_minutes)} ${t('common.minutes', 'minutes')}` : ''}
              </p>
            </div>
          </div>
          <Link to="/prediction" className="button button-soft" style={{ margin: 0 }}>
            {t('dashboard.runNewPrediction', 'Run New Prediction')} <ArrowUpRight size={14} />
          </Link>
        </div>
      )}

      {/* Middle Grid: Moisture Chart & Live Conditions Panel */}
      <div className="content-grid middle-grid">
        <Panel
          title={t('dashboard.trendTitle', 'Field Moisture Depletion & Weather (7-Day Trend)')}
          subtitle={t('dashboard.trendSubtitle', 'Historic sensor averages and rainfall events')}
          action={
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="chart-legend-item">
                <i style={{ background: '#25845a' }} /> {t('dashboard.legendMoisture', 'Soil moisture %')}
              </span>
            </div>
          }
        >
          <MoistureChart data={chartData} />
        </Panel>

        <Panel
          title={t('dashboard.statusTitle', 'Field Irrigation Status')}
          subtitle={t('dashboard.statusSubtitle', 'Real-time telemetry and threshold assessment')}
          className="live-status-card"
        >
          {latest ? (
            <>
              <div className="condition-head">
                <div className="field-badge-icon">
                  <Leaf size={19} />
                </div>
                <div>
                  <strong>{latest.field_name}</strong>
                  <span>{t('dashboard.readingTime', { time: formatTime(latest.timestamp, currentLang), defaultValue: `Reading: ${formatTime(latest.timestamp, currentLang)}` })}</span>
                </div>
                <span className={`condition-tag ${isDry ? 'tag-dry' : ''}`} style={{ background: isDry ? '#fcedea' : '#e8f4eb', color: isDry ? '#bf533b' : '#39835b' }}>
                  <i style={{ background: isDry ? '#c75940' : '#3ca56d' }} />
                  {isDry ? t('dashboard.waterStressAlert', 'Water Stress Alert') : t('dashboard.moistureSafe', 'Moisture Safe')}
                </span>
              </div>

              <div className="condition-metrics">
                <div>
                  <span>
                    <Droplets size={15} /> {t('dashboard.soilMoisture', 'Soil Moisture')}
                  </span>
                  <strong>{latest.soil_moisture}%</strong>
                  <div className="mini-progress">
                    <i style={{ width: `${Math.min(100, latest.soil_moisture)}%`, background: isDry ? '#d4694e' : undefined }} />
                  </div>
                </div>
                <div>
                  <span>
                    <Thermometer size={15} /> {t('dashboard.temperature', 'Temperature')}
                  </span>
                  <strong>{latest.temperature}°C</strong>
                </div>
                <div>
                  <span>
                    <CloudRain size={15} /> {t('dashboard.humidity', 'Air Humidity')}
                  </span>
                  <strong>{latest.humidity}%</strong>
                </div>
                <div>
                  <span>
                    <CloudRain size={15} /> {t('dashboard.rainfall', 'Recent Rainfall')}
                  </span>
                  <strong>{latest.rainfall} {t('common.mm', 'mm')}</strong>
                </div>
              </div>

              <div className="condition-footer">
                <span>{t('dashboard.cropLabel', 'Crop:')} <strong>{t(`crops.${latest.crop_type}`, latest.crop_type)}</strong> ({t(`growthStages.${latest.growth_stage}`, latest.growth_stage)})</span>
                <span>{t('dashboard.soilLabel', 'Soil:')} <strong>{t(`soilTypes.${latest.soil_type}`, latest.soil_type)}</strong></span>
              </div>
            </>
          ) : (
            <div className="empty-state">{t('dashboard.noReadings', 'No readings recorded yet.')}</div>
          )}

          <Link to="/prediction" className="button button-soft button-full" style={{ marginTop: 'auto' }}>
            <BrainCircuit size={16} /> {t('dashboard.evaluateNeedButton', 'Evaluate Field Irrigation Need')}
          </Link>
        </Panel>
      </div>

      {/* Lower Grid: Recent Readings & Water-Use History */}
      <div className="content-grid lower-grid">
        <Panel
          title={t('dashboard.recentReadingsTitle', 'Recent Field Readings')}
          subtitle={t('dashboard.recentReadingsSubtitle', 'Measurements from field sensors and IoT nodes')}
          action={
            <Link to="/history" className="text-link">
              {t('common.viewHistory', 'View History')} <ArrowUpRight size={14} />
            </Link>
          }
        >
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('dashboard.colField', 'Field')}</th>
                  <th>{t('dashboard.colSource', 'Source')}</th>
                  <th>{t('dashboard.colMoisture', 'Soil Moisture')}</th>
                  <th>{t('dashboard.colTemp', 'Temp.')}</th>
                  <th>{t('dashboard.colRecorded', 'Recorded')}</th>
                </tr>
              </thead>
              <tbody>
                {readings.map((reading) => (
                  <tr key={reading.id}>
                    <td>
                      <div className="field-table-name">
                        <span className="field-table-icon">
                          <Leaf size={14} />
                        </span>
                        <strong>{reading.field_name}</strong>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '9px', fontWeight: '700', color: reading.source_type === 'esp32_iot' ? '#278051' : '#68786d' }}>
                        {reading.source_type === 'esp32_iot' ? 'ESP32 Node' : reading.source_type === 'simulated' ? 'Simulated' : 'Manual'}
                      </span>
                    </td>
                    <td>
                      <span className={`moisture-pill ${reading.soil_moisture < 28 ? 'low' : reading.soil_moisture > 70 ? 'high' : 'normal'}`}>
                        {reading.soil_moisture}%
                      </span>
                    </td>
                    <td>{reading.temperature}°C</td>
                    <td className="muted-cell">{formatTime(reading.timestamp, currentLang)}</td>
                  </tr>
                ))}
                {readings.length === 0 && (
                  <tr>
                    <td colSpan={5} className="empty-cell">
                      {t('dashboard.noReadings', 'No readings available.')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel
          title={t('dashboard.waterUseHistoryTitle', 'Water-Use History')}
          subtitle={t('dashboard.waterUseHistorySubtitle', 'Recent completed irrigation sessions')}
          action={
            <Link to="/budget" className="text-link">
              {t('common.waterRecords', 'Water Records')} <ArrowUpRight size={14} />
            </Link>
          }
        >
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('dashboard.colField', 'Field')}</th>
                  <th>{t('dashboard.colWaterApplied', 'Water Applied')}</th>
                  <th>{t('dashboard.colRuntime', 'Runtime')}</th>
                  <th>{t('dashboard.colMethod', 'Method')}</th>
                  <th>{t('dashboard.colDate', 'Date')}</th>
                </tr>
              </thead>
              <tbody>
                {irrigationHistory.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.field_name}</strong></td>
                    <td>
                      <span className="moisture-pill normal">
                        {(item.liters_applied || item.water_volume || 0).toLocaleString()} {t('common.litersUnit', 'L')}
                      </span>
                    </td>
                    <td>{Math.round(item.duration_minutes || item.irrigation_duration || 0)} {t('common.minutes', 'min')}</td>
                    <td>{t(`irrigationMethods.${item.method}`, item.method || 'Drip')}</td>
                    <td className="muted-cell">{formatTime(item.timestamp, currentLang)}</td>
                  </tr>
                ))}
                {irrigationHistory.length === 0 && (
                  <tr>
                    <td colSpan={5} className="empty-cell">{t('dashboard.noSessions', 'No irrigation sessions recorded.')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <div className="demo-disclaimer">
        <CircleAlert size={15} />
        <span>
          {t('dashboard.disclaimer', 'Educational prototype: Decision recommendations are generated using soil-water balance equations (FAO-56) and a Random Forest AI model trained on educational data. Always verify soil moisture and crop symptoms in the field before pumping.')}
        </span>
      </div>
    </div>
  );
}
