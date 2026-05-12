import { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Leaf, 
  Sun, 
  Wind, 
  Zap, 
  Info, 
  MapPin, 
  TrendingUp,
  Activity,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';
import axios from 'axios';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to handle map centering
function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (center && !isNaN(center[0]) && !isNaN(center[1])) {
       map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
}

interface EnergyData {
  location: {
    lat: number;
    lon: number;
    name: string;
    isUrban: boolean;
  };
  scores: {
    solar: { value: string; rating: string };
    wind: { value: string; rating: string; rawSpeed: string };
    hybrid: number;
    gridReliability: number;
  };
}

export default function App() {
  const [query, setQuery] = useState('');
  const [data, setData] = useState<EnergyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSuitability = async (searchParam: string) => {
    setLoading(true);
    setError(null);
    try {
      const isCoords = /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(searchParam);
      let url = '/api/suitability';
      if (isCoords) {
        const [lat, lon] = searchParam.split(',').map(s => s.trim());
        url += `?lat=${lat}&lon=${lon}`;
      } else {
        url += `?city=${encodeURIComponent(searchParam)}`;
      }
      
      const response = await axios.get(url);
      setData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to fetch data. Please try another location.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch for a default location
    fetchSuitability("Mojave Desert, CA");
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      fetchSuitability(query);
    }
  };

  const radarData = {
    labels: ['Solar Irradiance', 'Wind Speed', 'Grid Reliability', 'Space Availability'],
    datasets: [
      {
        label: 'Suitability Profile',
        data: data ? [
          Math.min(100, parseFloat(data.scores?.solar?.value || '0') * 10),
          Math.min(100, parseFloat(data.scores?.wind?.value || '0') * 10),
          data.scores?.gridReliability || 0,
          data.location?.isUrban ? 30 : 90
        ] : [0, 0, 0, 0],
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        borderColor: '#10b981',
        borderWidth: 2,
        pointBackgroundColor: '#10b981',
      },
    ],
  };

  const radarOptions = {
    scales: {
      r: {
        angleLines: { color: '#27272a' },
        grid: { color: '#27272a' },
        pointLabels: { color: '#71717a', font: { size: 10, weight: 'bold' } },
        ticks: { display: false },
        suggestedMin: 0,
        suggestedMax: 100
      }
    },
    plugins: {
      legend: { display: false }
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8 flex flex-col font-sans overflow-x-hidden">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center shadow-2xl shadow-emerald-500/30">
            <Zap className="w-7 h-7 text-zinc-950" fill="currentColor" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-white">SustainScan</h1>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em]">Renewable Energy Suitability Finder</p>
          </div>
        </div>

        <form onSubmit={handleSearch} className="relative group w-full md:w-[400px]">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-zinc-500 group-focus-within:text-emerald-500 transition-colors" />
          </div>
          <input 
            type="text" 
            placeholder="Search City or Coordinates (e.g. 34.05, -118.24)"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-full py-3.5 pl-11 pr-4 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all text-zinc-300 placeholder-zinc-600"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {loading && (
            <div className="absolute inset-y-0 right-4 flex items-center">
              <div className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
            </div>
          )}
        </form>
      </header>

      {/* Main Grid Content */}
      <main className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-7xl mx-auto w-full flex-grow auto-rows-[minmax(180px,auto)]">
        
        {/* Map Container (2x2) */}
        <div className="md:col-span-2 md:row-span-2 bg-zinc-900 rounded-[2.5rem] border border-zinc-800 relative overflow-hidden group shadow-xl">
          <div className="absolute inset-0 z-0">
             {data ? (
                <MapContainer 
                  center={[data.location.lat, data.location.lon]} 
                  zoom={10} 
                  zoomControl={false}
                  className="h-full w-full"
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={[data.location.lat, data.location.lon]} />
                  <MapUpdater center={[data.location.lat, data.location.lon]} />
                </MapContainer>
             ) : (
               <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                 <MapPin className="w-8 h-8 text-zinc-800 animate-pulse" />
               </div>
             )}
          </div>
          
          <div className="absolute top-6 left-6 z-10 bg-zinc-950/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-zinc-800/50 flex items-center gap-2 shadow-2xl">
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-zinc-500 uppercase leading-none mb-0.5">Active Location</span>
              <span className="text-xs font-semibold text-zinc-200 line-clamp-1">{data?.location.name.split(',')[0] || "Identifying..."}</span>
            </div>
          </div>

          <div className="absolute bottom-6 right-6 z-10 flex flex-wrap gap-2 justify-end">
            {data?.location.isUrban ? (
              <div className="px-3 py-1.5 bg-zinc-950/80 backdrop-blur-md border border-zinc-800 rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-3 h-3 text-amber-500" />
                <span className="text-[10px] text-zinc-400 font-bold uppercase">Dense Urban Area</span>
              </div>
            ) : (
              <div className="px-3 py-1.5 bg-zinc-950/80 backdrop-blur-md border border-zinc-800 rounded-xl flex items-center gap-2">
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                <span className="text-[10px] text-zinc-400 font-bold uppercase">Open Range / Low Density</span>
              </div>
            )}
            <div className={cn(
              "px-3 py-1.5 border rounded-xl text-[10px] font-bold uppercase tracking-wider backdrop-blur-md",
              data?.scores.solar.rating === 'Excellent' ? "bg-amber-500/20 border-amber-500/50 text-amber-400" : "bg-zinc-800/50 border-zinc-700 text-zinc-400"
            )}>
              Solar Focus
            </div>
          </div>
        </div>

        {/* Solar Card (1x1) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900 rounded-[2.5rem] border border-zinc-800 p-8 flex flex-col justify-between group hover:border-amber-500/30 transition-all duration-500 shadow-lg"
        >
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center">
              <Sun className="w-5 h-5 text-amber-500" />
            </div>
            <TrendingUp className="w-4 h-4 text-zinc-700 group-hover:text-amber-500 transition-colors" />
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <h2 className="text-5xl font-black text-white">{data?.scores?.solar?.value || "---"}</h2>
              <span className="text-sm font-bold text-zinc-600 uppercase">PSH</span>
            </div>
            <p className="text-[11px] text-amber-400 mt-2 font-black uppercase tracking-tight">
              {data?.scores?.solar?.rating || "---"} Suitability
            </p>
          </div>
        </motion.div>

        {/* Wind Card (1x1) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-zinc-900 rounded-[2.5rem] border border-zinc-800 p-8 flex flex-col justify-between group hover:border-sky-500/30 transition-all duration-500 shadow-lg"
        >
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 bg-sky-500/10 rounded-xl flex items-center justify-center">
              <Wind className="w-5 h-5 text-sky-500" />
            </div>
            <Activity className="w-4 h-4 text-zinc-700 group-hover:text-sky-500 transition-colors" />
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <h2 className="text-5xl font-black text-white">{data?.scores?.wind?.value || "---"}</h2>
              <span className="text-sm font-bold text-zinc-600 uppercase">m/s</span>
            </div>
            <p className="text-[11px] text-sky-400 mt-2 font-black uppercase tracking-tight">
              {data?.scores?.wind?.rating || "---"} Potential
            </p>
          </div>
        </motion.div>

        {/* Chart Card (2x1) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="md:col-span-2 bg-zinc-900 rounded-[2.5rem] border border-zinc-800 p-8 flex flex-col relative overflow-hidden"
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-bold text-zinc-500 tracking-widest uppercase">Resource Comparison Profile</h3>
            <Info className="w-4 h-4 text-zinc-700 cursor-help" />
          </div>
          <div className="flex-grow flex items-center justify-center pb-4">
             <Radar data={radarData} options={radarOptions} />
          </div>
          <div className="bg-zinc-900/50 backdrop-blur-sm border-t border-zinc-800 mt-2 pt-4 flex justify-between items-center px-2">
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#10b981]"></span>
                  <span className="text-[10px] text-zinc-600 font-bold uppercase">Optimal</span>
               </div>
               <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-zinc-700"></span>
                  <span className="text-[10px] text-zinc-600 font-bold uppercase">Threshold</span>
               </div>
            </div>
            <span className="text-[10px] text-zinc-700 font-mono italic">NASA POWER Sourced</span>
          </div>
        </motion.div>

        {/* Hybrid Efficiency (1x1) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-zinc-900 rounded-[2.5rem] border border-zinc-800 p-8 flex flex-col justify-center items-center text-center group hover:bg-zinc-800/20 transition-colors shadow-lg"
        >
          <div className="relative mb-6">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle cx="64" cy="64" r="58" stroke="rgba(39, 39, 42, 0.5)" strokeWidth="12" fill="transparent" />
              <circle 
                cx="64" cy="64" r="58" 
                stroke="#10b981" 
                strokeWidth="12" 
                strokeDasharray={`${2 * Math.PI * 58}`} 
                strokeDashoffset={`${(2 * Math.PI * 58) * (1 - (data?.scores.hybrid || 0) / 100)}`} 
                fill="transparent" 
                strokeLinecap="round" 
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-white leading-none">{data?.scores.hybrid || "---"}%</span>
            </div>
          </div>
          <div className="w-full">
            <span className="text-xs font-black text-emerald-500 uppercase tracking-tighter">Hybrid Efficiency</span>
            <div className="h-0.5 w-12 bg-emerald-500/30 mx-auto my-2 rounded-full"></div>
            <p className="text-[10px] text-zinc-500 font-medium leading-tight">
              Calculated compatibility between solar & local wind patterns.
            </p>
          </div>
        </motion.div>

        {/* Technical Methodology (1x1) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-zinc-950 rounded-[2.5rem] border-2 border-zinc-900 p-8 flex flex-col overflow-hidden relative shadow-inner"
        >
          <div className="absolute -right-4 -top-4 opacity-5 pointer-events-none">
            <Leaf className="w-32 h-32 rotate-12" />
          </div>
          <h3 className="text-xs font-black text-zinc-300 tracking-widest uppercase mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
            Analysis Logic
          </h3>
          <div className="space-y-4 font-mono">
            <div>
              <p className="text-[10px] text-emerald-500 uppercase font-bold mb-1.5">Wind Power Density</p>
              <div className="bg-zinc-900/80 p-3 rounded-2xl border border-zinc-800/50 text-[11px] text-zinc-300 leading-relaxed shadow-sm">
                P = 0.5 ⋅ ρ ⋅ A ⋅ v³
                <span className="block mt-1 text-[9px] text-zinc-500">(ρ: air density, v: velocity)</span>
              </div>
            </div>
            <div>
              <p className="text-[10px] text-amber-500 uppercase font-bold mb-1.5">Solar Metric</p>
              <p className="text-[11px] leading-relaxed text-zinc-500">
                Determined via NASA PSH indices (kWh/m²/day) adjusted for local turbidity.
              </p>
            </div>
            <div className="pt-2 flex items-center gap-3">
              <div className="flex -space-x-2">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-[9px] text-emerald-500">O</div>
                <div className="w-5 h-5 rounded-full bg-sky-500/20 border border-sky-500/50 flex items-center justify-center text-[9px] text-sky-500">W</div>
                <div className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-[9px] text-amber-500">N</div>
              </div>
              <span className="text-[9px] text-zinc-600 font-bold uppercase">Multimodal API Context</span>
            </div>
          </div>
        </motion.div>

      </main>

      {/* Footer Info */}
      <footer className="mt-12 max-w-7xl mx-auto w-full flex flex-col md:flex-row justify-between items-center gap-6 pb-8 text-zinc-600">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[10px] font-bold uppercase tracking-widest">System Operational</span>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest border-l border-zinc-800 pl-6">
            Data Refresh: Oct 2023 - Oct 2024
          </p>
        </div>
        <div className="flex gap-4">
           {['OpenStreetMap', 'NASA POWER', 'Chart.js'].map(tech => (
             <span key={tech} className="px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-[10px] font-mono text-zinc-500 hover:text-zinc-300 transition-colors">
               {tech}
             </span>
           ))}
        </div>
      </footer>

      {/* Error Overlay */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm"
          >
            <div className="bg-zinc-900 border border-red-500/30 rounded-[2rem] p-8 max-w-md w-full shadow-2xl">
              <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <h4 className="text-xl font-black text-white mb-2">Location Conflict</h4>
              <p className="text-sm text-zinc-500 leading-relaxed mb-6">{error}</p>
              <button 
                onClick={() => setError(null)}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl transition-all"
              >
                Retrying...
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
