import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/suitability", async (req, res) => {
    const { lat, lon, city } = req.query;
    
    let coords = { lat: Number(lat), lon: Number(lon) };

    try {
      const axiosConfig = {
        headers: {
          'User-Agent': 'SustainScan-Applet/1.0 (adityasurse42@gmail.com)'
        }
      };

      // 1. Geocoding if city is provided
      if (city && (!lat || !lon)) {
        const geoRes = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city as string)}&limit=1`, axiosConfig);
        if (geoRes.data && geoRes.data.length > 0) {
          coords.lat = Number(geoRes.data[0].lat);
          coords.lon = Number(geoRes.data[0].lon);
        } else {
          return res.status(404).json({ error: "City not found" });
        }
      }

      if (isNaN(coords.lat) || isNaN(coords.lon)) {
        return res.status(400).json({ error: "Invalid coordinates" });
      }

      // 2. Fetch NASA POWER Data
      // Parameters: ALLSKY_SFC_SW_DWN (Solar Irradiance), WS50M (Wind Speed at 50m)
      const nasaUrl = `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=ALLSKY_SFC_SW_DWN,WS50M&community=RE&longitude=${coords.lon}&latitude=${coords.lat}&start=20230101&end=20231231&format=JSON`;
      const nasaRes = await axios.get(nasaUrl, axiosConfig);
      
      const properties = nasaRes.data.properties.parameter;
      const solarData = Object.values(properties.ALLSKY_SFC_SW_DWN as Record<string, number>);
      const windData = Object.values(properties.WS50M as Record<string, number>);

      // Average values
      const avgSolarIrradiance = solarData.reduce((a, b) => a + b, 0) / solarData.length; // kWh/m²/day
      const avgWindSpeed = windData.reduce((a, b) => a + b, 0) / windData.length; // m/s at 50m

      // 3. Land Use Check (via Nominatim tag)
      // This is a simplification. We check if the address/place has typical urban tags.
      const reverseGeo = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.lat}&lon=${coords.lon}`, axiosConfig);
      const type = reverseGeo.data.type || "";
      const placeClass = reverseGeo.data.class || "";
      const isUrban = ["city", "town", "residential", "highway", "commercial"].includes(type) || ["building", "highway", "place"].includes(placeClass);

      // Suitability Logic
      // Solar Score: PSH > 5.0 = Excellent
      const solarScore = avgSolarIrradiance;
      let solarRating = "Good";
      if (solarScore > 5.0) solarRating = "Excellent";
      else if (solarScore < 3.0) solarRating = "Low";

      // Wind Score: speed > 6.0 m/s = High Potential
      // Applying land use penalty for wind turbines in urban areas (too much turbulence/zoning)
      let effectiveWindSpeed = avgWindSpeed;
      if (isUrban) {
        effectiveWindSpeed *= 0.6; // 40% reduction in feasibility
      }

      let windRating = "Moderate";
      if (effectiveWindSpeed > 6.0) windRating = "High Potential";
      else if (effectiveWindSpeed < 4.0) windRating = "Low Potential";

      // Hybrid Potential
      const hybridEfficiency = (solarScore / 6 + effectiveWindSpeed / 8) / 2 * 100;

      // Mock Grid Reliability (can be expanded with regional data if available)
      // For now, let's derive it from land use (urban = more reliable grid usually)
      const gridReliability = isUrban ? 85 : 60;

      res.json({
        location: {
          lat: coords.lat,
          lon: coords.lon,
          name: reverseGeo.data.display_name,
          isUrban
        },
        scores: {
          solar: { value: solarScore.toFixed(1), rating: solarRating },
          wind: { value: effectiveWindSpeed.toFixed(1), rating: windRating, rawSpeed: avgWindSpeed.toFixed(1) },
          hybrid: Math.min(Math.round(hybridEfficiency), 100),
          gridReliability
        }
      });

    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch energy data" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
