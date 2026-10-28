import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Camera, Upload, Sparkles, AlertCircle, CheckCircle2, Droplets,
  ShieldAlert, RefreshCw, Volume2, VolumeX, Stethoscope, Leaf,
  FileText, Activity, HelpCircle
} from 'lucide-react';
import Panel from '../components/Panel.jsx';
import { api } from '../services/api.js';

// Pre-packaged base64 colored SVG thumbnails for one-click testing
const SAMPLE_PRESETS = [
  {
    id: 'healthy_wheat',
    crop: 'Wheat',
    labelKey: 'cropDoctor.samples.healthyWheat',
    defaultLabel: 'Healthy Wheat Leaf',
    symptoms: 'Vigorous deep green leaves with no lesions',
    // Green SVG data uri
    image: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="300" height="200" fill="%232e7d32"/><path d="M50 150 Q150 20 250 150 Q150 100 50 150" fill="%234caf50"/><path d="M70 140 Q150 40 230 140" stroke="%2381c784" stroke-width="4" fill="none"/></svg>'
  },
  {
    id: 'wheat_rust',
    crop: 'Wheat',
    labelKey: 'cropDoctor.samples.wheatRust',
    defaultLabel: 'Wheat Yellow Rust',
    symptoms: 'Yellow stripes along leaf veins with orange-yellow pustules',
    // Yellow-striped SVG
    image: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="300" height="200" fill="%238d6e63"/><path d="M50 150 Q150 20 250 150 Q150 100 50 150" fill="%23fbc02d"/><line x1="80" y1="120" x2="220" y2="120" stroke="%23e65100" stroke-width="6" stroke-dasharray="10,5"/><line x1="90" y1="100" x2="210" y2="100" stroke="%23e65100" stroke-width="6" stroke-dasharray="10,5"/></svg>'
  },
  {
    id: 'tomato_blight',
    crop: 'Tomato',
    labelKey: 'cropDoctor.samples.tomatoBlight',
    defaultLabel: 'Tomato Early Blight',
    symptoms: 'Dark brown concentric ring spots on lower leaves with yellow margin',
    // Brown spots SVG
    image: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="300" height="200" fill="%23558b2f"/><circle cx="100" cy="80" r="28" fill="%234e342e" stroke="%23fbc02d" stroke-width="6"/><circle cx="190" cy="120" r="35" fill="%233e2723" stroke="%23fbc02d" stroke-width="8"/></svg>'
  },
  {
    id: 'cotton_curl',
    crop: 'Cotton',
    labelKey: 'cropDoctor.samples.cottonCurl',
    defaultLabel: 'Cotton Leaf Curl',
    symptoms: 'Leaves cupping upwards, thickened veins and aphid/whitefly presence',
    // Curled leaf SVG
    image: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="300" height="200" fill="%2333691e"/><path d="M40 160 C100 40 200 40 260 160 C220 120 180 80 120 110 Z" fill="%23cddc39" stroke="%231b5e20" stroke-width="4"/></svg>'
  },
  {
    id: 'chlorosis',
    crop: 'Wheat',
    labelKey: 'cropDoctor.samples.chlorosis',
    defaultLabel: 'Nutrient Deficiency',
    symptoms: 'Uniform pale yellow leaves with stunted vegetative growth',
    // Pale yellow SVG
    image: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="300" height="200" fill="%23fff59d"/><path d="M50 150 Q150 30 250 150 Z" fill="%23fff176" stroke="%23fbc02d" stroke-width="3"/></svg>'
  }
];

