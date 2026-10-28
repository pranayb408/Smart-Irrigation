# AI Smart Irrigation and Water Conservation

> **Academic Level:** Third-Year B.Tech AI / ML Major Coursework Project  
> **Authors:** AI/ML Engineering Team  
> **Live Demo Website:** [https://smart-irrigation-frontend-murex.vercel.app](https://smart-irrigation-frontend-murex.vercel.app)  
> **GitHub Repository:** [https://github.com/pranayb408/smart-irrigation](https://github.com/pranayb408/smart-irrigation)  
> **Supported Languages:** 🇬🇧 English | 🇮🇳 हिन्दी (Hindi) | 🇮🇳 मराठी (Marathi) | 🇮🇳 ગુજરાતી (Gujarati)  
> **Full Stack Architecture:** React 18 (Vite) + FastAPI (Uvicorn) + Neon PostgreSQL / SQLite + Scikit-learn + FAO-56 Agronomic Physics Engine

---

## 🌐 4-Language Internationalization (i18n)

AgriSense provides native, respectful, farmer-friendly multilingual support across the entire interface without page reloads:
- **English (`en`)**: Default language and international engineering baseline.
- **हिन्दी (`hi`)**: Natural Hindi agricultural terminology (गेहूँ, धान, दोमट मिट्टी, ड्रिप सिंचाई).
- **मराठी (`mr`)**: Natural Marathi terminology for Maharashtra farming communities (गहू, काळी जमीन, ठिबक सिंचन).
- **ગુજરાતી (`gu`)**: Natural Gujarati terminology for Gujarat agrarian practices (ઘઉં, કાળી જમીન, ટપક પદ્ધતિ).

Language selection is available via the persistent Globe selector in the top header, preserved in `localStorage`, and dynamically applies to all navigation links, stat cards, forms, tables, Recharts visualizations, and USDA fallback guides.

---

## 🚀 Public Cloud Deployment Guide (GitHub + Render + Vercel + Neon)

This repository is pre-configured for free-tier production cloud hosting:

```text
┌────────────────────────┐      ┌───────────────────────────┐      ┌──────────────────────────┐
│     Vercel Frontend    │ ───► │   Render FastAPI Backend  │ ───► │  Neon PostgreSQL Cloud   │
│ React 18 + Vite (SPA)  │ REST │ Python 3.11 + Scikit-learn│  SQL │ Serverless Database 24/7 │
└────────────────────────┘      └───────────────────────────┘      └──────────────────────────┘
```

### Step 1: Create a Free Neon PostgreSQL Database
1. Sign up for free at [neon.tech](https://neon.tech/).
2. Create a new project named `smart-irrigation`.
3. Copy the pooled connection string (`postgresql://neondb_owner:***@ep-***.neon.tech/neondb?sslmode=require`).

### Step 2: Push Repository to GitHub
1. Open PowerShell in `smart-irrigation`:
   ```powershell
   & "C:\Program Files\Git\cmd\git.exe" add .
   & "C:\Program Files\Git\cmd\git.exe" commit -m "feat: complete multilingual site with cloud deployment config"
   & "C:\Program Files\Git\cmd\git.exe" branch -M main
   & "C:\Program Files\Git\cmd\git.exe" remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/smart-irrigation.git
   & "C:\Program Files\Git\cmd\git.exe" push -u origin main
   ```

### Step 3: Deploy Backend on Render
1. Sign up for free at [render.com](https://render.com/).
2. Click **New +** -> **Web Service** -> Connect your GitHub repository.
3. Render automatically detects `render.yaml`, or configure manually:
   - **Environment:** Python 3
   - **Build Command:** `pip install -r requirements.txt && python -m ml.generate_data && python -m ml.evaluate`
   - **Start Command:** `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
4. Add Environment Variable:
   - `DATABASE_URL`: Your Neon PostgreSQL connection string from Step 1.
5. Click **Create Web Service**. Once deployed, copy your Render URL (e.g. `https://smart-irrigation-backend.onrender.com`).

### Step 4: Deploy Frontend on Vercel
1. Sign up for free at [vercel.com](https://vercel.com/).
2. Click **Add New...** -> **Project** -> Import your GitHub repository.
3. Configure project settings:
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. In **Environment Variables**, add:
   - `VITE_API_BASE_URL`: Your Render backend URL (e.g. `https://smart-irrigation-backend.onrender.com`)
5. Click **Deploy**. Vercel will build and assign a permanent public HTTPS URL (e.g. `https://smart-irrigation-frontend.vercel.app`).

---

## 1. Project Abstract

Freshwater scarcity and groundwater depletion are among the greatest threats facing modern agriculture. Conventional agricultural practices often rely on arbitrary timer-based irrigation or visual inspection, leading to either underwatering (crop stress and yield loss) or overwatering (groundwater depletion, nutrient leaching, and high electricity bills).

This project implements **AgriSense AI**, a full-stack precision irrigation and water conservation decision-support system. It integrates IoT soil sensor telemetry, an educational Scikit-learn Random Forest machine-learning pipeline, and an agronomic physics engine (FAO-56 Penman-Monteith reference evapotranspiration and soil-water balance). The system answers two fundamental questions for a farmer: **"Does my field need water right now?"** and **"Exactly how many liters and pump hours should I apply?"** All sensor observations, model recommendations, and completed water applications are persisted in an embedded SQLite database and visualized on a responsive React dashboard.

---

## 2. Problem Statement and Objectives

### Problem Statement
Agricultural irrigation accounts for approximately 70% of global freshwater withdrawals. Small and medium-scale farmers lack accessible, scientific tools to calculate real-time soil moisture depletion and crop-specific evapotranspiration. Existing commercial IoT systems are expensive, proprietary, and act as "black boxes" that do not explain why irrigation is recommended or factor in forecasted rainfall credits.

### Objectives
1. **Accurate Telemetry Ingestion:** Ingest real and simulated soil moisture, temperature, humidity, and rainfall readings via standard HTTP REST endpoints compatible with ESP32 microcontrollers.
2. **Machine Learning Inference:** Train reproducible Random Forest classification and regression models on labeled multi-feature agricultural data to predict irrigation requirement and water volume baselines.
3. **Agronomic Physics Integration:** Combine ML inference with FAO-56 Penman-Monteith soil-water balance equations to calculate crop evapotranspiration ($ET_c = ET_0 \times K_c$), credit natural rainfall, and prevent unnecessary pumping.
4. **Transparent Water Calculation:** Clearly separate educational ML baselines from physical volumetric formulas ($1\text{ mm depth} \times 1\text{ m}^2 = 1\text{ Liter}$) and application efficiencies.
5. **Farmer-Centered Usability:** Provide an intuitive web application with clear navigation, interactive Recharts visualizations, offline USDA soil-testing fallback protocols, and full audit history.

---

## 3. How the Application Helps Farmers

- **Prevents Groundwater Waste:** Calculates exact volumetric water requirements (in liters and cubic meters) adjusted for irrigation method efficiency (Drip: 90%, Sprinkler: 75%, Furrow: 60%).
- **Automates Rain Credits:** Automatically discounts upcoming rainfall forecasts (24–48 hours) from recommended pumping volumes, saving thousands of liters of groundwater per hectare.
- **Calculates Exact Pump Runtime:** Translates gross water volumes directly into pump operating duration (hours and minutes) using the farmer's measured flow rate (Liters Per Minute or Liters Per Hour).
- **Explainable Evidence:** Rather than displaying an unverified prediction number, the interface provides a plain-language explanation of soil moisture status, crop sensitivity stage, and atmospheric demand.
- **Contingency Protocols:** Includes a built-in USDA "Feel and Appearance" soil moisture guide so farmers can make informed decisions even during hardware or connectivity outages.

---

## 4. Technology Stack

### Frontend
- **Framework:** React 18.3 with Vite 5
- **Styling:** Tailwind CSS 3.4 & PostCSS with an agricultural theme
- **Routing:** React Router DOM v6
- **Data Visualization:** Recharts 2.15 (AreaCharts, BarCharts, PieCharts)
- **Icons:** Lucide React (clean SVG icons)
- **HTTP Client:** Axios 1.7 with centralized timeout and error interception

### Backend
- **Framework:** FastAPI 0.115 (Python 3.10+)
- **ASGI Server:** Uvicorn (multi-worker with live reload)
- **Persistence & ORM:** SQLAlchemy 2.0 with SQLite 3
- **Validation:** Pydantic v2 (strict type checking, range validation)
- **Testing:** Pytest & HTTPX TestClient

### Machine Learning
- **Library:** Scikit-learn 1.5+
- **Algorithms:** Random Forest Classifier & Random Forest Regressor
- **Pipelines:** `ColumnTransformer` with `StandardScaler` (numeric) and `OneHotEncoder(handle_unknown='ignore')` (categorical)
- **Serialization:** Joblib

---

## 5. System Architecture and Data Flow

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        USER / FARMER BROWSER                           │
│                React 18 + Vite Web App (Port 5173)                     │
│   [Dashboard]  [Decision Support]  [Analytics]  [Sensors]  [Settings]  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / REST (Axios)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        FASTAPI BACKEND (Port 8000)                     │
│  ┌───────────────────────┐  ┌───────────────────────────────────────┐  │
│  │   Input Validation    │  │           API Route Layer             │  │
│  │    (Pydantic v2)      │  │ /fields, /readings, /predict, etc.    │  │
│  └───────────┬───────────┘  └───────────────────┬───────────────────┘  │
│              │                                  │                      │
│              ▼                                  ▼                      │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │             Hybrid Decision Engine (irrigation_service)           │  │
│  │  ┌─────────────────────────────┐ ┌─────────────────────────────┐ │  │
│  │  │  Scikit-learn Random Forest │ │     FAO-56 Agronomic Physics│ │  │
│  │  │  - Binary Classifier        │ │     - Penman-Monteith ET0   │ │  │
│  │  │  - Water Regressor          │ │     - Root-zone Depletion   │ │  │
│  │  │  - Educational Baseline     │ │     - Rain Credit Deduction │ │  │
│  │  └─────────────────────────────┘ └─────────────────────────────┘ │  │
│  │  ┌─────────────────────────────────────────────────────────────┐ │  │
│  │  │   Pure Water Volume & Runtime Math (1 mm × 1 m² = 1 L)      │ │  │
│  │  └─────────────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
└─────────────────────────────────────┼──────────────────────────────────┘
                                      │ SQLAlchemy 2.0
                                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      SQLITE DATABASE (Persistent Disk)                 │
│              File: data/smart_irrigation.db                            │
│  [fields]      [sensor_readings]      [predictions]  [irrigation_events]
└────────────────────────────────────────────────────────────────────────┘
```

### Data Flow Steps:
1. Soil sensor nodes or manual operators submit environmental readings (`soil_moisture`, `temperature`, `humidity`, `rainfall`).
2. FastAPI validates inputs against strict agronomic physical bounds.
3. The Decision Engine dispatches data to:
   - **Machine Learning Layer:** Pipeline transforms features and predicts probability and baseline water need.
   - **FAO-56 Agronomic Layer:** Calculates daily reference evapotranspiration ($ET_0$), applies crop coefficient ($K_c$), calculates root zone depletion, and credits rainfall.
   - **Volumetric Engine:** Computes net and gross irrigation volume and pump run duration.
4. Decision record, confidence, and metrics are written to SQLite.
5. React receives structured JSON with clean separation of ML and physics calculations and updates charts dynamically.

---

## 6. Folder Structure

```text
smart-irrigation/
├── backend/
│   ├── routes/
│   │   ├── analytics.py        # /api/dashboard, /api/analytics, /api/model-metrics
│   │   ├── fields.py           # CRUD for farm fields & IoT device pairing
│   │   ├── predictions.py      # /api/predict & /api/predictions history
│   │   ├── sensors.py          # /api/readings, /api/sensors/ingest, /api/sensors/simulate
│   │   └── water_budget.py     # /api/water-budget, /api/irrigation-logs
│   ├── services/
│   │   ├── agronomic_service.py # FAO-56 Penman-Monteith & soil depletion engine
│   │   └── irrigation_service.py# Phase 3 hybrid orchestrator & volume/runtime math
│   ├── database.py             # SQLite configuration, SQLAlchemy models & queries
│   ├── main.py                 # FastAPI application, CORS & startup lifespan
│   ├── models.py               # Database model re-exports
│   └── schemas.py              # Pydantic v2 validation models
├── frontend/
│   ├── public/                 # Static web assets
│   ├── src/
│   │   ├── components/         # Sidebar, Header, StatCard, Panel, MoistureChart
│   │   ├── pages/              # Dashboard, Prediction, Analytics, SensorHistory, Settings, Fields, WaterBudget
│   │   ├── services/api.js     # Unified Axios HTTP API client
│   │   ├── App.jsx             # React router setup & field state
│   │   ├── index.css           # Custom theme & typography styling
│   │   └── main.jsx            # React root mount
│   ├── package.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── vite.config.js
├── ml/
│   ├── saved_models/           # Serialized Joblib models and evaluation metrics JSON
│   ├── evaluate.py             # Model training & metrics evaluation script
│   ├── generate_data.py        # Reproducible synthetic sensor data generator
│   ├── predictor.py            # Cached model inference & fallback loader
│   ├── preprocessing.py        # Scikit-learn Pipeline & ColumnTransformer definition
│   ├── train_classifier.py     # Random Forest Classifier training script
│   └── train_regressor.py      # Random Forest Regressor training script
├── data/
│   ├── sample_sensor_data.csv  # 2,400 labeled synthetic training samples
│   └── smart_irrigation.db     # SQLite database (auto-seeded on startup)
├── tests/
│   ├── test_agronomic.py       # ET0 and depletion physics tests
│   ├── test_api.py             # FastAPI health & CRUD tests
│   ├── test_dataset.py         # CSV ranges and schema integrity tests
│   ├── test_fields.py          # Field registration & deletion tests
│   ├── test_integration_workflow.py # Full-stack Phase 5 end-to-end integration tests
│   ├── test_iot_and_budget.py  # ESP32 telemetry ingestion & water budget tests
│   └── test_phase3.py          # Phase 3 validation, unit conversion & runtime tests
├── requirements.txt            # Python dependencies
├── run_backend.bat             # Windows one-click backend runner
└── README.md                   # Complete academic documentation
```

---

## 7. Dataset Description and Synthetic-Data Limitations

### Dataset Description
The training dataset is generated by `ml/generate_data.py` and saved to `data/sample_sensor_data.csv`. It contains **2,400 synthetic agricultural sensor observations** with a fixed random seed (`seed=42`) for reproducibility.

| Column | Type | Range / Categories | Description |
|---|---|---|---|
| `soil_moisture` | Float | 10.0% – 90.0% | Volumetric soil water content percentage |
| `temperature` | Float | 12.0°C – 45.0°C | Ambient air temperature |
| `humidity` | Float | 20.0% – 95.0% | Ambient relative humidity |
| `rainfall` | Float | 0.0 mm – 60.0 mm | Recent natural precipitation |
| `forecast_rainfall`| Float | 0.0 mm – 50.0 mm | Expected precipitation in next 24–48 hours |
| `soil_type` | Categorical | Sandy, Loamy, Clay, Silty | Soil texture influencing water holding capacity |
| `crop_type` | Categorical | Wheat, Rice, Maize, Cotton, Vegetables | Crop species determining water demand |
| `growth_stage` | Categorical | Seedling, Vegetative, Flowering, Maturity | Phenological stage determining crop coefficient ($K_c$) |
| `irrigation_needed`| Binary Int | `0` (No), `1` (Yes) | Target classification label |
| `water_liters_per_acre`| Float | 0.0 – 350.0 L/acre | Target continuous regression label |

### Synthetic Data Limitations (Academic Transparency)
- The dataset is programmatically generated to model physical agronomic tendencies with realistic Gaussian noise.
- **It does not represent physical observations from a commercial farm.**
- Factors such as soil salinity, hardpan depth, wind speed, solar radiation, and subsurface drainage are simplified.
- Consequently, model predictions serve as an **educational prototype** and decision-support baseline rather than a substitute for calibrated agronomist advice.

---

## 8. Explanation of the Classifier and Regressor

Both models are implemented using Scikit-learn Pipelines with strict prevention of data leakage (transformers are fit exclusively on training splits).

### Preprocessing Pipeline (`ml/preprocessing.py`)
- **Numeric Features** (`soil_moisture`, `temperature`, `humidity`, `rainfall`, `forecast_rainfall`): Imputed with median strategy and scaled with `StandardScaler`.
- **Categorical Features** (`soil_type`, `crop_type`, `growth_stage`): Imputed with constant strategy and encoded with `OneHotEncoder(handle_unknown='ignore')`.

### 1. Random Forest Classifier (`ml/train_classifier.py`)
- **Task:** Binary classification to determine if irrigation is required (`1`) or not (`0`).
- **Hyperparameters:** `n_estimators=100`, `max_depth=12`, `min_samples_split=4`, `random_state=42`.
- **Held-Out Test Performance (20% split, 480 test samples):**
  - **Accuracy:** `92.50%`
  - **Precision:** `88.29%`
  - **Recall:** `93.78%`
  - **F1 Score:** `90.95%`
  - **Confusion Matrix:** 263 True Negatives, 24 False Positives, 12 False Negatives, 181 True Positives.

### 2. Random Forest Regressor (`ml/train_regressor.py`)
- **Task:** Continuous regression to estimate the baseline irrigation water volume (`water_liters_per_acre`).
- **Hyperparameters:** `n_estimators=100`, `max_depth=12`, `min_samples_split=4`, `random_state=42`.
- **Held-Out Test Performance (20% split, 480 test samples):**
  - **Mean Absolute Error (MAE):** `5.90 L/acre`
  - **Root Mean Squared Error (RMSE):** `10.78 L/acre`
  - **Coefficient of Determination ($R^2$):** `0.9072`

---

## 9. Explanation of Irrigation Water Calculations and Units

To maintain scientific integrity, the application strictly separates machine-learning predictions from physical water calculations.

### Core Physical Conversion
$$\mathbf{1\text{ mm of water depth over } 1\text{ m}^2 = 1\text{ Liter of water}}$$

*Proof:*  
$1\text{ mm} = 0.001\text{ m}$.  
$1\text{ m}^2 \times 0.001\text{ m} = 0.001\text{ m}^3 = 1\text{ Liter}$.

### Step-by-Step Calculation Formulae

1. **Area Conversion:**
   $$A_{\text{m}^2} = \text{area\_acres} \times 4046.86\text{ m}^2/\text{acre}$$

2. **Net Water Volume Needed ($V_{\text{net}}$):**
   $$V_{\text{net}} = D_{\text{depth\_mm}} \times A_{\text{m}^2} \times 1.0\text{ L/(mm}\cdot\text{m}^2)$$

3. **Gross Water Volume Needed ($V_{\text{gross}}$):**
   Irrigation systems lose water to evaporation, wind drift, and percolation. Therefore, net water is divided by application efficiency ($\eta$):
   $$V_{\text{gross}} = \frac{V_{\text{net}}}{\eta_{\text{efficiency}}}$$
   - **Drip Irrigation:** $\eta = 0.90$ (90% efficient)
   - **Sprinkler Irrigation:** $\eta = 0.75$ (75% efficient)
   - **Furrow Irrigation:** $\eta = 0.60$ (60% efficient)
   - **Basin Irrigation:** $\eta = 0.65$ (65% efficient)

4. **Irrigation Pump Runtime ($T_{\text{hours}}$):**
   Calculated **only when a valid system flow rate in Liters Per Hour ($Q_{\text{LPH}}$) is provided**:
   $$T_{\text{hours}} = \frac{V_{\text{gross}}}{Q_{\text{LPH}}}$$
   *(If flow rate is given in LPM, $Q_{\text{LPH}} = Q_{\text{LPM}} \times 60$. If no valid flow rate is provided, runtime is reported as `None` rather than inventing an estimate).*

---

## 10. Database Tables and API Endpoints

### Database Tables (SQLite: `data/smart_irrigation.db`)

1. **`fields` (`FieldRecord`):** Stores registered farm blocks, acreage, crop type, planting date, soil type, method, pump flow rate, and seasonal water budget targets.
2. **`sensor_readings` (`SensorReading`):** Chronological sensor telemetry records (`soil_moisture`, `temperature`, `humidity`, `rainfall`, source badge, battery voltage).
3. **`predictions` (`PredictionRecord`):** Persisted historical decision support evaluations, model confidence, recommended water volume, runtime, and full JSON payloads.
4. **`irrigation_events` (`IrrigationEvent`):** Completed physical water applications, recorded duration, pumped volume, and operator notes.

### Core API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Healthcheck verifying server status and SQLite connectivity |
| `GET` | `/api/dashboard` | Dashboard summary counters, average moisture, and 7-day trend |
| `GET` | `/api/fields` | List all registered farm fields |
| `POST` | `/api/fields` | Register a new farm field |
| `GET` | `/api/readings` | Retrieve paginated sensor readings from SQLite |
| `POST` | `/api/readings` | Add a manual or hardware sensor reading |
| `POST` | `/api/sensors/simulate` | Ingest a realistic live simulated telemetry reading |
| `GET` | `/api/sensors/devices` | Inspect connected ESP32 nodes and battery health |
| `POST` | `/api/predict` | Run hybrid ML + FAO-56 decision support evaluation |
| `GET` | `/api/predictions` | Retrieve saved historical prediction records |
| `GET` | `/api/water-budget` | Retrieve seasonal applied water vs budget and water saved |
| `GET` | `/api/irrigation-logs` | Retrieve historical completed irrigation sessions |
| `POST` | `/api/irrigation-logs` | Record an applied irrigation event |
| `GET` | `/api/analytics` | Retrieve crop usage, field averages, and sensor time-series |
| `GET` | `/api/model-metrics` | Retrieve verified held-out ML evaluation metrics |

---

## 11. Installation Instructions for Windows 11 and VS Code

### Prerequisites
1. **Python 3.10, 3.11, 3.12, or 3.14:** [python.org](https://www.python.org/) (Ensure *"Add Python to PATH"* is checked during installation).
2. **Node.js LTS (v18 or v20+):** [nodejs.org](https://nodejs.org/) (Includes npm).
3. **Visual Studio Code:** [code.visualstudio.com](https://code.visualstudio.com/).
4. **Git for Windows:** [git-scm.com](https://git-scm.com/).

### Setup Steps
1. Open VS Code and open the project directory:
   `File → Open Folder... → smart-irrigation`
2. Open a new PowerShell terminal (`Ctrl + ~` or `Terminal → New Terminal`).
3. Set execution policy for the session if script activation is restricted:
   ```powershell
   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
   ```
4. Create and activate a Python virtual environment:
   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```
5. Install Python dependencies:
   ```powershell
   python -m pip install --upgrade pip
   pip install -r requirements.txt
   ```
6. Install frontend JavaScript dependencies:
   ```powershell
   cd frontend
   npm install
   cd ..
   ```

---

## 12. Exact Backend and Frontend Run Commands

To run the application, open **two separate terminals** in VS Code:

### Terminal 1 — Start the FastAPI Backend:
```powershell
# From the project root (smart-irrigation):
.\.venv\Scripts\Activate.ps1
python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```
*Backend will be running at:* `http://127.0.0.1:8000`  
*Swagger Documentation:* `http://127.0.0.1:8000/docs`

### Terminal 2 — Start the React Frontend:
```powershell
# From the frontend directory (smart-irrigation/frontend):
cd frontend
npm run dev
```
*Frontend will be running at:* `http://127.0.0.1:5173`

---

## 13. Model Training Commands

To regenerate synthetic data and retrain both Scikit-learn pipelines from scratch:

```powershell
# From the project root:
.\.venv\Scripts\Activate.ps1

# 1. Generate 2,400 synthetic sensor rows
python -m ml.generate_data

# 2. Train classifier, regressor, and save evaluation metrics JSON
python -m ml.evaluate
```

This updates the model artifacts in `ml/saved_models/`:
- `irrigation_classifier.joblib`
- `water_regressor.joblib`
- `classifier_metrics.json`
- `regressor_metrics.json`
- `evaluation_summary.json`

---

## 14. Automated Test Commands

Run the comprehensive automated test suite with Pytest from the project root:

```powershell
# Run all 59 tests with verbose output:
python -m pytest tests/ -v

# Run with concise summary:
python -m pytest tests/ -q
```

### Verified Test Suite Breakdown:
- `tests/test_agronomic.py` (4 tests): ET0 estimation, dry soil trigger, rain credit postponement.
- `tests/test_api.py` (6 tests): Healthcheck, sensor reading CRUD, irrigation event CRUD, validation limits.
- `tests/test_dataset.py` (3 tests): CSV features, binary targets, sensor physical range integrity.
- `tests/test_fields.py` (2 tests): Field creation, listing, and deletion.
- `tests/test_iot_and_budget.py` (3 tests): ESP32 ADC calibration ingestion, device health, water budgeting.
- `tests/test_phase3.py` (38 tests): Input validation, 1mm×1m²=1L conversion, efficiency scaling, flow rate runtime.
- `tests/test_integration_workflow.py` (3 tests): End-to-end full workflow and SQLite reconnect persistence.

---

## 15. Troubleshooting for Common Startup and Connection Errors

| Symptom / Error | Root Cause | Solution |
|---|---|---|
| `ModuleNotFoundError: No module named 'backend'` | Running uvicorn from outside the project root or without virtual environment | Ensure terminal is in `smart-irrigation` directory and `.venv` is activated. |
| `Execution of scripts is disabled on this system` | Windows PowerShell execution policy restriction | Run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` in your terminal. |
| `ERR_CONNECTION_REFUSED` at `http://127.0.0.1:8000` | Backend server is not running | Open Terminal 1 and start Uvicorn using the command in Section 12. |
| `Port 8000 is already in use` | A lingering Python process is holding port 8000 | In PowerShell, run `Get-Process python \| Stop-Process -Force`, then start uvicorn again. |
| `TypeError: irrigationHistory.map is not a function` | API response wrapper `{items: [...]}` parsed incorrectly | Resolved in code — ensure latest frontend files are pulled and Vite dev server is restarted. |
| `spawn git ENOENT` when installing skills | Git executable not in process environment PATH | Add `C:\Program Files\Git\cmd` to your Windows PATH environment variable. |

---

## 16. Project Limitations and Future Improvements

### Current Limitations
1. **Synthetic Sensor Data:** Trained on simulated datasets for academic reproducibility; commercial deployment requires field calibration with local soil probes.
2. **Manual / Simulated Weather:** Uses forecasted rainfall values supplied in the request rather than querying live commercial weather APIs.
3. **No Automatic Pump Actuation:** The system outputs human-in-the-loop decision recommendations; it does not directly switch relay switches or high-voltage pump contactors.

### Future Improvements
1. **LoRaWAN / Cellular Telemetry:** Implement long-range LPWAN communication for large-scale agricultural installations without Wi-Fi coverage.
2. **Satellite NDVI Integration:** Incorporate Sentinel-2 multispectral imagery to measure crop vegetation vigor and leaf canopy temperature.
3. **Closed-Loop Relay Control:** Add a secure MQTT / Relay actuator module with safety fail-safes (e.g. automatic cutoff on pipe burst pressure drops).

---

## 17. Simple End-to-End Demonstration Procedure

Follow this 5-minute procedure to demonstrate the project to your teacher or evaluator:

1. **Step 1 — Show System Health & Architecture:**
   - Open [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health) to show that FastAPI and SQLite are connected.
   - Open [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) to show the interactive Swagger API documentation.
2. **Step 2 — Open the Web Dashboard:**
   - Open [http://127.0.0.1:5173/](http://127.0.0.1:5173/).
   - Point out the real-time stat cards (Average Moisture, Water Applied, Decision Evaluations, Managed Fields) and the 7-day moisture depletion chart.
   - Click **"Simulate Telemetry"** to demonstrate live IoT reading generation and instantaneous dashboard updates.
3. **Step 3 — Run Decision Support (Prediction):**
   - Click **"Run Decision Support"** or navigate to `/prediction`.
   - Click the **"Dry Stress"** preset button (sets moisture to 18%, temperature to 34°C).
   - Click **"Calculate Irrigation Need"**.
   - Show the result:
     - Clear status: *"Irrigation recommended"*.
     - Explainable rationale in the *"Why this recommendation?"* box.
     - **Physical Water Calculation:** Gross volume (Liters), Depth (mm), Area (m²), and Pump Runtime (hours/min) using the `1 mm × 1 m² = 1 L` formula.
     - **Educational Machine Learning Card:** Displays Random Forest prediction, 93%+ confidence, and academic disclaimer.
   - Click **"Record This Applied Session to Farm Water Log"** to log the event to the database.
4. **Step 4 — Add a Sensor Reading:**
   - Navigate to `/history` (Sensors & IoT).
   - Show existing readings loaded from SQLite.
   - Fill in a manual reading (e.g., Moisture: 32%, Temp: 29°C) and click **"Save sensor reading"**.
   - Show that the reading immediately appears at the top of the table.
5. **Step 5 — Review Water Analytics & ML Evaluation:**
   - Navigate to `/analytics`.
   - Point out the Recharts AreaChart (Moisture depletion over time), BarChart (Applied water by field), and PieChart (Crop distribution).
   - Point out the **actual held-out ML evaluation metrics** (Classifier Accuracy: 92.5%, Regressor R²: 0.907).
6. **Step 6 — Verify Persistence Across Restart:**
   - Refresh the browser (`F5`).
   - Confirm that all newly added readings and logged events remain intact in the SQLite database.

---

## 18. Common Viva Questions and Answers

### Q1: What is the core difference between your ML prediction and your agronomic calculation?
> **Answer:** The Machine Learning models (Random Forest Classifier & Regressor) identify non-linear statistical patterns from historical data to provide an educational baseline probability. The Agronomic Engine implements standard FAO-56 Penman-Monteith physics, calculating soil moisture depletion against Field Capacity and Management Allowed Depletion (MAD), accounting for crop coefficients ($K_c$) and crediting upcoming rainfall. We deliberately keep both outputs separated so that farmers have physical transparency rather than trusting an unverified ML estimate.

### Q2: Why did you choose Random Forest over simpler linear models or deep neural networks?
> **Answer:** Random Forest is an ensemble of decision trees that handles tabular agricultural data exceptionally well. It naturally captures non-linear interactions (e.g., high temperature combined with low humidity accelerating moisture depletion) without requiring complex feature transformations. Unlike deep neural networks, it does not overfit on moderate-sized datasets (~2,400 samples) and provides fast, deterministic inference suitable for edge deployment.

### Q3: How do you calculate irrigation water volume and pump runtime?
> **Answer:** We use the fundamental volumetric conversion: $1\text{ mm of water over } 1\text{ m}^2 = 1\text{ Liter}$. Net volume is depth in mm multiplied by field area in square meters ($1\text{ acre} = 4{,}046.86\text{ m}^2$). Gross volume is net volume divided by the application efficiency of the system (e.g., 90% for drip). Runtime is calculated strictly as gross volume divided by the system's verified flow rate in Liters Per Hour ($Q_{\text{LPH}}$).

### Q4: How does the system prevent data leakage during machine learning training?
> **Answer:** We split the dataset into 80% training and 20% testing sets *before* fitting any preprocessors. Numeric scaling (`StandardScaler`) and categorical encoding (`OneHotEncoder`) are encapsulated inside Scikit-learn `Pipeline` objects. The scalers and encoders are fitted exclusively on the training fold and only transform the test fold.

### Q5: How does forecasted rainfall save water in your algorithm?
> **Answer:** When rainfall is forecasted within the next 24 to 48 hours, the agronomic engine calculates an effective rainfall credit. If the forecasted rain is sufficient to refill the root zone above the crop's stress threshold, the algorithm postpones irrigation and notifies the farmer, conserving groundwater and pumping energy.
