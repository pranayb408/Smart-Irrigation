import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Fields from './pages/Fields.jsx';
import Prediction from './pages/Prediction.jsx';
import WaterBudget from './pages/WaterBudget.jsx';
import Analytics from './pages/Analytics.jsx';
import SensorHistory from './pages/SensorHistory.jsx';
import Settings from './pages/Settings.jsx';
import CropDoctor from './pages/CropDoctor.jsx';
import { api } from './services/api.js';

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [fields, setFields] = useState([]);
  const [activeField, setActiveField] = useState(null);

  useEffect(() => {
    api.fields()
      .then((data) => {
        if (data && data.length > 0) {
          setFields(data);
          setActiveField(data[0]);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="app-shell">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="app-main">
        <Header
          onMenu={() => setMenuOpen(true)}
          activeField={activeField}
          fields={fields}
          onSelectField={(f) => setActiveField(f)}
        />
        <main className="main-content">
          <Routes>
            <Route
              path="/"
              element={<Dashboard activeField={activeField} fields={fields} />}
            />
            <Route
              path="/fields"
              element={<Fields onSelectActiveField={(f) => setActiveField(f)} />}
            />
            <Route
              path="/prediction"
              element={<Prediction activeField={activeField} />}
            />
            <Route
              path="/budget"
              element={<WaterBudget activeField={activeField} />}
            />
            <Route path="/crop-doctor" element={<CropDoctor />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/history" element={<SensorHistory />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <footer className="app-footer">
          <span>© {new Date().getFullYear()} AgriSense AI · Precision Smart Irrigation</span>
          <span>B.Tech AI/ML Engineering Project · FAO-56 & Random Forest Model</span>
        </footer>
      </div>
    </div>
  );
}
