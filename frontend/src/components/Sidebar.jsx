import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Sprout, LayoutDashboard, Layers, BrainCircuit, Droplets,
  BarChart3, Activity, Settings, ChevronLeft, Stethoscope
} from 'lucide-react';

export default function Sidebar({ open, onClose }) {
  const { t } = useTranslation();

  const links = [
    { to: '/', label: t('nav.overview', 'Overview'), icon: LayoutDashboard, end: true },
    { to: '/fields', label: t('nav.fields', 'Fields & Farm Setup'), icon: Layers },
    { to: '/prediction', label: t('nav.prediction', 'Decision Support'), icon: BrainCircuit, tag: t('nav.aiTag', 'AI') },
    { to: '/crop-doctor', label: t('nav.cropDoctor', 'AI Crop Doctor'), icon: Stethoscope, tag: t('nav.aiTag', 'AI') },
    { to: '/budget', label: t('nav.budget', 'Water Budget & Logs'), icon: Droplets },
    { to: '/analytics', label: t('nav.analytics', 'Water Analytics'), icon: BarChart3 },
    { to: '/history', label: t('nav.sensors', 'Sensors & IoT'), icon: Activity },
    { to: '/settings', label: t('nav.settings', 'Settings & Fallbacks'), icon: Settings },
  ];

  return <>
    <div className={`sidebar-scrim ${open ? 'show' : ''}`} onClick={onClose} />
    <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
      <div className="brand">
        <div className="brand-mark"><Sprout size={23} strokeWidth={2.3} /></div>
        <div>
          <div className="brand-name">{t('common.appTitle', 'AgriSense')}<span>{t('common.appTag', 'AI')}</span></div>
          <div className="brand-subtitle">{t('common.appSubtitle', 'PRECISION IRRIGATION')}</div>
        </div>
        <button className="sidebar-close icon-button" onClick={onClose} aria-label={t('common.close', 'Close')}>
          <ChevronLeft size={18} />
        </button>
      </div>

      <div className="workspace-label">{t('nav.farmManagement', 'FARM MANAGEMENT')}</div>
      <nav className="side-nav" aria-label="Main navigation">
        {links.map(({ to, label, icon: Icon, end, tag }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onClose}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <Icon size={18} strokeWidth={1.9} />
            <span>{label}</span>
            {tag && <span className="nav-new">{tag}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-spacer" />

      <div className="water-card">
        <div className="water-card-icon"><Droplets size={18} /></div>
        <div className="water-card-title">{t('common.everyDropCounts', 'Every Drop Counts')}</div>
        <p>{t('common.everyDropDesc', 'Combining soil physics & ML to conserve groundwater and energy.')}</p>
        <div className="water-card-line"><span>{t('common.precisionAgriculture', 'Precision Agriculture')}</span><span>✦</span></div>
      </div>

      <div className="sidebar-user">
        <div className="avatar">AF</div>
        <div className="user-meta">
          <strong>AgriSense</strong>
          <span>{t('common.liveSystemActive', 'Live System Active')}</span>
        </div>
        <span className="status-dot" title="System Online" />
      </div>
    </aside>
  </>;
}
