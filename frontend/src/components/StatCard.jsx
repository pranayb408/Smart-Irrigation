import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

export default function StatCard({ label, value, unit, note, icon: Icon, tone = 'green', trend, trendLabel }) {
  return <section className="stat-card">
    <div className="stat-card-top"><span className="stat-label">{label}</span><span className={`stat-icon ${tone}`}><Icon size={20} strokeWidth={1.9} /></span></div>
    <div className="stat-value-row"><strong>{value}</strong>{unit && <span>{unit}</span>}</div>
    <div className="stat-card-bottom"><span>{note}</span>{trend !== undefined && <span className={`trend ${trend >= 0 ? 'trend-up' : 'trend-down'}`}>{trend >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{Math.abs(trend)}% <span>{trendLabel || 'vs last period'}</span></span>}</div>
  </section>;
}
