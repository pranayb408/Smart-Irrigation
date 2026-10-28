import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Settings as SettingsIcon, Server, Database, BrainCircuit, ShieldCheck,
  Save, AlertTriangle, CheckCircle2, ExternalLink, HelpCircle,
  Eye, Droplets, BookOpen, Sliders
} from 'lucide-react';
import { API_BASE, api } from '../services/api';
import Panel from '../components/Panel';

export default function Settings() {
  const { t } = useTranslation();
  const [health, setHealth] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [fields, setFields] = useState([]);
  const [error, setError] = useState('');

  // Local preferences
  const [farmName, setFarmName] = useState(() => localStorage.getItem('agrisense-farm-name') || 'Green Acres Demo Farm');
  const [location, setLocation] = useState(() => localStorage.getItem('agrisense-location') || 'Punjab, India');

  // Configurable irrigation thresholds
  const [thresholdMoistureMin, setThresholdMoistureMin] = useState(() =>
    Number(localStorage.getItem('agrisense-thresh-moisture-min')) || 28
  );
  const [thresholdMoistureMax, setThresholdMoistureMax] = useState(() =>
    Number(localStorage.getItem('agrisense-thresh-moisture-max')) || 65
  );
  const [rainDelayBuffer, setRainDelayBuffer] = useState(() =>
    Number(localStorage.getItem('agrisense-rain-delay-buffer')) || 5.0
  );
  const [volumeUnit, setVolumeUnit] = useState(() =>
    localStorage.getItem('agrisense-unit-volume') || 'liters'
  );
  const [tempUnit, setTempUnit] = useState(() =>
    localStorage.getItem('agrisense-unit-temp') || 'celsius'
  );

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([api.health(), api.modelMetrics(), api.fields()])
      .then(([h, m, f]) => {
        setHealth(h);
        setMetrics(m);
        setFields(f || []);
      })
      .catch((err) => setError(err.message));
  }, []);

  function saveSettings(event) {
    event.preventDefault();
    localStorage.setItem('agrisense-farm-name', farmName);
    localStorage.setItem('agrisense-location', location);
    localStorage.setItem('agrisense-thresh-moisture-min', thresholdMoistureMin);
    localStorage.setItem('agrisense-thresh-moisture-max', thresholdMoistureMax);
    localStorage.setItem('agrisense-rain-delay-buffer', rainDelayBuffer);
    localStorage.setItem('agrisense-unit-volume', volumeUnit);
    localStorage.setItem('agrisense-unit-temp', tempUnit);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="page-content">
      <div className="page-intro">
        <div className="intro-icon slate-icon">
          <SettingsIcon size={22} />
        </div>
        <div>
          <div className="eyebrow">{t('settings.eyebrow', 'SETTINGS & CONTINGENCY GUIDANCE')}</div>
          <h2>{t('settings.title', 'System Configuration & Irrigation Thresholds')}</h2>
          <p>
            {t('settings.subtitle', 'Configure farm display preferences, irrigation triggers, and review offline USDA soil testing fallback procedures.')}
          </p>
        </div>
      </div>

      {error && (
        <div className="notice notice-error">
          <AlertTriangle size={18} />
          <div>
            <strong>{t('common.error', 'System Check Warning')}</strong>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Fallback Protocol: Feel & Appearance Soil Test Guide */}
      <Panel
        title={t('settings.fallbackTitle', 'Offline Fallback Guide: \'Feel and Appearance\' Soil Moisture Test')}
        subtitle={t('settings.fallbackSubtitle', 'Standard agronomic USDA/NRCS manual inspection protocol when sensor data is missing or stale.')}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '14px', marginBottom: '16px' }}>
          <div style={{ background: '#fdfbf7', border: '1px solid #f3ece0', borderRadius: '10px', padding: '14px' }}>
            <strong style={{ display: 'block', fontSize: '12px', color: '#825e24', marginBottom: '6px' }}>
              {t('settings.sandyTitle', 'Sandy / Light Soil')}
            </strong>
            <p style={{ fontSize: '10px', color: '#68593a', lineHeight: '1.6', margin: 0 }}>
              <strong>Dry (&lt;10%):</strong> Sand flows loosely between fingers, cannot hold any ball shape.
              <br />
              <strong>Moist (10–18%):</strong> Forms a very fragile ball under heavy palm pressure that falls apart when tossed.
              <br />
              <strong>Wet (&gt;18%):</strong> Leaves wet outline on hand; free water appears.
            </p>
          </div>

          <div style={{ background: '#f6faf7', border: '1px solid #e1efe5', borderRadius: '10px', padding: '14px' }}>
            <strong style={{ display: 'block', fontSize: '12px', color: '#276846', marginBottom: '6px' }}>
              {t('settings.loamyTitle', 'Loamy / Medium Soil')}
            </strong>
            <p style={{ fontSize: '10px', color: '#3f5d4e', lineHeight: '1.6', margin: 0 }}>
              <strong>Dry (&lt;15%):</strong> Crumbles easily, powdery feel, hard clods cannot be molded.
              <br />
              <strong>Moist (18–33%):</strong> Forms a firm ball, pliable, can form a 1-inch ribbon before breaking.
              <br />
              <strong>Saturated (&gt;35%):</strong> Forms a shiny ball that easily deforms; water glistens on hand.
            </p>
          </div>

          <div style={{ background: '#fbf7f6', border: '1px solid #f4eae7', borderRadius: '10px', padding: '14px' }}>
            <strong style={{ display: 'block', fontSize: '12px', color: '#8e4b3c', marginBottom: '6px' }}>
              {t('settings.clayTitle', 'Clay / Heavy Soil')}
            </strong>
            <p style={{ fontSize: '10px', color: '#68453e', lineHeight: '1.6', margin: 0 }}>
              <strong>Dry (&lt;22%):</strong> Hard, cracked surface clods; difficult to break with bare hands.
              <br />
              <strong>Moist (25–40%):</strong> Forms a dense, cohesive ball; forms a long ribbon &gt;2 inches without cracking.
              <br />
              <strong>Saturated (&gt;42%):</strong> Very sticky; adheres heavily to tools and fingers.
            </p>
          </div>
        </div>

        <div style={{ background: '#f4f7f5', border: '1px solid #dfe9e2', borderRadius: '10px', padding: '12px 14px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <Eye size={18} style={{ color: '#2b8254', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '11px', color: '#385544', lineHeight: '1.55' }}>
            <strong>{t('settings.visualStressTitle', 'Visual Crop Stress Indicators:')}</strong>
            <br />
            • If foliage wilts before 10:00 AM or remains wilted overnight, root-zone moisture is severely depleted. Irrigate immediately.
            <br />
            • If wilting occurs only during peak afternoon heat (1:00 PM – 3:00 PM) but recovers by dusk, it is temporary atmospheric heat stress; check soil moisture before adding excess water.
          </div>
        </div>
      </Panel>

      <div className="content-grid settings-grid">
        {/* Farm & Irrigation Threshold Settings */}
        <Panel title={t('settings.formTitle', 'Configurable Display & Irrigation Thresholds')} subtitle={t('settings.formSubtitle', 'Adjust local operational triggers and units.')}>
          <form className="field-form" onSubmit={saveSettings}>
            <div className="form-row">
              <label className="form-field">
                <span>{t('settings.farmName', 'Farm Name')}</span>
                <input value={farmName} onChange={(e) => setFarmName(e.target.value)} maxLength={80} required />
              </label>
              <label className="form-field">
                <span>{t('settings.agriculturalRegion', 'Agricultural Region')}</span>
                <input value={location} onChange={(e) => setLocation(e.target.value)} maxLength={80} required />
              </label>
            </div>

            <div className="form-section-title">
              <span>01</span> {t('settings.sec01Triggers', 'Irrigation Triggers')}
            </div>

            <div className="form-row">
              <label className="form-field">
                <span>{t('settings.dryStressThreshold', 'Dry Stress Alert Threshold (%)')}</span>
                <input
                  type="number"
                  min="10"
                  max="50"
                  value={thresholdMoistureMin}
                  onChange={(e) => setThresholdMoistureMin(Number(e.target.value))}
                  required
                />
                <small>{t('settings.dryStressHelp', 'Alert triggers when moisture falls below this level (default: 28%)')}</small>
              </label>

              <label className="form-field">
                <span>{t('settings.fieldCapacityTarget', 'Target Field Capacity (%)')}</span>
                <input
                  type="number"
                  min="40"
                  max="90"
                  value={thresholdMoistureMax}
                  onChange={(e) => setThresholdMoistureMax(Number(e.target.value))}
                  required
                />
                <small>{t('settings.fieldCapacityHelp', 'Upper optimum moisture boundary (default: 65%)')}</small>
              </label>
            </div>

            <div className="form-section-title form-section-spaced">
              <span>02</span> {t('settings.sec02Weather', 'Weather Buffer & Display Units')}
            </div>

            <div className="form-row">
              <label className="form-field">
                <span>{t('settings.rainDelayBuffer', 'Rain Delay Buffer (mm)')}</span>
                <input
                  type="number"
                  min="0"
                  max="50"
                  step="0.5"
                  value={rainDelayBuffer}
                  onChange={(e) => setRainDelayBuffer(Number(e.target.value))}
                  required
                />
                <small>{t('settings.rainDelayHelp', 'Forecasted rain that postpones irrigation (default: 5.0 mm)')}</small>
              </label>

              <label className="form-field">
                <span>{t('settings.waterVolumeUnit', 'Water Volume Unit')}</span>
                <select value={volumeUnit} onChange={(e) => setVolumeUnit(e.target.value)}>
                  <option value="liters">{t('common.liters', 'Liters')} ({t('common.litersUnit', 'L')})</option>
                  <option value="cubic_meters">Cubic Meters ({t('common.cubicMetersUnit', 'm³')})</option>
                </select>
              </label>
            </div>

            <div className="field-help-box">
              <ShieldCheck size={17} />
              <p>{t('settings.preferencesHelp', 'Preferences and threshold adjustments are stored safely in local browser storage.')}</p>
            </div>

            <button type="submit" className="button button-primary">
              {saved ? <CheckCircle2 size={16} /> : <Save size={16} />}
              {saved ? t('settings.preferencesSaved', 'Preferences saved successfully') : t('settings.savePreferences', 'Save preferences')}
            </button>
          </form>
        </Panel>

        {/* System & Hardware Health */}
        <Panel title={t('settings.systemHealthTitle', 'System & Hardware Health')} subtitle={t('settings.systemHealthSubtitle', 'Connections between system services and storage')}>
          <div className="system-list">
            <div className="system-row">
              <span className="system-icon"><Server size={18} /></span>
              <span>
                <strong>{t('settings.fastApiBackend', 'FastAPI Backend')}</strong>
                <small>{API_BASE}</small>
              </span>
              <span className={`system-status ${health ? 'ok' : error ? 'bad' : 'pending'}`}>
                <i />{health ? t('settings.connected', 'Connected') : error ? t('settings.offline', 'Offline') : 'Checking'}
              </span>
            </div>

            <div className="system-row">
              <span className="system-icon"><Database size={18} /></span>
              <span>
                <strong>{t('settings.databaseEngine', 'Database Engine')}</strong>
                <small>{health?.database === 'postgresql' ? 'PostgreSQL (Cloud Database)' : 'SQLite (Local Database)'}</small>
              </span>
              <span className={`system-status ${health ? 'ok' : error ? 'bad' : 'pending'}`}>
                <i />{health ? t('settings.available', 'Available') : error ? 'Unknown' : 'Checking'}
              </span>
            </div>

            <div className="system-row">
              <span className="system-icon"><BrainCircuit size={18} /></span>
              <span>
                <strong>{t('settings.aiEngine', 'AI & Agronomic Engine')}</strong>
                <small>Random Forest ML + FAO-56 Soil Water Depletion</small>
              </span>
              <span className={`system-status ${metrics?.classifier && metrics?.regressor ? 'ok' : 'pending'}`}>
                <i />{metrics?.classifier && metrics?.regressor ? t('settings.trained', 'Trained') : t('settings.onDemand', 'On demand')}
              </span>
            </div>
          </div>
          <a className="docs-link" href={`${API_BASE}/docs`} target="_blank" rel="noreferrer">
            {t('settings.swaggerDocs', 'Open Interactive Swagger API Documentation')} <ExternalLink size={15} />
          </a>
        </Panel>
      </div>

      <Panel title={t('settings.academicScopeTitle', 'Project Credentials & Academic Scope')} subtitle={t('settings.academicScopeSubtitle', 'Context for evaluators and technical mentors')}>
        <div className="about-grid">
          <div>
            <span>PROJECT</span>
            <strong>AI Smart Irrigation & Water Conservation</strong>
          </div>
          <div>
            <span>ACADEMIC LEVEL</span>
            <strong>Third-Year B.Tech AI / ML Major Project</strong>
          </div>
          <div>
            <span>HYBRID ARCHITECTURE</span>
            <strong>Random Forest ML Classifier/Regressor + FAO-56 Penman-Monteith Agronomic Engine</strong>
          </div>
          <div>
            <span>HARDWARE CAPABILITY</span>
            <strong>ESP32 DevKit Telemetry via HTTP REST (JSON Ingestion Endpoint)</strong>
          </div>
        </div>

        <div className="notice notice-warning settings-warning">
          <AlertTriangle size={18} />
          <div>
            <strong>Responsible Agricultural Disclaimer</strong>
            <span>
              {t('settings.disclaimer', 'This application is an educational decision-support prototype. It demonstrates how machine learning, soil physics, and IoT telemetry work together to conserve water. Recommendations must be cross-checked with local agronomic extension services before operating physical pumps.')}
            </span>
          </div>
        </div>
      </Panel>
    </div>
  );
}
