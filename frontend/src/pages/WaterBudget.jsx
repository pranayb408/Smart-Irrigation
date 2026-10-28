import { useState, useEffect } from 'react';
import {
  Droplets, Plus, Calendar, Clock, BarChart3, CheckCircle2,
  AlertTriangle, LoaderCircle, ArrowUpRight, ShieldCheck, Leaf,
  RotateCcw
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { api } from '../services/api';
import Panel from '../components/Panel';
import StatCard from '../components/StatCard';

const initialLogForm = {
  field_name: 'North Field',
  duration_minutes: 90,
  method: 'Drip',
  flow_rate_lpm: 50,
  operator_notes: '',
};

export default function WaterBudget() {
  const [budgetData, setBudgetData] = useState(null);
  const [fields, setFields] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState(initialLogForm);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [budgetRes, fieldsRes, logsRes] = await Promise.all([
        api.waterBudget(),
        api.fields(),
        api.irrigationLogs(50),
      ]);
      setBudgetData(budgetRes);
      setFields(fieldsRes || []);
      setLogs(logsRes.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function handleFieldChange(e) {
    const selectedName = e.target.value;
    const matched = fields.find((f) => f.name === selectedName);
    setForm((prev) => ({
      ...prev,
      field_name: selectedName,
      method: matched?.irrigation_method || prev.method,
      flow_rate_lpm: matched?.flow_rate_lpm || prev.flow_rate_lpm,
    }));
  }

  async function handleLogSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const liters = Math.round(form.duration_minutes * form.flow_rate_lpm);
      await api.logIrrigation({
        field_name: form.field_name,
        duration_minutes: form.duration_minutes,
        liters_applied: liters,
        method: form.method,
        flow_rate_lpm: form.flow_rate_lpm,
        operator_notes: form.operator_notes || null,
      });
      setSuccess(`Logged ${liters.toLocaleString()} Liters applied to ${form.field_name}.`);
      setForm(initialLogForm);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const weeklyTrend = (budgetData?.weekly_trend || []).map((w) => ({
    week: w.week,
    liters: Math.round(w.liters),
    sessions: w.sessions,
  }));

  const totalApplied = budgetData?.total_water_applied_liters || 0;
  const totalBudget = budgetData?.total_reference_budget_liters || 1;
  const totalSaved = budgetData?.estimated_water_saved_liters || 0;
  const percentUsed = budgetData?.overall_budget_percent_used || 0;

  return (
    <div className="page-content">
      <div className="welcome-row">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" /> WATER CONSERVATION & BENCHMARKING
          </div>
          <h2 className="welcome-title">
            Water Budget & <em>Applied Records</em>
          </h2>
          <p className="welcome-copy">
            Monitor cumulative water applications, benchmark against seasonal reference baselines, and verify water conservation.
          </p>
        </div>
      </div>

      {error && (
        <div className="notice notice-error">
          <AlertTriangle size={18} />
          <div>
            <strong>Error</strong>
            <span>{error}</span>
          </div>
        </div>
      )}

      {success && (
        <div className="notice notice-success">
          <CheckCircle2 size={18} />
          <div>
            <strong>Recorded</strong>
            <span>{success}</span>
          </div>
        </div>
      )}

      {/* Top Stat Cards */}
      <div className="stat-grid">
        <StatCard
          label="Total water applied"
          value={totalApplied.toLocaleString()}
          unit="L"
          note={`Approx. ${(totalApplied / 1000).toFixed(1)} m³ pumped`}
          icon={Droplets}
          tone="green"
        />
        <StatCard
          label="Seasonal budget used"
          value={`${percentUsed}%`}
          note={`of ${totalBudget.toLocaleString()} L total baseline`}
          icon={BarChart3}
          tone="blue"
        />
        <StatCard
          label="Estimated water saved"
          value={totalSaved.toLocaleString()}
          unit="L"
          note="vs conventional flood irrigation"
          icon={Leaf}
          tone="amber"
        />
        <StatCard
          label="Irrigation sessions"
          value={logs.length}
          note="Recorded in farm database"
          icon={Clock}
          tone="purple"
        />
      </div>

      {/* Middle Grid: Weekly Trend & Log Form */}
      <div className="content-grid">
        <Panel
          title="Weekly water usage trend"
          subtitle="Cumulative liters applied per week across all fields"
          className="chart-panel"
        >
          <div style={{ height: '220px', width: '100%' }}>
            {weeklyTrend.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid stroke="#edf1eb" strokeDasharray="3 5" vertical={false} />
                  <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: '#8b958e', fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8b958e', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ border: '1px solid #edf1eb', borderRadius: 12 }}
                    formatter={(val) => [`${Number(val).toLocaleString()} L`, 'Water applied']}
                  />
                  <Bar dataKey="liters" fill="#25845a" radius={[6, 6, 0, 0]} maxBarSize={38} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state">No irrigation sessions logged yet.</div>
            )}
          </div>
          <div className="chart-footnote">
            <span>Tracking helps identify over-irrigation before seasonal targets are exceeded.</span>
          </div>
        </Panel>

        {/* Log Irrigation Application Form */}
        <Panel title="Log irrigation application" subtitle="Record actual water pumped into a field.">
          <form onSubmit={handleLogSubmit} className="field-form">
            <label className="form-field full-width">
              <span>Field Name</span>
              <select name="field_name" value={form.field_name} onChange={handleFieldChange}>
                {fields.map((f) => (
                  <option key={f.id} value={f.name}>
                    {f.name} ({f.crop_type})
                  </option>
                ))}
              </select>
            </label>

            <div className="form-row">
              <label className="form-field">
                <span>Run Duration (Minutes)</span>
                <input
                  type="number"
                  min="5"
                  max="1440"
                  name="duration_minutes"
                  value={form.duration_minutes}
                  onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })}
                  required
                />
              </label>
              <label className="form-field">
                <span>Flow Rate (LPM)</span>
                <input
                  type="number"
                  min="5"
                  max="10000"
                  name="flow_rate_lpm"
                  value={form.flow_rate_lpm}
                  onChange={(e) => setForm({ ...form, flow_rate_lpm: Number(e.target.value) })}
                  required
                />
              </label>
            </div>

            <div style={{ background: '#f5faf6', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e3ede5', fontSize: '11px', color: '#274b34' }}>
              <span>Calculated Volume: </span>
              <strong>{Math.round(form.duration_minutes * form.flow_rate_lpm).toLocaleString()} Liters</strong>
              <small style={{ color: '#7c8e82', display: 'block', marginTop: '2px' }}>
                ({(form.duration_minutes / 60).toFixed(1)} hours at {form.flow_rate_lpm} L/min)
              </small>
            </div>

            <label className="form-field full-width">
              <span>Irrigation Method</span>
              <select
                name="method"
                value={form.method}
                onChange={(e) => setForm({ ...form, method: e.target.value })}
              >
                {['Drip', 'Sprinkler', 'Furrow', 'Basin'].map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </label>

            <label className="form-field full-width">
              <span>Operator Notes (Optional)</span>
              <input
                name="operator_notes"
                value={form.operator_notes}
                onChange={(e) => setForm({ ...form, operator_notes: e.target.value })}
                placeholder="e.g. Regular morning cycle via valve line 2"
              />
            </label>

            <button type="submit" className="button button-primary button-full" disabled={saving}>
              {saving ? <LoaderCircle className="spin" size={16} /> : <Plus size={16} />}
              {saving ? 'Saving Record…' : 'Record Irrigation Application'}
            </button>
          </form>
        </Panel>
      </div>

      {/* Field-by-Field Budget Progress */}
      <Panel title="Field budget compliance" subtitle="Progress towards defined seasonal reference targets">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
          {(budgetData?.fields_budget || []).map((f) => {
            const pct = f.budget_percent_used || 0;
            const isHigh = pct > 85;
            const isMedium = pct > 50;
            return (
              <div
                key={f.id}
                style={{
                  background: '#fcfdfb',
                  border: '1px solid #eef2ec',
                  borderRadius: '12px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <strong style={{ fontSize: '13px', color: '#273e30' }}>{f.name}</strong>
                  <span className={`moisture-pill ${isHigh ? 'low' : 'normal'}`}>
                    {pct}% Used
                  </span>
                </div>
                <div style={{ fontSize: '10px', color: '#7c8b80' }}>
                  <span>{f.crop_type} · {f.area_acres} acres · {f.irrigation_method}</span>
                </div>
                <div className="mini-progress" style={{ height: '7px', margin: '4px 0' }}>
                  <i style={{ width: `${Math.min(100, pct)}%`, background: isHigh ? '#cb6d49' : isMedium ? '#d4a24c' : '#278553' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#88988d' }}>
                  <span>Applied: <strong>{f.total_water_applied_liters?.toLocaleString()} L</strong></span>
                  <span>Budget: {f.reference_water_budget_l?.toLocaleString()} L</span>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* Past Irrigation Sessions Table */}
      <Panel title="Irrigation log history" subtitle={`${logs.length} logged application events`}>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Field</th>
                <th>Liters Applied</th>
                <th>Duration</th>
                <th>Method / Flow</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="muted-cell timestamp-cell">
                    {new Date(log.timestamp).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td>
                    <strong style={{ color: '#2b4736' }}>{log.field_name}</strong>
                  </td>
                  <td>
                    <span className="moisture-pill normal">
                      {Math.round(log.liters_applied).toLocaleString()} L
                    </span>
                  </td>
                  <td>{Math.round(log.duration_minutes)} mins</td>
                  <td>
                    {log.method} {log.flow_rate_lpm ? `(${log.flow_rate_lpm} L/min)` : ''}
                  </td>
                  <td style={{ color: '#829186', fontSize: '10px' }}>
                    {log.operator_notes || '—'}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan="6" className="empty-cell">
                    No irrigation sessions recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