export default function CropDoctor() {
  const { t, i18n } = useTranslation();
  const fileInputRef = useRef(null);

  const [selectedCrop, setSelectedCrop] = useState('Wheat');
  const [plantPart, setPlantPart] = useState('Leaf');
  const [symptoms, setSymptoms] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [diagnosis, setDiagnosis] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // File picker handler
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg(t('cropDoctor.invalidImage', 'Please select a valid image file (JPG, PNG, WebP).'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result);
      setErrorMsg(null);
    };
    reader.readAsDataURL(file);
  };

  // Quick preset sample handler
  const handleSelectSample = (sample) => {
    setImagePreview(sample.image);
    setSelectedCrop(sample.crop);
    setSymptoms(sample.symptoms);
    setErrorMsg(null);
  };

  // Run AI diagnosis
  const handleDiagnose = async () => {
    if (!imagePreview && !symptoms) {
      setErrorMsg(t('cropDoctor.provideInput', 'Please upload or choose a crop image, or describe observed symptoms.'));
      return;
    }

    setAnalyzing(true);
    setErrorMsg(null);

    try {
      const payload = {
        image_base64: imagePreview,
        crop_type: selectedCrop,
        plant_part: plantPart,
        symptoms: symptoms,
        field_name: 'Current Crop Plot',
      };

      const result = await api.diagnoseCrop(payload);
      setDiagnosis(result);
    } catch (err) {
      setErrorMsg(t('cropDoctor.diagnosisFailed', 'Diagnosis failed. Please check inputs and try again.'));
    } finally {
      setAnalyzing(false);
    }
  };

  // Text-to-speech audio reader in local farmer language
  const handleSpeakAdvice = () => {
    if (!diagnosis) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    if (!('speechSynthesis' in window)) {
      alert('Text-to-speech is not supported in this browser.');
      return;
    }

    const speechText = `${diagnosis.condition_name}. Severity: ${diagnosis.severity}. Water recommendation: ${diagnosis.irrigation_advice}. Immediate action: ${diagnosis.immediate_actions?.[0] || 'Observe plant daily.'}`;

    const utterance = new SpeechSynthesisUtterance(speechText);
    const langMap = { en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN', gu: 'gu-IN' };
    utterance.lang = langMap[i18n.language] || 'en-IN';
    utterance.rate = 0.95;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleReset = () => {
    setImagePreview(null);
    setSymptoms('');
    setDiagnosis(null);
    setErrorMsg(null);
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="page-content">
      {/* Top Welcome Title */}
      <div className="welcome-row">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            <Stethoscope size={14} style={{ display: 'inline', verticalAlign: -1, marginRight: 4 }} />
            {t('cropDoctor.badge', 'AI CROP HEALTH DIAGNOSTICS & ADVISORY')}
          </div>
          <h1 className="welcome-title">
            {t('cropDoctor.title', 'AI Crop Doctor & Foliage Advisor')} <em>✦</em>
          </h1>
          <p className="welcome-copy">
            {t(
              'cropDoctor.subtitle',
              'Upload or photograph your crop leaf to diagnose fungal diseases, pest damage, and nutrient deficiencies with tailored FAO-56 irrigation and treatment advice.'
            )}
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="warning-banner" role="alert">
          <AlertCircle size={20} className="warning-icon" />
          <div className="warning-body">
            <strong>{t('common.attention', 'Notice')}</strong>
            <p>{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="crop-doctor-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 460px) 1fr', gap: '22px' }}>
        {/* Left Column: Image Upload & Inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <Panel
            title={t('cropDoctor.uploadTitle', '1. Capture or Select Crop Image')}
            description={t('cropDoctor.uploadSubtitle', 'Take a crisp photo of leaves, fruit, or stems showing symptoms.')}
            icon={Camera}
          >
            {/* Quick Sample Presets */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', fontWeight: 750, color: '#3b5845', display: 'block', marginBottom: '6px' }}>
                {t('cropDoctor.quickSamples', 'Try Instant Sample Cases:')}
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {SAMPLE_PRESETS.map((sample) => (
                  <button
                    key={sample.id}
                    type="button"
                    className="button button-soft button-small"
                    onClick={() => handleSelectSample(sample)}
                    style={{ fontSize: '11px', padding: '6px 10px', borderRadius: '8px' }}
                  >
                    ✦ {t(sample.labelKey, sample.defaultLabel)}
                  </button>
                ))}
              </div>
            </div>

            {/* Drop / Upload Box */}
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed #b9d8c2',
                borderRadius: '14px',
                padding: imagePreview ? '12px' : '28px 16px',
                textAlign: 'center',
                background: '#f9fcf9',
                cursor: 'pointer',
                transition: 'border-color .2s, background .2s',
                position: 'relative'
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />

              {imagePreview ? (
                <div>
                  <img
                    src={imagePreview}
                    alt="Uploaded Crop Foliage"
                    style={{
                      width: '100%',
                      maxHeight: '220px',
                      objectFit: 'contain',
                      borderRadius: '10px',
                      background: '#e8efe8',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                    }}
                  />
                  <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: 700, color: '#1f6e45' }}>
                    {t('cropDoctor.changeImage', 'Click or tap to choose a different photo')}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '54px',
                      height: '54px',
                      borderRadius: '14px',
                      background: '#e3f3e7',
                      color: '#1a6f44',
                      display: 'grid',
                      placeItems: 'center'
                    }}
                  >
                    <Upload size={26} strokeWidth={2.2} />
                  </div>
                  <strong style={{ fontSize: '14px', color: '#163b27' }}>
                    {t('cropDoctor.uploadPrompt', 'Upload photo or tap to take picture')}
                  </strong>
                  <span style={{ fontSize: '12px', color: '#57715f' }}>
                    {t('cropDoctor.uploadFormats', 'Supports JPEG, PNG, WebP (Camera or Gallery)')}
                  </span>
                </div>
              )}
            </div>

            {/* Form Fields: Crop & Plant Part */}
            <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 750 }}>
                  {t('cropDoctor.cropType', 'Crop Type')}
                </label>
                <select
                  className="form-input"
                  value={selectedCrop}
                  onChange={(e) => setSelectedCrop(e.target.value)}
                  style={{ fontWeight: 650 }}
                >
                  <option value="Wheat">{t('crops.wheat', 'Wheat (गेहूं)')}</option>
                  <option value="Rice">{t('crops.rice', 'Rice / Paddy (धान)')}</option>
                  <option value="Cotton">{t('crops.cotton', 'Cotton (कपास)')}</option>
                  <option value="Tomato">{t('crops.tomato', 'Tomato (टमाटर)')}</option>
                  <option value="Maize">{t('crops.maize', 'Maize / Corn (मक्का)')}</option>
                  <option value="Sugarcane">{t('crops.sugarcane', 'Sugarcane (गन्ना)')}</option>
                  <option value="Potato">{t('crops.potato', 'Potato (आलू)')}</option>
                  <option value="Soybean">{t('crops.soybean', 'Soybean (सोयाबीन)')}</option>
                  <option value="Groundnut">{t('crops.groundnut', 'Groundnut (मूंगफली)')}</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 750 }}>
                  {t('cropDoctor.plantPart', 'Plant Part')}
                </label>
                <select
                  className="form-input"
                  value={plantPart}
                  onChange={(e) => setPlantPart(e.target.value)}
                  style={{ fontWeight: 650 }}
                >
                  <option value="Leaf">{t('cropDoctor.partLeaf', 'Leaf / Foliage')}</option>
                  <option value="Fruit">{t('cropDoctor.partFruit', 'Fruit / Pod')}</option>
                  <option value="Stem">{t('cropDoctor.partStem', 'Stem / Shoot')}</option>
                  <option value="Root">{t('cropDoctor.partRoot', 'Root / Base')}</option>
                  <option value="WholePlant">{t('cropDoctor.partWhole', 'Whole Plant')}</option>
                </select>
              </div>
            </div>

            {/* Observed Symptoms */}
            <div className="form-group" style={{ marginTop: '10px' }}>
              <label className="form-label" style={{ fontWeight: 750 }}>
                {t('cropDoctor.symptomsObserved', 'Observed Symptoms (Optional)')}
              </label>
              <textarea
                className="form-input"
                rows="2"
                placeholder={t(
                  'cropDoctor.symptomsPlaceholder',
                  'e.g. Yellow stripes on leaves, powdery white spots, leaf curling, insect holes...'
                )}
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                style={{ fontWeight: 550, resize: 'vertical' }}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="button button-primary button-full"
                onClick={handleDiagnose}
                disabled={analyzing}
                style={{ marginTop: 0, flex: 2 }}
              >
                {analyzing ? (
                  <>
                    <RefreshCw size={18} className="spin" />
                    {t('cropDoctor.diagnosing', 'Analyzing Crop Image...')}
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    {t('cropDoctor.diagnoseBtn', 'Run AI Diagnosis')}
                  </>
                )}
              </button>

              {(imagePreview || diagnosis) && (
                <button
                  type="button"
                  className="button button-outline"
                  onClick={handleReset}
                  style={{ flex: 1 }}
                >
                  {t('common.clear', 'Reset')}
                </button>
              )}
            </div>
          </Panel>
        </div>

        {/* Right Column: AI Advisory & Diagnostic Report */}
        <div>
          {!diagnosis ? (
            <Panel
              title={t('cropDoctor.resultsTitle', 'AI Diagnostic & Water Report')}
              description={t('cropDoctor.resultsSubtitle', 'Diagnosis results, organic remedies, and smart irrigation actions appear here.')}
              icon={Sparkles}
            >
              <div
                style={{
                  padding: '48px 24px',
                  textAlign: 'center',
                  background: '#f8faf8',
                  borderRadius: '16px',
                  border: '1.5px dashed #d5e5d8'
                }}
              >
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '20px',
                    background: '#e3f4e8',
                    color: '#1a6f44',
                    display: 'grid',
                    placeItems: 'center',
                    margin: '0 auto 16px'
                  }}
                >
                  <Leaf size={32} strokeWidth={2} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#183c27', margin: '0 0 8px' }}>
                  {t('cropDoctor.awaitingTitle', 'Ready for Crop Health Diagnosis')}
                </h3>
                <p style={{ maxWidth: '440px', margin: '0 auto', fontSize: '13px', color: '#57715f', lineHeight: 1.6 }}>
                  {t(
                    'cropDoctor.awaitingDesc',
                    'Select a sample case or snap a leaf photo from your field. The AI computer vision engine inspects chlorosis, necrosis, and foliage patterns to recommend precise water schedules and plant treatments.'
                  )}
                </p>
              </div>
            </Panel>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Primary Diagnostic Banner */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #dce8dd',
                  borderRadius: '16px',
                  padding: '22px 24px',
                  boxShadow: '0 3px 12px rgba(25, 55, 35, 0.05)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span
                        style={{
                          background: diagnosis.severity === 'Healthy' ? '#d4f0dc' : diagnosis.severity === 'High' ? '#ffebee' : '#fff3e0',
                          color: diagnosis.severity === 'Healthy' ? '#15653b' : diagnosis.severity === 'High' ? '#c62828' : '#e65100',
                          padding: '3px 9px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 850
                        }}
                      >
                        {diagnosis.severity.toUpperCase()} SEVERITY
                      </span>
                      <span
                        style={{
                          background: '#edf6ee',
                          color: '#217348',
                          padding: '3px 9px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 750
                        }}
                      >
                        {diagnosis.category}
                      </span>
                    </div>

                    <h2 style={{ fontSize: '22px', fontWeight: 850, color: '#163c26', margin: '0 0 4px', letterSpacing: '-0.4px' }}>
                      {diagnosis.condition_name}
                    </h2>
                    {diagnosis.scientific_name && (
                      <div style={{ fontSize: '13px', fontStyle: 'italic', color: '#5b7564', marginBottom: '8px' }}>
                        {diagnosis.scientific_name}
                      </div>
                    )}
                  </div>

                  {/* Confidence & Audio Button */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        textAlign: 'right',
                        padding: '8px 14px',
                        background: '#eef7f0',
                        border: '1.5px solid #d3e7d6',
                        borderRadius: '12px'
                      }}
                    >
                      <div style={{ fontSize: '11px', fontWeight: 750, color: '#466851' }}>
                        {t('cropDoctor.confidence', 'AI Confidence')}
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: 850, color: '#18673d' }}>
                        {diagnosis.confidence_score}%
                      </div>
                    </div>

                    <button
                      type="button"
                      className="button button-soft"
                      onClick={handleSpeakAdvice}
                      title={t('cropDoctor.readAloud', 'Listen to AI Advice')}
                      style={{ height: '48px', padding: '0 14px' }}
                    >
                      {isSpeaking ? <VolumeX size={20} color="#c62828" /> : <Volume2 size={20} />}
                      <span style={{ fontSize: '12px', fontWeight: 750 }}>
                        {isSpeaking ? t('cropDoctor.stopAudio', 'Stop Audio') : t('cropDoctor.listen', 'Read Aloud')}
                      </span>
                    </button>
                  </div>
                </div>

                <p style={{ fontSize: '14px', color: '#385542', margin: '12px 0 16px', lineHeight: 1.55 }}>
                  {diagnosis.symptoms_summary}
                </p>

                {/* Visual Foliage Indices */}
                {diagnosis.visual_metrics && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                      gap: '10px',
                      padding: '14px',
                      background: '#f7faf7',
                      borderRadius: '12px',
                      border: '1px solid #e1ece2'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 750, color: '#52705d' }}>
                        {t('cropDoctor.healthyGreen', 'Healthy Foliage')}
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: 850, color: '#1f6d44' }}>
                        {diagnosis.visual_metrics.greenness_pct}%
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 750, color: '#52705d' }}>
                        {t('cropDoctor.chlorosis', 'Chlorosis / Yellowing')}
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: 850, color: '#b28900' }}>
                        {diagnosis.visual_metrics.chlorosis_pct}%
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 750, color: '#52705d' }}>
                        {t('cropDoctor.necrosis', 'Necrotic Lesions')}
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: 850, color: '#8d4b32' }}>
                        {diagnosis.visual_metrics.necrosis_pct}%
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* CRITICAL: Smart Irrigation Guidance tied to crop disease */}
              <div
                style={{
                  background: '#f0f9f3',
                  border: '1.5px solid #c2e5cc',
                  borderRadius: '16px',
                  padding: '20px 22px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: '#d4ebd9',
                      color: '#1a6f44',
                      display: 'grid',
                      placeItems: 'center'
                    }}
                  >
                    <Droplets size={18} strokeWidth={2.4} />
                  </div>
                  <h3 style={{ fontSize: '16px', fontWeight: 850, color: '#144c2c', margin: 0 }}>
                    {t('cropDoctor.waterAdviceTitle', 'Smart Irrigation & Water Management Advice')}
                  </h3>
                </div>
                <p style={{ fontSize: '14px', color: '#275239', margin: 0, lineHeight: 1.6, fontWeight: 600 }}>
                  {diagnosis.irrigation_advice}
                </p>
              </div>

              {/* Immediate Farmer Actions & Root Causes */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                <Panel
                  title={t('cropDoctor.immediateActions', 'Immediate Action Steps')}
                  description={t('cropDoctor.actionsSubtitle', 'Urgent tasks for today.')}
                  icon={AlertCircle}
                >
                  <ol style={{ paddingLeft: '18px', margin: 0, color: '#2b4937', fontSize: '13px', lineHeight: 1.7, fontWeight: 600 }}>
                    {diagnosis.immediate_actions?.map((act, idx) => (
                      <li key={idx} style={{ marginBottom: '6px' }}>
                        {act}
                      </li>
                    ))}
                  </ol>
                </Panel>

                <Panel
                  title={t('cropDoctor.likelyCauses', 'Likely Environmental Triggers')}
                  description={t('cropDoctor.causesSubtitle', 'Conditions that encouraged this outbreak.')}
                  icon={Activity}
                >
                  <ul style={{ paddingLeft: '18px', margin: 0, color: '#2b4937', fontSize: '13px', lineHeight: 1.7, fontWeight: 600 }}>
                    {diagnosis.likely_causes?.map((cause, idx) => (
                      <li key={idx} style={{ marginBottom: '6px' }}>
                        {cause}
                      </li>
                    ))}
                  </ul>
                </Panel>
              </div>

              {/* Organic vs Chemical Treatment Solutions */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                <Panel
                  title={t('cropDoctor.organicRemedies', 'Organic & Biological Treatment')}
                  description={t('cropDoctor.organicSubtitle', 'Eco-friendly and low cost.')}
                  icon={Leaf}
                >
                  <ul style={{ paddingLeft: '18px', margin: 0, color: '#225234', fontSize: '13px', lineHeight: 1.7, fontWeight: 600 }}>
                    {diagnosis.organic_treatment?.map((org, idx) => (
                      <li key={idx} style={{ marginBottom: '6px' }}>
                        {org}
                      </li>
                    ))}
                  </ul>
                </Panel>

                <Panel
                  title={t('cropDoctor.chemicalOptions', 'Recommended Targeted Treatments')}
                  description={t('cropDoctor.chemicalSubtitle', 'For moderate to severe outbreaks.')}
                  icon={ShieldAlert}
                >
                  <ul style={{ paddingLeft: '18px', margin: 0, color: '#2b4937', fontSize: '13px', lineHeight: 1.7, fontWeight: 600 }}>
                    {diagnosis.chemical_treatment?.map((chem, idx) => (
                      <li key={idx} style={{ marginBottom: '6px' }}>
                        {chem}
                      </li>
                    ))}
                  </ul>
                </Panel>
              </div>

              {/* Preventative Measures */}
              <Panel
                title={t('cropDoctor.preventative', 'Long-Term Preventative Farming Practices')}
                description={t('cropDoctor.preventativeSubtitle', 'Protect future yields and seasonal water conservation.')}
                icon={CheckCircle2}
              >
                <ul style={{ paddingLeft: '18px', margin: 0, color: '#2b4937', fontSize: '13px', lineHeight: 1.7, fontWeight: 600 }}>
                  {diagnosis.preventative_measures?.map((prev, idx) => (
                    <li key={idx} style={{ marginBottom: '6px' }}>
                      {prev}
                    </li>
                  ))}
                </ul>
              </Panel>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
