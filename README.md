# SustainScan: Renewable Energy Suitability Finder

SustainScan is a high-performance geospatial application designed to evaluate the suitability of any location for Solar and Wind energy production. By integrating real-world meteorological data with land-use intelligence, it provides actionable insights for renewable energy planning.

## 🚀 Key Features

- **Global Location Analysis**: Search by city name or decimal coordinates.
- **NASA POWER Integration**: Fetches actual historical solar irradiance and wind speed data for the specific location.
- **Urban Density Logic**: Automatically detects urban vs. rural environments using OpenStreetMap tags, adjusting wind turbine feasibility scores accordingly.
- **Bento Grid UI**: A modern, responsive dashboard designed for high information density and clarity.
- **Interactive Visualization**:
  - **Leaflet Map**: Precision location tracking with demographic context.
  - **Chart.js Radar Profile**: Compares Solar, Wind, and Grid Reliability factors.
  - **Hybrid Potential Gauge**: Calculates the efficiency of combined energy systems.

## 🛠️ Tech Stack

- **Frontend**: React 19, Tailwind CSS (v4), Leaflet.js, Chart.js, Framer Motion.
- **Backend**: Node.js (Express), Axios for API orchestration.
- **Data Sources**: 
  - **NASA POWER API**: Global meteorology and solar data.
  - **Nominatim (OpenStreetMap)**: Geocoding and land-use classification.

## 📐 Technical Methodology

### Solar Calculation
The solar suitability score is derived from the **Peak Sun Hours (PSH)** index:
- **Excellent**: > 5.0 kWh/m²/day
- **Good**: 3.0 - 5.0 kWh/m²/day
- **Low**: < 3.0 kWh/m²/day

### Wind Power Density
Wind scores are calculated based on mean speeds at a 50m height. We utilize the cubic relationship between wind speed and power:
**P = 0.5 · ρ · A · v³**
Where:
- `P`: Power output
- `ρ`: Air density (estimated)
- `A`: Swept area of the turbine
- `v`: Wind velocity (sourced from NASA)

*Note: In urban environments, a 40% efficiency penalty is applied to wind scores to account for wake turbulence and zoning restrictions.*

## ⚙️ Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/sustainscan.git
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment Variables**:
   Create a `.env` file in the root directory and add any required API keys (the app is currently configured to use public end-points, but production keys are recommended for higher rate limits).

4. **Run the development server**:
   ```bash
   npm run dev
   ```

## 🌐 Deployment to Netlify

This project is pre-configured for one-click deployment to Netlify.

### 1. Push to GitHub
Upload your project to a GitHub repository.

### 2. Connect to Netlify
1. Log in to [Netlify](https://www.netlify.com/).
2. Click **"Add new site"** > **"Import an existing project"**.
3. Select your GitHub repository.
4. Netlify will automatically detect the settings:
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
   - **Functions Directory**: `netlify/functions`
5. Click **"Deploy site"**.

### 3. Environment Variables
If you eventually add private API keys, go to **Site settings** > **Environment variables** in Netlify to add them securely.

---
## 📜 License
This project is licensed under the Apache-2.0 License.

---
*Built with ❤️ for a Greener Future.*
