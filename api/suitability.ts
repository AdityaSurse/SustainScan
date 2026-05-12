import { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

const axiosConfig = {
  headers: {
    'User-Agent': 'SustainScan-Vercel-Function/1.2 (adityasurse42@gmail.com)',
    'Accept': 'application/json'
  },
  timeout: 9000
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { lat, lon, city } = req.query;
  
  let coords = { lat: Number(lat), lon: Number(lon) };
  
  res.setHeader('Content-Type', 'application/json');

  try {
    // 1. Geocoding if city is provided
    if (city && (!lat || !lon)) {
      const geoUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city as string)}&limit=1`;
      const geoRes = await axios.get(geoUrl, axiosConfig);
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
    const nasaUrl = `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=ALLSKY_SFC_SW_DWN,WS50M&community=RE&longitude=${coords.lon}&latitude=${coords.lat}&start=20230101&end=20231231&format=JSON`;
    const nasaRes = await axios.get(nasaUrl, axiosConfig);
    
    const properties = nasaRes.data?.properties?.parameter;
    if (!properties || !properties.ALLSKY_SFC_SW_DWN || !properties.WS50M) {
      return res.status(502).json({ error: "Incomplete meteorological data received from NASA." });
    }

    const solarValues = Object.values(properties.ALLSKY_SFC_SW_DWN as Record<string, number>).filter(v => v !== null && v !== undefined && v > -100);
    const windValues = Object.values(properties.WS50M as Record<string, number>).filter(v => v !== null && v !== undefined && v > -100);

    if (solarValues.length === 0 || windValues.length === 0) {
      return res.status(502).json({ error: "Insufficient valid data for this location." });
    }

    const avgSolarIrradiance = solarValues.reduce((a, b) => a + b, 0) / solarValues.length;
    const avgWindSpeed = windValues.reduce((a, b) => a + b, 0) / windValues.length;

    // 3. Land Use Check
    const reverseGeo = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.lat}&lon=${coords.lon}`, axiosConfig);
    const type = reverseGeo.data?.type || "";
    const placeClass = reverseGeo.data?.class || "";
    const isUrban = ["city", "town", "residential", "highway", "commercial"].includes(type) || ["building", "highway", "place"].includes(placeClass);

    const solarScore = avgSolarIrradiance;
    let solarRating = "Good";
    if (solarScore > 5.0) solarRating = "Excellent";
    else if (solarScore < 3.0) solarRating = "Low";

    let effectiveWindSpeed = avgWindSpeed;
    if (isUrban) effectiveWindSpeed *= 0.6;

    let windRating = "Moderate";
    if (effectiveWindSpeed > 6.0) windRating = "High Potential";
    else if (effectiveWindSpeed < 4.0) windRating = "Low Potential";

    const hybridEfficiency = (solarScore / 6 + effectiveWindSpeed / 8) / 2 * 100;
    const gridReliability = isUrban ? 85 : 60;

    return res.json({
      location: {
        lat: coords.lat,
        lon: coords.lon,
        name: reverseGeo.data?.display_name || "Calculated Point",
        isUrban
      },
      scores: {
        solar: { value: solarScore.toFixed(1), rating: solarRating },
        wind: { value: effectiveWindSpeed.toFixed(1), rating: windRating, rawSpeed: avgWindSpeed.toFixed(1) },
        hybrid: Math.min(Math.round(hybridEfficiency || 0), 100),
        gridReliability
      }
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error while fetching energy metrics." });
  }
}
