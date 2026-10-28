import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart3, Droplets, Gauge, Leaf, AlertTriangle, TrendingUp,
  Clock, CheckCircle2, Waves, Thermometer, CloudRain
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area, Line
} from 'recharts';
import { api } from '../services/api';
import Panel from '../components/Panel';
import StatCard from '../components/StatCard';

const PIE_COLORS = ['#25845a', '#74b99a', '#c5d8a8', '#e5c181', '#9b9be0', '#6366f1'];

const formatTime = (ts, lang = 'en') => {
  if (!ts) return '—';
  const locale = lang === 'hi' ? 'hi-IN' : lang === 'mr' ? 'mr-IN' : lang === 'gu' ? 'gu-IN' : 'en-IN';
  try {
    return new Date(ts).toLocaleString(locale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return new Date(ts).toLocaleString();
  }
};

export default function Analytics() {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'en';

  const [data, setData] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [irrigationLogs, setIrrigationLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.analytics(),
      api.modelMetrics(),
      api.irrigationLogs(25),
    ])
      .then(([analytics, modelMetrics, logs]) => {
        setData(analytics);
        setMetrics(modelMetrics);
        setIrrigationLogs(logs?.items || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const fields = data?.fields || [];
  const crops = data?.crop_usage || [];
  const prediction = data?.predictions || {};
  const waterApplied = data?.water_applied_by_field || [];
  const classifier = metrics?.classifier;
  const regressor = metrics?.regressor;

  // Format sensor readings series for the trend chart (sampled to latest 30 points)
  const locale = currentLang === 'hi' ? 'hi-IN' : currentLang === 'mr' ? 'mr-IN' : currentLang === 'gu' ? 'gu-IN' : 'en-IN';
  const sensorTrend = (data?.sensor_series || []).slice(-30).map((pt, i) => {
    const d = new Date(pt.timestamp);
    return {
      index: i + 1,
      time: d.toLocaleDateString(locale, { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString(locale, { hour: '2-digit' }),
      soil_moisture: pt.soil_moisture,
      temperature: pt.temperature,
      humidity: pt.humidity,
      rainfall: pt.rainfall,
    };
  });

  const totalWaterApplied = waterApplied.reduce((sum, w) => sum + (w.total_liters || 0), 0);

  return (
    <div className="page-content">
      <div className="page-intro">
        <div className="intro-icon mint-icon">
          <BarChart3 size={22} />
        </div>
        <div>
          <div className="eyebrow">{t('analytics.eyebrow', 'WATER INTELLIGENCE & EVALUATION')}</div>
          <h2>{t('analytics.title', 'Analytics & Performance Insights')}</h2>
          <p>
            {t('analytics.subtitle', 'Review recorded sensor trends, actual water usage, irrigation event logs, and verified ML evaluation metrics.')}
          </p>
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

      {/* Top Stat Cards */}
      <div className="stat-grid analytics-stat-grid">
        <StatCard
          label={t('analytics.savedPredictions', 'Saved Predictions')}
          value={prediction.total ?? '—'}
          note={t('analytics.savedPredictionsNote', 'Stored in SQLite database')}
          icon={BarChart3}
          tone="blue"
        />
        <StatCard
          label={t('analytics.irrigationAdvised', 'Irrigation Advised')}
          value={prediction.irrigation_count ?? '—'}
          note={t('analytics.irrigationAdvisedNote', 'Recommendations where water was needed')}
          icon={Droplets}
          tone="green"
        />
        <StatCard
          label={t('analytics.avgConfidence', 'Average Confidence')}
          value={prediction.average_confidence ?? '—'}
          unit="%"
          note={t('analytics.avgConfidenceNote', 'Across Random Forest outputs')}
          icon={Gauge}
          tone="purple"
        />
        <StatCard
          label={t('analytics.totalAppliedWater', 'Total Applied Water')}
          value={totalWaterApplied.toLocaleString()}
          unit={t('common.litersUnit', 'L')}
          note={t('analytics.totalAppliedWaterNote', 'From recorded irrigation logs')}
          icon={Leaf}
          tone="amber"
        />
      </div>

      {/* Chart 1: Soil Moisture Trend over Time (Recharts AreaChart) */}
      <Panel
        title={t('analytics.moistureDepletionTitle', 'Soil Moisture Depletion & Environmental Trends')}
        subtitle={t('analytics.moistureDepletionSubtitle', 'Chronological sensor readings recorded in SQLite (Latest 30 readings)')}
      >
        <div style={{ height: '300px', width: '100%', marginTop: '12px' }}>
          {sensorTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sensorTrend} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="moistureGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#25845a" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#25845a" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#edf1eb" strokeDasharray="3 5" vertical={false} />
                <XAxis dataKey="time" tick={{ fill: '#8b958e', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: '#8b958e', fontSize: 10 }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip
                  contentStyle={{ border: '1px solid #edf1eb', borderRadius: 12, fontSize: '11px' }}
                  formatter={(val, name) => [
                    name === 'soil_moisture' ? `${val}%` : `${val}°C`,
                    name === 'soil_moisture' ? t('dashboard.soilMoisture', 'Soil Moisture') : t('dashboard.temperature', 'Temperature'),
                  ]}
                />
                <Area type="monotone" dataKey="soil_moisture" name="soil_moisture" stroke="#25845a" strokeWidth={2.5} fill="url(#moistureGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">{t('dashboard.noReadings', 'Sensor trends will appear after readings are recorded.')}</div>
          )}
        </div>
      </Panel>

      {/* Charts Row: Water Usage by Field & Crop Distribution */}
      <div className="content-grid analytics-charts-grid">
        <Panel
          title={t('analytics.waterUsageByFieldTitle', 'Recorded Water Usage by Field (Liters)')}
          subtitle={t('analytics.waterUsageByFieldSubtitle', 'Total volume pumped according to completed irrigation logs')}
          className="analytics-chart-panel"
        >
          <div className="large-chart">
            {waterApplied.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={waterApplied} margin={{ top: 12, right: 12, left: -10, bottom: 0 }}>
                  <CartesianGrid stroke="#edf1eb" strokeDasharray="3 5" vertical={false} />
                  <XAxis dataKey="field_name" axisLine={false} tickLine={false} tick={{ fill: '#8b958e', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8b958e', fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}kL`} />
                  <Tooltip
                    contentStyle={{ border: '1px solid #edf1eb', borderRadius: 12, fontSize: '11px' }}
                    formatter={(val) => [`${Number(val).toLocaleString()} ${t('common.liters', 'Liters')}`, t('dashboard.colWaterApplied', 'Water Applied')]}
                  />
                  <Bar dataKey="total_liters" name="Water (Liters)" fill="#3173a5" radius={[6, 6, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state">{t('dashboard.noSessions', 'No irrigation applications recorded yet.')}</div>
            )}
          </div>
        </Panel>

        <Panel
          title={t('analytics.predictionsByCropTitle', 'Predictions by Crop Type')}
          subtitle={t('analytics.predictionsByCropSubtitle', 'Distribution of evaluated crop decision requests')}
          className="analytics-chart-panel"
        >
          <div className="donut-chart">
            {crops.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={crops.map((c) => ({ ...c, displayName: t(`crops.${c.crop_type}`, c.crop_type) }))}
                    dataKey="count"
                    nameKey="displayName"
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={88}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {crops.map((entry, index) => (
                      <Cell key={entry.crop_type} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ border: '1px solid #edf1eb', borderRadius: 12, fontSize: '11px' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" formatter={(value) => <span className="legend-text">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state">{t('prediction.noEvaluationPrompt', 'Run an AI prediction to build this chart.')}</div>
            )}
          </div>
        </Panel>
      </div>

      {/* Tables Row: Environmental Comparison & Irrigation History */}
      <div className="content-grid lower-grid">
        <Panel
          title={t('analytics.envSummaryTitle', 'Field Environmental Summary')}
          subtitle={t('analytics.envSummarySubtitle', 'Average moisture, temperature and cumulative rainfall per field')}
        >
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('analytics.colField', 'Field')}</th>
                  <th>{t('analytics.colReadings', 'Readings')}</th>
                  <th>{t('analytics.colAvgMoisture', 'Avg Moisture')}</th>
                  <th>{t('analytics.colAvgTemp', 'Avg Temp')}</th>
                  <th>{t('analytics.colTotalRain', 'Total Rain')}</th>
                </tr>
              </thead>
              <tbody>
                {fields.map((f) => (
                  <tr key={f.field_name}>
                    <td>
                      <div className="field-table-name">
                        <span className="field-table-icon">
                          <Leaf size={14} />
                        </span>
                        <strong>{f.field_name}</strong>
                      </div>
                    </td>
                    <td>{f.readings}</td>
                    <td>
                      <span className={`moisture-pill ${f.avg_moisture < 28 ? 'low' : 'normal'}`}>
                        {f.avg_moisture}%
                      </span>
                    </td>
                    <td>{f.avg_temperature}°C</td>
                    <td>{f.rainfall_total} {t('common.mm', 'mm')}</td>
                  </tr>
                ))}
                {fields.length === 0 && (
                  <tr>
                    <td colSpan="5" className="empty-cell">{t('dashboard.noReadings', 'No field metrics available.')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel
          title={t('analytics.recentHistoryTitle', 'Recent Irrigation History')}
          subtitle={t('analytics.recentHistorySubtitle', 'Completed water applications stored in SQLite')}
        >
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('analytics.colField', 'Field')}</th>
                  <th>{t('analytics.colVolumeApplied', 'Volume Applied')}</th>
                  <th>{t('analytics.colDuration', 'Duration')}</th>
                  <th>{t('analytics.colMethod', 'Method')}</th>
                  <th>{t('analytics.colDateTime', 'Date & Time')}</th>
                </tr>
              </thead>
              <tbody>
                {irrigationLogs.map((log) => (
                  <tr key={log.id}>
                    <td><strong>{log.field_name}</strong></td>
                    <td>
                      <span className="moisture-pill normal">
                        {(log.liters_applied || log.water_volume || 0).toLocaleString()} {t('common.litersUnit', 'L')}
                      </span>
                    </td>
                    <td>{Math.round(log.duration_minutes || log.irrigation_duration || 0)} {t('common.minutes', 'min')}</td>
                    <td>{t(`irrigationMethods.${log.method}`, log.method || 'Drip')}</td>
                    <td className="muted-cell">{formatTime(log.timestamp, currentLang)}</td>
                  </tr>
                ))}
                {irrigationLogs.length === 0 && (
                  <tr>
                    <td colSpan="5" className="empty-cell">{t('dashboard.noSessions', 'No irrigation events logged yet.')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      {/* Model Evaluation Metrics Section */}
      <div className="content-grid model-metrics-grid">
        <Panel
          title={t('analytics.classifierTitle', 'Classifier Evaluation Metrics')}
          subtitle={t('analytics.classifierSubtitle', 'Scikit-learn Random Forest Classifier · Irrigation Needed (Binary)')}
        >
          <div className="metrics-list">
            <div>
              <span>{t('analytics.accuracy', 'Held-out Accuracy')}</span>
              <strong>{classifier ? `${(classifier.accuracy * 100).toFixed(2)}%` : 'Not evaluated'}</strong>
            </div>
            <div>
              <span>{t('analytics.precision', 'Precision')}</span>
              <strong>{classifier ? `${(classifier.precision * 100).toFixed(2)}%` : '—'}</strong>
            </div>
            <div>
              <span>{t('analytics.recall', 'Recall')}</span>
              <strong>{classifier ? `${(classifier.recall * 100).toFixed(2)}%` : '—'}</strong>
            </div>
            <div>
              <span>{t('analytics.f1Score', 'F1 Score')}</span>
              <strong>{classifier ? `${(classifier.f1_score * 100).toFixed(2)}%` : '—'}</strong>
            </div>
            <div>
              <span>{t('analytics.testSamples', 'Test Samples')}</span>
              <strong>{classifier?.samples ?? '—'}</strong>
            </div>
          </div>
          {classifier?.confusion_matrix && (
            <div style={{ marginTop: '12px', fontSize: '10px', color: '#68786d' }}>
              <strong>{t('analytics.confusionMatrix', 'Confusion Matrix:')} </strong>
              TN: {classifier.confusion_matrix[0]?.[0]} | FP: {classifier.confusion_matrix[0]?.[1]} |
              FN: {classifier.confusion_matrix[1]?.[0]} | TP: {classifier.confusion_matrix[1]?.[1]}
            </div>
          )}
        </Panel>

        <Panel
          title={t('analytics.regressorTitle', 'Regressor Evaluation Metrics')}
          subtitle={t('analytics.regressorSubtitle', 'Scikit-learn Random Forest Regressor · Water Liters Per Acre')}
        >
          <div className="metrics-list">
            <div>
              <span>{t('analytics.mae', 'Mean Absolute Error (MAE)')}</span>
              <strong>{regressor ? `${regressor.mae_liters} ${t('common.litersUnit', 'L')}/acre` : 'Not evaluated'}</strong>
            </div>
            <div>
              <span>{t('analytics.rmse', 'Root Mean Squared Error (RMSE)')}</span>
              <strong>{regressor ? `${regressor.rmse_liters} ${t('common.litersUnit', 'L')}/acre` : '—'}</strong>
            </div>
            <div>
              <span>{t('analytics.r2Score', 'R-Squared Score (R²)')}</span>
              <strong>{regressor ? regressor.r2_score : '—'}</strong>
            </div>
            <div>
              <span>{t('analytics.testSamples', 'Test Samples')}</span>
              <strong>{regressor?.samples ?? '—'}</strong>
            </div>
          </div>
        </Panel>
      </div>

      <div className="demo-disclaimer">
        <AlertTriangle size={15} />
        <span>
          {t('analytics.disclaimer', 'Academic Evaluation Disclaimer: Model metrics were calculated on a held-out test split of reproducible synthetic sensor data generated for coursework. The scores represent pipeline integrity and validation separation, not live commercial farm observations.')}
        </span>
      </div>
    </div>
  );
}
