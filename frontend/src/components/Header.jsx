import { Menu, Layers, Leaf, Globe } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, changeLanguage } from '../i18n';

export default function Header({ onMenu, activeField, fields = [], onSelectField }) {
  const location = useLocation();
  const { t, i18n } = useTranslation();

  const getPageInfo = () => {
    switch (location.pathname) {
      case '/':
        return {
          title: t('nav.overview', 'Overview'),
          subtitle: t('dashboard.welcomeCopy', 'Real-time telemetry, soil moisture depletion modeling, and field irrigation recommendations.'),
        };
      case '/fields':
        return {
          title: t('nav.fields', 'Fields & Farm Setup'),
          subtitle: t('dashboard.shortcutFieldsDesc', 'Update area, crop stages, and pump flow rates'),
        };
      case '/prediction':
        return {
          title: t('prediction.title', 'Irrigation Decision Support Workspace'),
          subtitle: t('prediction.subtitle', 'Combines FAO-56 soil-water physics with Random Forest machine learning to answer the farmer\'s core questions.'),
        };
      case '/budget':
        return {
          title: t('nav.budget', 'Water Budget & Logs'),
          subtitle: t('dashboard.waterUseHistorySubtitle', 'Recent completed irrigation sessions'),
        };
      case '/analytics':
        return {
          title: t('analytics.title', 'Analytics & Performance Insights'),
          subtitle: t('analytics.subtitle', 'Review recorded sensor trends, actual water usage, irrigation event logs, and verified ML evaluation metrics.'),
        };
      case '/history':
        return {
          title: t('sensors.title', 'Sensor History & IoT Feeds'),
          subtitle: t('sensors.subtitle', 'Record manual observations or inspect automated telemetry from ESP32 field nodes with calibration curves.'),
        };
      case '/settings':
        return {
          title: t('settings.title', 'System Configuration & Irrigation Thresholds'),
          subtitle: t('settings.subtitle', 'Configure farm display preferences, irrigation triggers, and review offline USDA soil testing fallback procedures.'),
        };
      default:
        return {
          title: t('nav.overview', 'Overview'),
          subtitle: t('dashboard.welcomeCopy', 'Real-time telemetry, soil moisture depletion modeling, and field irrigation recommendations.'),
        };
    }
  };

  const { title, subtitle } = getPageInfo();
  const currentLang = i18n.language || 'en';

  return (
    <header className="topbar">
      <div className="topbar-title-group">
        <button className="icon-button menu-toggle" onClick={onMenu} aria-label={t('common.appTitle', 'AgriSense')}>
          <Menu size={21} />
        </button>
        <div>
          <div className="breadcrumb">
            {t('nav.farmManagement', 'FARM MANAGEMENT')} <span>/</span> <strong>{title}</strong>
          </div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </div>

      <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        {/* Language Selector Dropdown */}
        <div
          className="language-selector-pill"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: '#ffffff',
            border: '1.5px solid #277850',
            padding: '5px 10px',
            borderRadius: '10px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}
        >
          <Globe size={15} style={{ color: '#277850', flexShrink: 0 }} />
          <select
            value={currentLang}
            onChange={(e) => changeLanguage(e.target.value)}
            aria-label="Select Language"
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '12px',
              fontWeight: '700',
              color: '#1b4332',
              outline: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.nativeName} ({lang.label})
              </option>
            ))}
          </select>
        </div>

        {fields.length > 0 && onSelectField && (
          <div
            className="field-selector-pill"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#f4f8f4',
              border: '1px solid #e1ebe3',
              padding: '6px 12px',
              borderRadius: '10px',
            }}
          >
            <Layers size={15} style={{ color: '#277850' }} />
            <select
              value={activeField?.id || ''}
              onChange={(e) => {
                const found = fields.find((f) => f.id === Number(e.target.value));
                if (found) onSelectField(found);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '11px',
                fontWeight: '700',
                color: '#274433',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="">{t('common.allFields', 'All Fields')}</option>
              {fields.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({t(`crops.${f.crop_type}`, f.crop_type)} · {f.area_acres} {t('common.acres', 'ac')})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="environment-chip">
          <span className="live-pulse" /> {t('common.liveSystemActive', 'Live System Active')}
        </div>

        <div className="topbar-leaf" title={t('common.appTitle', 'AgriSense')}>
          <Leaf size={18} />
        </div>
      </div>
    </header>
  );
}
