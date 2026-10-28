import { useState, useEffect } from 'react';
import {
  Layers, Plus, Edit2, Trash2, Sprout, Droplets, Gauge,
  Calendar, MapPin, Radio, CheckCircle2, AlertTriangle, LoaderCircle,
  ArrowRight, ShieldCheck, X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import Panel from '../components/Panel';

const initialFieldForm = {
  name: '',
  area_acres: 1.0,
  crop_type: 'Wheat',
  planting_date: new Date().toISOString().split('T')[0],
  growth_stage: 'Vegetative',
  soil_type: 'Loamy',
  irrigation_method: 'Drip',
  flow_rate_lpm: 50.0,
  location: 'Sector 1',
  device_id: 'ESP32-NODE-01',
  sensor_cal_air: 3200,
  sensor_cal_water: 1450,
  target_moisture_min: 30.0,
  target_moisture_max: 60.0,
  reference_water_budget_l: 420000.0,
};

export default function Fields({ onSelectActiveField }) {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState(null);
  const [form, setForm] = useState(initialFieldForm);
  const [saving, setSaving] = useState(false);

  async function loadFields() {
    setLoading(true);
    setError('');
    try {
      const data = await api.fields();
      setFields(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFields();
  }, []);

  function handleOpenAdd() {
    setEditingFieldId(null);
    setForm({
      ...initialFieldForm,
      name: `Field ${fields.length + 1}`,
      device_id: `ESP32-NODE-0${fields.length + 1}`,
    });
    setShowModal(true);
    setError('');
    setSuccess('');
  }

  function handleOpenEdit(field) {
    setEditingFieldId(field.id);
    setForm({
      name: field.name,
      area_acres: field.area_acres,
      crop_type: field.crop_type,
      planting_date: field.planting_date,
      growth_stage: field.growth_stage,
      soil_type: field.soil_type,
      irrigation_method: field.irrigation_method,
      flow_rate_lpm: field.flow_rate_lpm,
      location: field.location || '',
      device_id: field.device_id || '',
      sensor_cal_air: field.sensor_cal_air || 3200,
      sensor_cal_water: field.sensor_cal_water || 1450,
      target_moisture_min: field.target_moisture_min || 30.0,
      target_moisture_max: field.target_moisture_max || 60.0,
      reference_water_budget_l: field.reference_water_budget_l || 420000.0,
    });
    setShowModal(true);
  }

  async function handleDelete(fieldId, fieldName) {
    if (!window.confirm(`Are you sure you want to delete ${fieldName}? Historical readings will remain in the database.`)) {
      return;
    }
    try {
      await api.deleteField(fieldId);
      setSuccess(`Field ${fieldName} deleted successfully.`);
      await loadFields();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleFormSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      if (editingFieldId) {
        await api.updateField(editingFieldId, form);
        setSuccess(`Field "${form.name}" updated successfully.`);
      } else {
        await api.createField(form);
        setSuccess(`New field "${form.name}" registered successfully.`);
      }
      setShowModal(false);
      await loadFields();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function updateField(e) {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
  }

  return (
    <div className="page-content">
      <div className="welcome-row">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" /> PHASE 1: FARM SETUP
          </div>
          <h2 className="welcome-title">
            Registered <em>Farm Fields</em>
          </h2>
          <p className="welcome-copy">
            Configure each field’s crop, soil characteristics, pump flow rate, and IoT sensor calibration.
          </p>
        </div>
        <button className="button button-primary" onClick={handleOpenAdd}>
          <Plus size={16} /> Register New Field
        </button>
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
            <strong>Success</strong>
            <span>{success}</span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-state">
          <LoaderCircle className="spin" size={24} /> Loading farm fields…
        </div>
      ) : (
        <div className="fields-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {fields.map((field) => {
            const latest = field.latest_reading;
            const daysPlanted = Math.max(
              0,
              Math.floor((new Date() - new Date(field.planting_date)) / (1000 * 60 * 60 * 24))
            );

            return (
              <div
                key={field.id}
                className="panel field-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  border: '1px solid #e2ebe3',
                  borderRadius: '14px',
                  background: '#ffffff',
                  padding: '18px',
                  boxShadow: '0 4px 14px rgba(33, 76, 47, 0.05)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#e3f3e8', color: '#257a4d', display: 'grid', placeItems: 'center' }}>
                      <Sprout size={22} />
                    </div>
                    <div>
                      <h3 style={{ margin: '0', fontSize: '15px', color: '#243c2e', fontWeight: '800' }}>
                        {field.name}
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#88968d', marginTop: '2px' }}>
                        <MapPin size={12} /> {field.location || 'Main Block'}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      className="icon-button"
                      style={{ width: '30px', height: '30px' }}
                      onClick={() => handleOpenEdit(field)}
                      title="Edit field settings"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      className="icon-button"
                      style={{ width: '30px', height: '30px', color: '#bf5844' }}
                      onClick={() => handleDelete(field.id, field.name)}
                      title="Delete field"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', background: '#f8faf7', borderRadius: '10px', padding: '10px' }}>
                  <div>
                    <span style={{ fontSize: '9px', color: '#8c9890', display: 'block' }}>Crop & Stage</span>
                    <strong style={{ fontSize: '11px', color: '#2a4435' }}>
                      {field.crop_type} · {field.growth_stage}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '9px', color: '#8c9890', display: 'block' }}>Field Area</span>
                    <strong style={{ fontSize: '11px', color: '#2a4435' }}>
                      {field.area_acres} acres <small style={{ color: '#88968d', fontWeight: '500' }}>({Math.round(field.area_acres * 4047)} m²)</small>
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '9px', color: '#8c9890', display: 'block' }}>Soil Type</span>
                    <strong style={{ fontSize: '11px', color: '#2a4435' }}>{field.soil_type}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '9px', color: '#8c9890', display: 'block' }}>Irrigation / Pump</span>
                    <strong style={{ fontSize: '11px', color: '#2a4435' }}>
                      {field.irrigation_method} · {field.flow_rate_lpm} L/min
                    </strong>
                  </div>
                </div>

                {/* IoT & Telemetry Status */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10px', padding: '4px 2px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#5f7566' }}>
                    <Radio size={14} style={{ color: '#2b8458' }} />
                    <span>Node: <strong>{field.device_id || 'Not paired'}</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#829186' }}>
                    <Calendar size={13} /> Day {daysPlanted} of season
                  </div>
                </div>

                {/* Soil Moisture Bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '4px' }}>
                    <span style={{ color: '#798b7e' }}>Current Soil Moisture</span>
                    <strong style={{ color: '#224a35' }}>
                      {latest ? `${latest.soil_moisture}%` : 'No reading yet'}
                    </strong>
                  </div>
                  <div className="mini-progress" style={{ height: '6px' }}>
                    <i style={{ width: `${Math.min(100, Math.max(0, latest?.soil_moisture || 0))}%` }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: '#97a39a', marginTop: '3px' }}>
                    <span>Threshold: {field.target_moisture_min}%</span>
                    <span>Max FC: {field.target_moisture_max}%</span>
                  </div>
                </div>

                {/* Water Applied vs Budget */}
                <div style={{ borderTop: '1px solid #edf1ec', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px' }}>
                  <div>
                    <span style={{ color: '#8c998f', fontSize: '9px', display: 'block' }}>Water Applied</span>
                    <strong style={{ color: '#274b34' }}>{field.total_water_applied_liters?.toLocaleString() || 0} L</strong>
                    <span style={{ color: '#8c998f', fontSize: '9px' }}> / {field.reference_water_budget_l?.toLocaleString()} L</span>
                  </div>
                  <span className={`moisture-pill ${field.budget_percent_used > 90 ? 'low' : 'normal'}`}>
                    {field.budget_percent_used}% of budget
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '6px' }}>
                  <Link
                    to="/prediction"
                    state={{ selectedField: field }}
                    className="button button-soft button-full"
                    style={{ margin: 0, fontSize: '10px', padding: '8px' }}
                    onClick={() => onSelectActiveField && onSelectActiveField(field)}
                  >
                    Run Decision Support <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Dialog for Add / Edit Field */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(18, 38, 27, 0.65)',
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
              maxWidth: '640px',
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              padding: '24px',
              boxShadow: '0 20px 45px rgba(10, 35, 20, 0.25)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eef2ec', paddingBottom: '12px', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#254232' }}>
                  {editingFieldId ? 'Edit Field Parameters' : 'Register New Farm Field'}
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '11px', color: '#88968d' }}>
                  Provide agronomic attributes, system flow capacity, and sensor node settings.
                </p>
              </div>
              <button className="icon-button" onClick={() => setShowModal(false)}>
                <X size={17} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="field-form">
              <div className="form-section-title">
                <span>01</span> Basic Field Identity
              </div>
              <div className="form-row">
                <label className="form-field">
                  <span>Field Name</span>
                  <input name="name" value={form.name} onChange={updateField} required maxLength={100} placeholder="e.g. North Plot B" />
                </label>
                <label className="form-field">
                  <span>Area (Acres)</span>
                  <input type="number" step="0.1" min="0.1" max="1000" name="area_acres" value={form.area_acres} onChange={updateField} required />
                </label>
              </div>

              <div className="form-row">
                <label className="form-field">
                  <span>Crop Type</span>
                  <select name="crop_type" value={form.crop_type} onChange={updateField}>
                    {['Wheat', 'Rice', 'Maize', 'Cotton', 'Vegetables'].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>Growth Stage</span>
                  <select name="growth_stage" value={form.growth_stage} onChange={updateField}>
                    {['Seedling', 'Vegetative', 'Flowering', 'Maturity'].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="form-row">
                <label className="form-field">
                  <span>Planting Date</span>
                  <input type="date" name="planting_date" value={form.planting_date} onChange={updateField} required />
                </label>
                <label className="form-field">
                  <span>Soil Type</span>
                  <select name="soil_type" value={form.soil_type} onChange={updateField}>
                    {['Sandy', 'Loamy', 'Clay', 'Silty'].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="form-section-title form-section-spaced">
                <span>02</span> Irrigation System & Flow Rate
              </div>
              <div className="form-row">
                <label className="form-field">
                  <span>Irrigation Method</span>
                  <select name="irrigation_method" value={form.irrigation_method} onChange={updateField}>
                    {['Drip', 'Sprinkler', 'Furrow', 'Basin'].map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>System Flow Rate (LPM)</span>
                  <input type="number" step="1" min="5" max="10000" name="flow_rate_lpm" value={form.flow_rate_lpm} onChange={updateField} required />
                  <small>Liters Per Minute from pump / valves</small>
                </label>
              </div>

              <div className="form-row">
                <label className="form-field">
                  <span>Location / Plot Notes</span>
                  <input name="location" value={form.location} onChange={updateField} placeholder="e.g. Block 2, East Valve" />
                </label>
                <label className="form-field">
                  <span>Seasonal Budget (Liters)</span>
                  <input type="number" step="1000" min="10000" name="reference_water_budget_l" value={form.reference_water_budget_l} onChange={updateField} required />
                </label>
              </div>

              <div className="form-section-title form-section-spaced">
                <span>03</span> ESP32 IoT Node & Calibration
              </div>
              <div className="form-row">
                <label className="form-field">
                  <span>Device Node ID</span>
                  <input name="device_id" value={form.device_id} onChange={updateField} placeholder="e.g. ESP32-NODE-01" />
                </label>
                <label className="form-field">
                  <span>Dry Air ADC (0% Moisture)</span>
                  <input type="number" min="1000" max="4095" name="sensor_cal_air" value={form.sensor_cal_air} onChange={updateField} />
                </label>
              </div>
              <div className="form-row">
                <label className="form-field">
                  <span>Submerged Water ADC (100% Moisture)</span>
                  <input type="number" min="200" max="3000" name="sensor_cal_water" value={form.sensor_cal_water} onChange={updateField} />
                </label>
                <label className="form-field">
                  <span>Target Safe Moisture (%)</span>
                  <input type="number" min="10" max="80" name="target_moisture_min" value={form.target_moisture_min} onChange={updateField} />
                </label>
              </div>

              <div className="form-actions" style={{ marginTop: '16px' }}>
                <button type="button" className="button button-outline" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="button button-primary" disabled={saving}>
                  {saving ? <LoaderCircle className="spin" size={16} /> : <CheckCircle2 size={16} />}
                  {saving ? 'Saving Field…' : editingFieldId ? 'Save Changes' : 'Register Field'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
