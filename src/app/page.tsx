"use client"; // Enables dynamic clicking and tab state
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/Tabs";
import { KineticText } from "@/components/ui/kinetic-text";
import { MorphingText } from "@/components/ui/morphing-text";
import { cx } from '@/lib/utils';
import {
  RiArrowDownLine,
  RiArrowRightLine,
  RiArrowUpLine,
  RiBuilding4Line,
  RiCheckboxCircleLine,
  RiCheckLine,
  RiContactsBook3Line,
  RiDashboardLine,
  RiDeleteBinLine,
  RiErrorWarningLine, RiEyeLine,
  RiFileChartLine,
  RiFlashlightLine,
  RiLinkM,
  RiLoader4Line,
  RiLockPasswordFill,
  RiMapPinLine,
  RiMoneyDollarCircleLine,
  RiNotification3Line,
  RiSearchLine,
  RiServerFill,
  RiSettings3Line,
  RiUploadFill,
  RiUserLine
} from '@remixicon/react';
import { BarChart, Card, DonutChart } from '@tremor/react';
import {
  AutoComplete,
  Button,
  Checkbox,
  Col,
  ConfigProvider,
  InputNumber,
  Row,
  Select,
  theme
} from 'antd';
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from 'react';

// 1. DYNAMIC MAP IMPORT (Prevents Next.js Server Crashes)
const LeafletMap = dynamic<any>(
  () => import("@/components/ui/cpt-dotted-map").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[400px] bg-slate-900/50 flex items-center justify-center text-slate-500 rounded-xl">
        <span className="animate-pulse tracking-widest text-xs font-mono">SYNCING SUPABASE PIPELINE...</span>
      </div>
    ),
  }
);

export type CptMarker = {
  lat: number;
  lng: number;
  label: string;
  isDeal?: boolean;
  suburb?: string;
  variance?: number;
  deal_score?: number;
  deal_status?: string;
};

// Extracted the Login Form cleanly into its own component
const AgentLoginForm = ({ onLoginSuccess }: { onLoginSuccess: () => void }) => {
  const [formTab, setFormTab] = useState('login');
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="flex items-center justify-center w-full mt-12 font-sans">
      <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Log in to your account</h1>
          <p className="text-slate-500 text-sm">Welcome back! Please enter your details.</p>
        </div>

        <div className="flex p-1 mb-6 bg-slate-100 rounded-lg">
          <button
            onClick={() => setFormTab('signup')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${formTab === 'signup'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
              }`}
          >
            Sign up
          </button>
          <button
            onClick={() => setFormTab('login')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${formTab === 'login'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
              }`}
          >
            Log in
          </button>
        </div>

        <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); onLoginSuccess(); }}>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              placeholder="Enter your email"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-slate-900 placeholder-slate-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-slate-900 placeholder-slate-400 tracking-widest"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {showPassword ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  )}
                </svg>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center">
              <input
                id="remember"
                type="checkbox"
                className="w-4 h-4 text-amber-500 border-slate-300 rounded focus:ring-amber-500 cursor-pointer"
              />
              <label htmlFor="remember" className="ml-2 text-sm text-slate-600 cursor-pointer">
                Remember for 30 days
              </label>
            </div>
            <a href="#" className="text-sm font-semibold text-amber-600 hover:text-amber-500 transition-colors">
              Forgot password
            </a>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 text-sm font-semibold text-slate-900 bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
          >
            Sign in
          </button>

          <button
            type="button"
            className="w-full flex items-center justify-center py-2.5 px-4 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign in with Google
          </button>
        </form>

        <div className="mt-6 text-center">
        </div>
      </div>
    </div>
  );
};

export default function VoloraPlatform() {
  // 1. Navigation & UI State
  const [activeTab, setActiveTab] = useState<'overview' | 'valuation' | 'benchmarks' | 'Agentportal'>('overview');
  const [selectedSuburb, setSelectedSuburb] = useState<string | null>(null);
  const [backendStats, setBackendStats] = useState<any>(null);
  const [isFetchingStats, setIsFetchingStats] = useState(false);

  // 2. LIVE MAP DATA STATE
  const [activeDeals, setActiveDeals] = useState<CptMarker[]>([]);

  // 3. Real Estate Input States
  const [locations, setLocations] = useState<{ value: string }[]>([]);
  const [suburb, setSuburb] = useState('');
  const [bedrooms, setBedrooms] = useState(3);
  const [bathrooms, setBathrooms] = useState(2);
  const [erf_size, setErfSize] = useState(120);
  const [floor, setFloor] = useState(120);
  const [gar, setGar] = useState(2);
  const [lease_term, setLeaseTerm] = useState('Long-term');
  const [askingPrice, setAskingPrice] = useState<number | null>(null);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [propType, setPropType] = useState('House');
  const [lowerbound, setlowerbound] = useState<number>(0);
  const [upperbound, setupperbound] = useState<number>(0);

  const [isAgentLoggedIn, setIsAgentLoggedIn] = useState(false);

  // 4. Engine Memory
  const [isLoading, setIsLoading] = useState(false);
  const [predictionResult, setPredictionResult] = useState<any>(null);
  const [num_df, setNumDf] = useState<number>(0);
  const [arb_count, setArbCount] = useState<number>(0);
  const [avg_rent, setavg_rent] = useState<number>(0);
  const [sq_meter, setmeter] = useState<number>(0);

  // 5. Mapbox Native Refs (For Benchmarks Tab)
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  const amenityOptions = [
    { label: 'Pool', value: 'has_pool' },
    { label: 'Furnished', value: 'is_furnished' },
    { label: '(Fibre)Internet', value: 'has_internet' },
    { label: 'HouseShare', value: 'is_HouseShare' },
    { label: 'Back-up', value: 'has_backup' },
    { label: 'Ocean View', value: 'has_ocean_view' },
    { label: 'Mountain View', value: 'has_mountain_view' },
    { label: '24/hr Security', value: 'has_sercurity' },
    { label: ' Recently Renovated', value: 'mentions_renovated' },
    { label: 'Luxurious/Modern Touches', value: 'mentions_luxury' },
    { label: 'Garden', value: 'has_garden' },
    { label: 'Gated Community', value: 'is_gated' },
    { label: 'Study', value: 'has_study' },
    { label: 'Balcony', value: 'has_balcony' },
    { label: 'Patio', value: 'has_patio' }

  ];

  // 6. FETCH LIVE MAP DATA FROM FASTAPI
  useEffect(() => {
    fetch("http://localhost:8000/api/training-listings")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch map data");
        return res.json();
      })
      .then((data) => {
        if (data.statbar) {
          setNumDf(data.statbar[0]?.total_count || 0);
          setArbCount(data.statbar[1]?.arb_count || 0);
          setavg_rent(data.statbar[2]?.avg_rent || 0);
          setmeter(data.statbar[3]?.sq_meter || 0);
        }

        if (data.listings) {
          const formattedMarkers = data.listings.map((listing: any) => {
            const variance = Math.round(((listing.predicted_value - listing.price) / listing.predicted_value) * 100);

            let status = 'FAIR';
            if (variance >= 15) status = 'BARGAIN';
            else if (variance <= -15) status = 'OVERPRICED';

            const jitterLat = (Math.random() - 0.5) * 0.01;
            const jitterLng = (Math.random() - 0.5) * 0.01;

            const parsedLat = parseFloat(listing.lat);
            const parsedLng = parseFloat(listing.lng);

            const safeLat = !isNaN(parsedLat) ? parsedLat : -33.9249;
            const safeLng = !isNaN(parsedLng) ? parsedLng : 18.4241;

            return {
              lat: safeLat + jitterLat,
              lng: safeLng + jitterLng,
              suburb: listing.suburb || "UNKNOWN",
              variance: variance || 0,
              deal_score: listing.deal_score ?? 0,
              deal_status: status,
              isDeal: variance >= 0,
              label: `${listing.suburb || "UNKNOWN"} - ${status}`,
            };
          });

          setActiveDeals(formattedMarkers);
        }
      })
      .catch((error) => {
        console.error("Map Pipeline Error:", error);
      });
  }, []);

  // 7. MAPBOX PRELOAD
  useEffect(() => {
    if (!document.getElementById('mapbox-cdn-css')) {
      const link = document.createElement('link');
      link.id = 'mapbox-cdn-css';
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/mapbox-gl/3.2.0/mapbox-gl.css';
      document.head.appendChild(link);
    }
    if (!document.getElementById('mapbox-cdn-js')) {
      const script = document.createElement('script');
      script.id = 'mapbox-cdn-js';
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mapbox-gl/3.2.0/mapbox-gl.js';
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    fetch("http://localhost:8000/api/locations")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch locations");
        return res.json();
      })
      .then((data) => {
        const formatted = (data.locations || []).map((loc: string) => ({ value: loc }));
        setLocations(formatted);
      })
      .catch((error) => {
        console.error("Location fetch error:", error);
      });
  }, []);

  // 8. MAPBOX INITIALIZATION (Benchmarks Tab)
  useEffect(() => {
    if (activeTab === 'benchmarks' && mapContainerRef.current && !mapInstanceRef.current) {
      const initialize = () => {
        const mapboxgl = (window as any).mapboxgl;
        if (!mapboxgl) return;
        mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1IjoiZG91Z2gxIiwiYSI6ImNtcWU4Y3hjcTAxenoycHM2MnI3NTdqbjAifQ.eBh1uCE7yKod43GQoavW5g';

        mapInstanceRef.current = new mapboxgl.Map({
          container: mapContainerRef.current!,
          style: 'mapbox://styles/mapbox/dark-v11',
          center: [18.4232, -33.9249],
          zoom: 11
        });

        mapInstanceRef.current.on('load', () => {
          mapInstanceRef.current.resize();
          mapInstanceRef.current.addSource('suburbs', { type: 'geojson', data: '/cape-town-suburbs.json' });
          mapInstanceRef.current.addLayer({ id: 'suburbs-fill', type: 'fill', source: 'suburbs', paint: { 'fill-color': '#000000', 'fill-opacity': 0.1 } });
          mapInstanceRef.current.addLayer({ id: 'suburbs-highlight', type: 'fill', source: 'suburbs', paint: { 'fill-color': '#10b981', 'fill-opacity': 0.4 }, filter: ['==', 'OFC_SBRB_NAME', ''] });
          mapInstanceRef.current.addLayer({ id: 'suburbs-line', type: 'line', source: 'suburbs', paint: { 'line-color': '#334155', 'line-width': 1 } });

          mapInstanceRef.current.on('mousemove', 'suburbs-fill', (e: any) => {
            mapInstanceRef.current.getCanvas().style.cursor = 'pointer';
            if (e.features.length > 0) mapInstanceRef.current.setFilter('suburbs-highlight', ['==', 'OFC_SBRB_NAME', e.features[0].properties.OFC_SBRB_NAME]);
          });

          mapInstanceRef.current.on('mouseleave', 'suburbs-fill', () => {
            mapInstanceRef.current.getCanvas().style.cursor = '';
            mapInstanceRef.current.setFilter('suburbs-highlight', ['==', 'OFC_SBRB_NAME', '']);
          });

          mapInstanceRef.current.on('click', 'suburbs-fill', (e: any) => {
            if (e.features.length > 0) {
              const clickedSuburb = e.features[0].properties.OFC_SBRB_NAME;
              setSelectedSuburb(clickedSuburb);
            }
          });
        });
      };

      if ((window as any).mapboxgl) {
        initialize();
      } else {
        const script = document.getElementById('mapbox-cdn-js') as HTMLScriptElement;
        if (script) {
          script.addEventListener('load', initialize);
        }
      }
    }

    return () => {
      if (activeTab !== 'benchmarks' && mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [activeTab]);

  const handleCalculate = async () => {
    setIsLoading(true);
    try {
      const payload = {
        proptype: propType,
        location: suburb,
        beds: bedrooms,
        bath: bathrooms,
        erf_size: erf_size,
        floor: floor,
        gar: gar,
        lease_term: lease_term,
        has_pool: amenities.includes('has_pool'),
        is_furnished: amenities.includes('is_furnished'),
        has_internet: amenities.includes('has_internet'),
        has_sercurity: amenities.includes('has_sercurity'),
        has_study: amenities.includes('has_study'),
        has_backup: amenities.includes('has_backup'),
        is_HouseShare: amenities.includes('is_HouseShare'),
        has_ocean_view: amenities.includes('has_ocean_view'),
        has_mountain_view: amenities.includes('has_mountain_view'),
        is_gated: amenities.includes('is_gated'),
        mentions_renovated: amenities.includes('mentions_renovated'),
        mentions_luxury: amenities.includes('mentions_luxury'),
        has_garden: amenities.includes('has_garden'),
        has_balcony: amenities.includes('has_balcony'),
        has_patio: amenities.includes('has_patio'),
        asking_price: askingPrice || 0
      };

      const response = await fetch("http://localhost:8000/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        alert(`Server rejected the request. Status: ${response.status}`);
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      setPredictionResult(data);
    } catch (error) {
      console.error(error);
      alert("Bridge failed! Is your Python server running?");
    } finally {
      setIsLoading(false);
    }
  };

  const statsData = [
    {
      name: 'Volora Value',
      stat: predictionResult?.predicted_value ? `R ${predictionResult.predicted_value.toLocaleString('ZA')}` : 'N/A',
      range: predictionResult?.predicted_value ? `R ${predictionResult.lower_bound.toLocaleString('ZA')} - R ${predictionResult.upper_bound.toLocaleString('ZA')}` : 'N/A',
      status: predictionResult?.predicted_value ? 'within' : 'error',
    },
    {
      name: 'Asking Price',
      stat: askingPrice ? `R ${askingPrice.toLocaleString('ZA')}` : 'N/A',
    },
    {
      name: 'Monthly Variance',
      stat: predictionResult?.price_diff != null ? `R ${Math.abs(predictionResult.price_diff).toLocaleString('ZA')}` : 'N/A',
      range: predictionResult?.percent_diff != null ? `${predictionResult.percent_diff.toFixed(2)}%` : 'N/A',
      status: (predictionResult?.price_diff && predictionResult.price_diff > 0) ? 'within' : 'error',
    },
    {
      name: 'Annual Impact',
      stat: predictionResult?.price_diff != null ? `R ${Math.abs(predictionResult.price_diff * 12).toLocaleString('ZA')}` : 'N/A',
      range: predictionResult?.price_diff != null && predictionResult.price_diff > 0 ? "Value Gained" : "Revenue Risk",
      status: (predictionResult?.price_diff && predictionResult.price_diff > 0) ? 'within' : 'error',
    }
  ];

  const texts = [
    "Introducing ",
    "Valora",
  ];

  useEffect(() => {
    if (!selectedSuburb) {
      setBackendStats(null);
      return;
    }

    const fetchDeepStats = async () => {
      setIsFetchingStats(true);
      try {
        const response = await fetch(`http://localhost:8000/api/clickedsuburb?suburb=${encodeURIComponent(selectedSuburb)}`);
        if (!response.ok) throw new Error("FastAPI rejected the request");

        const data = await response.json();
        setBackendStats(data);
      } catch (error) {
        console.error("Engine Fetch Error:", error);
      } finally {
        setIsFetchingStats(false);
      }
    };

    fetchDeepStats();
  }, [selectedSuburb]);

  const sparklineData = [
    { title: 'Median Rent', subtitle: '450 Shares', value: `R${backendStats?.avgrent_one ?? ''}`, bars: [40, 60, 50, 100] },
    { title: 'Number of  Listings', subtitle: '112 Shares', value: backendStats?.one_bed ?? '', bars: [60, 70, 90, 80] },
    { title: ' Price Per m²', subtitle: '85 Shares', value: backendStats?.sqreent_one ?? '', bars: [40, 50, 100, 70] },
  ];

  const sparklineData2 = [
    { title: 'Median Rent', subtitle: '450 Shares', value: `R${backendStats?.avgrent_two ?? ''}`, bars: [40, 60, 50, 100] },
    { title: 'Number of  Listings', subtitle: '112 Shares', value: backendStats?.two_bed ?? '', bars: [60, 70, 90, 80] },
    { title: ' Price Per m²', subtitle: '85 Shares', value: backendStats?.sqreent_two ?? '', bars: [40, 50, 100, 70] },
  ];

  const sparklineData3 = [
    { title: 'Median Rent', subtitle: '450 Shares', value: `R${backendStats?.avgrent_three ?? ''}`, bars: [40, 60, 50, 100] },
    { title: 'Number of  Listings', subtitle: '112 Shares', value: backendStats?.three_bed ?? '', bars: [60, 70, 90, 80] },
    { title: ' Price Per m²', subtitle: '85 Shares', value: backendStats?.sqreent_three ?? '', bars: [40, 50, 100, 70] },
  ];

  return (
    <div className={`min-h-screen font-sans transition-colors duration-500 ${activeTab === 'Agentportal' ? 'bg-slate-50 text-slate-900' : 'bg-slate-950 text-slate-100'
      }`}>
      {/* GLOBAL NAVIGATION */}
      <div className="p-4 w-full sticky top-0 z-50">
        <div className="max-w-7xl mx-auto bg-slate-900/80 backdrop-blur-md text-white rounded-full px-6 py-3 flex items-center justify-between shadow-lg border border-slate-800">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-amber-500 flex items-center justify-center text-white font-black text-xs">V</div>
            <span className="font-bold text-lg tracking-tight">Valora</span>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <button onClick={() => setActiveTab('overview')} className={`text-sm font-medium transition-colors ${activeTab === 'overview' ? 'text-indigo-400 font-semibold' : 'text-slate-400 hover:text-white'}`}>Overview</button>
            <button onClick={() => setActiveTab('valuation')} className={`text-sm font-medium transition-colors ${activeTab === 'valuation' ? 'text-indigo-400 font-semibold' : 'text-slate-400 hover:text-white'}`}>Predictive Valuation</button>
            <button onClick={() => setActiveTab('benchmarks')} className={`text-sm font-medium transition-colors ${activeTab === 'benchmarks' ? 'text-indigo-400 font-semibold' : 'text-slate-400 hover:text-white'}`}>Suburb Benchmarks</button>
          </div>
          <div>
            <button
              onClick={() => setActiveTab('Agentportal')}
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-gray-900 transition-all duration-200 rounded-md bg-amber-500 shadow-sm hover:bg-amber-600 hover:shadow-md hover:-translate-y-px"
            >
              <svg
                className="w-4 h-4 mr-2 text-gray-900"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
              Agent Portal
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* VIEW 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="w-full flex flex-col items-center gap-6">
            <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="md:col-span-2 md:row-span-2 bg-slate-900/40 backdrop-blur-md border border-slate-800/60 flex flex-col justify-end p-10 shadow-2xl">
                <h1 className="text-5xl font-black tracking-tight mb-4 text-white">
                  Cape Town Property<br />Arbitrage, Quantified.
                </h1>
                <p className="text-slate-400 text-lg mb-8 max-w-lg">
                  Stop guessing. Our engine processes market data to identify underpriced deals before they hit the market.
                </p>
                <button onClick={() => setActiveTab('valuation')} className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 px-6 rounded-xl w-fit flex items-center gap-2 transition-all">
                  Launch Engine <RiArrowRightLine className="size-5" />
                </button>
              </Card>

              <Card className="bg-slate-900/40 backdrop-blur-md border border-slate-800/60">
                <p className="text-slate-400 text-sm">Deals Analyzed</p>
                <p className="text-3xl font-bold mt-2 text-slate-100">{num_df}</p>
              </Card>

              <Card className="bg-slate-900/40 backdrop-blur-md border border-slate-800/60">
                <p className="text-slate-400 text-sm">Current Cape Town R/m²</p>
                <p className="text-3xl font-bold mt-2 text-slate-100">R{sq_meter}</p>
              </Card>

              <Card className="md:col-span-3 bg-slate-900/40 backdrop-blur-md border border-slate-800/60 p-0 overflow-hidden">
                <div className="p-8">
                  <h2 className="text-2xl font-bold text-slate-100 mb-6">Live Arbitrage Heatmap</h2>
                  <div className="w-full h-[500px]">
                    <LeafletMap markers={activeDeals} />
                  </div>
                </div>
              </Card>
            </div>

            {/* PART B: LIVE STATS TERMINAL BAR */}
            <div className="w-full max-w-6xl bg-slate-900/40 backdrop-blur-md border border-slate-800/60 rounded-xl grid grid-cols-2 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x divide-slate-800/60 shadow-2xl overflow-hidden mt-4">
              <div className="flex flex-col justify-center px-6 py-4">
                <span className="text-[10px] font-bold text-slate-500 tracking-wider mb-1">SYSTEM STATUS</span>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-sm font-bold text-slate-100 uppercase tracking-widest">Live</span>
                </div>
              </div>

              <div className="flex flex-col justify-center px-6 py-4">
                <span className="text-[10px] font-bold text-slate-500 tracking-wider mb-1">ACTIVE LISTINGS ANALYSED</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold text-slate-100">{num_df}</span>
                </div>
              </div>

              <div className="flex flex-col justify-center px-6 py-4">
                <span className="text-[9px] font-bold text-slate-500 tracking-wider mb-1">WC AVG RENT</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold text-slate-100">R{avg_rent}/monthly</span>
                  <span className="text-xs font-medium text-emerald-400">+5.6%</span>
                </div>
              </div>

              <div className="flex flex-col justify-center px-6 py-4">
                <span className="text-[10px] font-bold text-slate-500 tracking-wider mb-1">TOP YIELD (CBD)</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold text-slate-100">9.9%</span>
                  <span className="text-xs font-medium text-emerald-400">+0.4%</span>
                </div>
              </div>

              <div className="flex flex-col justify-center px-6 py-4">
                <span className="text-[10px] font-bold text-slate-500 tracking-wider mb-1">ARBITRAGE DEALS</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold text-amber-400">{arb_count}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Detected</span>
                </div>
              </div>
            </div>

            <div className="relative isolate overflow-hidden bg-transparent px-6 py-24 sm:py-32 lg:overflow-visible lg:px-0">
              {/* The Clean Background Grid */}
              <div className="absolute inset-0 -z-10 overflow-hidden">
                <svg
                  aria-hidden="true"
                  className="absolute top-0 left-[max(50%,25rem)] h-256 w-512 -translate-x-1/2 mask-[radial-gradient(64rem_64rem_at_top,white,transparent)] stroke-slate-800/50"
                >
                  <defs>
                    <pattern
                      x="50%"
                      y={-1}
                      id="e813992c-7d03-4cc4-a2bd-151760b470a0"
                      width={200}
                      height={200}
                      patternUnits="userSpaceOnUse"
                    >
                      <path d="M100 200V.5M.5 .5H200" fill="none" />
                    </pattern>
                  </defs>
                  <rect fill="url(#e813992c-7d03-4cc4-a2bd-151760b470a0)" width="100%" height="100%" strokeWidth={0} />
                </svg>
              </div>

              <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 lg:mx-0 lg:max-w-none lg:grid-cols-2 lg:items-start lg:gap-y-10">
                <div className="lg:col-span-2 lg:col-start-1 lg:row-start-1 lg:mx-auto lg:grid lg:w-full lg:max-w-7xl lg:grid-cols-2 lg:gap-x-8 lg:px-8">
                  <div className="lg:pr-4">
                    <div className="lg:max-w-lg">
                      <p className="text-base/7 font-semibold text-indigo-400">Deploy faster</p>
                      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-pretty text-white sm:text-2xl">
                        <MorphingText texts={texts} />
                      </h1>
                      <p className="mt-6 text-xl/8 text-gray-300">
                        We replace traditional, backward-looking market analysis with a live predictive engine.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="-mt-12 -ml-12 p-12 lg:sticky lg:top-4 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:overflow-hidden relative">
                  {/* The Live Feed Container */}
                  <div className="relative w-full max-w-lg mx-auto sm:w-[32rem] h-[34rem] mt-8 lg:mt-0">

                    {/* Card 3: The Background Card (Fairly Priced) */}
                    <div className="absolute top-24 left-12 right-[-3rem] bg-slate-900/40 backdrop-blur-sm border border-slate-800/50 rounded-2xl p-6 shadow-2xl transform scale-90 opacity-40 transition-all duration-500 hover:scale-95 hover:opacity-60 cursor-default">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-slate-500"></div>
                          <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Rondebosch • 1 Bed</span>
                        </div>
                        <span className="bg-slate-800 text-slate-400 text-[10px] px-2 py-1 rounded font-bold">FAIR</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-slate-500">Asking Price</p>
                          <p className="text-lg font-bold text-slate-300">R 12,500</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Volora Value</p>
                          <p className="text-lg font-bold text-slate-300">R 12,200</p>
                        </div>
                      </div>
                    </div>

                    {/* Card 2: The Middle Card (Overpriced) */}
                    <div className="absolute top-12 left-6 right-[-1.5rem] bg-slate-900/60 backdrop-blur-md border border-rose-900/30 rounded-2xl p-6 shadow-2xl transform scale-95 opacity-80 transition-all duration-500 hover:scale-100 hover:opacity-100 cursor-default z-0">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                          <span className="text-xs font-semibold text-slate-300 tracking-wider uppercase">Vredehoek • 3 Bed House</span>
                        </div>
                        <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] px-2 py-1 rounded font-bold">STEEP (+18%)</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-slate-500">Asking Price</p>
                          <p className="text-xl font-bold text-white">R 45,000</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Volora Value</p>
                          <p className="text-xl font-bold text-rose-400">R 38,100</p>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-slate-800/50">
                        <p className="text-xs text-slate-400"><span className="text-rose-400 font-semibold">Revenue Risk:</span> Property is priced R 82,800/yr over market average.</p>
                      </div>
                    </div>

                    {/* Card 1: The Foreground Card (Massive Bargain) */}
                    <div className="absolute top-0 left-0 right-0 bg-slate-900/80 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-6 shadow-[0_20px_50px_-12px_rgba(16,185,129,0.15)] transform scale-100 transition-all duration-500 hover:scale-[1.02] hover:-translate-y-2 cursor-pointer z-10 group">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                          </span>
                          <span className="text-xs font-bold text-white tracking-wider uppercase">Sea Point • 2 Bed Apt</span>
                        </div>
                        <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] px-3 py-1 rounded font-black tracking-widest animate-pulse">ARBITRAGE</span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 bg-slate-950/50 rounded-xl p-4 border border-slate-800/50">
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Listed Asking Price</p>
                          <p className="text-2xl font-bold text-slate-300">R 18,000</p>
                        </div>
                        <div className="relative">
                          {/* Tiny glowing background behind the good number */}
                          <div className="absolute inset-0 bg-emerald-500/10 blur-xl rounded-full transition-opacity group-hover:bg-emerald-500/20"></div>
                          <p className="text-[10px] text-emerald-400/80 uppercase tracking-wider mb-1 relative">Volora Baseline</p>
                          <p className="text-2xl font-bold text-emerald-400 relative">R 24,500</p>
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-3 gap-3">
                        <div className="bg-slate-800/40 rounded-lg p-3 text-center border border-slate-700/50 shadow-inner">
                          <p className="text-[9px] text-slate-500 uppercase font-semibold mb-1">Deal Score</p>
                          <p className="text-sm font-bold text-emerald-400">92/100</p>
                        </div>
                        <div className="bg-slate-800/40 rounded-lg p-3 text-center border border-slate-700/50 shadow-inner">
                          <p className="text-[9px] text-slate-500 uppercase font-semibold mb-1">Variance</p>
                          <p className="text-sm font-bold text-emerald-400">- 26.5%</p>
                        </div>
                        <div className="bg-slate-800/40 rounded-lg p-3 text-center border border-slate-700/50 shadow-inner">
                          <p className="text-[9px] text-slate-500 uppercase font-semibold mb-1">Est. Yield</p>
                          <p className="text-sm font-bold text-emerald-400">11.2%</p>
                        </div>
                      </div>

                      <div className="mt-5 pt-4 border-t border-slate-800/50 flex items-center justify-between">
                        <p className="text-[10px] text-slate-400 font-medium tracking-wide">Scraped 14 mins ago via pipeline</p>
                        <div className="text-xs text-emerald-400 font-bold group-hover:text-emerald-300 transition-colors flex items-center gap-1">
                          View Listing <span>&rarr;</span>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
                <div className="lg:col-span-2 lg:col-start-1 lg:row-start-2 lg:mx-auto lg:grid lg:w-full lg:max-w-7xl lg:grid-cols-2 lg:gap-x-8 lg:px-8">
                  <div className="lg:pr-4">
                    <div className="max-w-xl text-base/7 text-gray-400 lg:max-w-lg">
                      <p>
                        The Cape Town rental market moves incredibly fast, and a lack of transparency costs everyone money. Whether you are a landlord trying to avoid an empty month, an agent justifying a mandate, or a tenant trying not to overpay, relying on gut feeling or outdated averages is a risk. Volora levels the playing field with objective data.
                        By analyzing thousands of active local listings every single day, Volora equips you with the exact, unbiased data needed to value a property accurately, negotiate fairly, and move with confidence.
                      </p>
                      <ul role="list" className="mt-8 space-y-8 text-gray-400">
                        <li className="flex gap-x-3">
                          <RiUploadFill aria-hidden="true" className="mt-1 size-5 flex-none text-indigo-400" />
                          <span>
                            <strong className="font-semibold text-white">Instant, Objective Valuations.</strong>  Generate comprehensive rental estimates in seconds. Our engine cross-references property features against live market data, providing a precise valuation and a realistic pricing bracket so you know exactly what a property is actually worth today.
                          </span>
                        </li>
                        <li className="flex gap-x-3">
                          <RiLockPasswordFill aria-hidden="true" className="mt-1 size-5 flex-none text-indigo-400" />
                          <span>
                            <strong className="font-semibold text-white">Live Market Intelligence.</strong> Stay ahead of shifting neighborhood trends. Volora actively tracks suburb yields, pricing distributions, and amenity premiums across the city, ensuring your decisions are based on current market realities rather than last quarter's averages.
                          </span>
                        </li>
                        <li className="flex gap-x-3">
                          <RiServerFill aria-hidden="true" className="mt-1 size-5 flex-none text-indigo-400" />
                          <span>
                            <strong className="font-semibold text-white">Spot Deals.</strong> Whether you are hunting for an underpriced rental or proving a property's premium worth to a prospective client, the Volora Deal Score flags market anomalies instantly. See exactly how any listing compares to its neighborhood baseline.
                          </span>
                        </li>
                      </ul>
                      <h2 className="mt-16 text-2xl font-bold tracking-tight text-white">The new standard for Cape Town real estate.</h2>
                      <p className="mt-6">
                        The property market rewards those with the best data. Whether you are an agent pricing a luxury apartment in Sea Point, an investor calculating gross yield, or a renter looking for a fairly priced home, our platform gives you the structural intelligence you need. Step away from manual spreadsheets and endless scrolling, and start making decisions backed by the daily truth of the market.
                        <button onClick={() => setActiveTab('valuation')} className="mt-4 bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 px-6 rounded-xl w-fit flex items-center gap-2 transition-all">
                          Launch Engine <RiArrowRightLine className="size-2.5" />
                        </button>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: PREDICTIVE VALUATION ENGINE */}
        {activeTab === 'valuation' && (
          <div className="space-y-6">
            <div>
              <KineticText text="Valora Rental Engine" highlightFirst={true} className="text-2xl md:text-8xl tracking-tighter text-amber" />
              <p className="text-slate-400 mt-1">Input baseline real estate specifications to cross-reference with model parameters.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              <div className="lg:col-span-2 bg-slate-900/40 backdrop-blur-md border border-slate-800/60 rounded-xl p-8 shadow-md">
                <ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
                  <div className="flex items-center justify-between border-b border-slate-700/50 pb-4 mb-4">
                    <div>
                      <h3 className="font-medium text-white">Target location</h3>
                      <p className="text-xs text-slate-400">Select Location</p>
                    </div>
                    <AutoComplete className="w-64" options={locations} value={suburb} onChange={setSuburb} placeholder="Type a location..." filterOption={(inputValue, option) => option!.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1} />
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-700/50 pb-4 mb-4">
                    <h3 className="text-lg font-medium text-white">Bedrooms</h3>
                    <InputNumber min={0.5} max={12} value={bedrooms} onChange={(v) => setBedrooms(v || 0.5)} className="w-32" />
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-700/50 pb-4 mb-4">
                    <h3 className="text-lg font-medium text-white">Bathrooms</h3>
                    <InputNumber min={0.5} max={10} value={bathrooms} onChange={(v) => setBathrooms(v || 0.5)} className="w-32" />
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-700/50 pb-4 mb-4">
                    <h3 className="text-lg font-medium text-white">Erf Size (m²)</h3>
                    <InputNumber min={floor} max={18000} value={erf_size} onChange={(v) => setErfSize(v || 12)} className="w-32" />
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-700/50 pb-4 mb-4">
                    <h3 className="text-lg font-medium text-white">Floor Size (m²)</h3>
                    <InputNumber min={12} max={18000} value={floor} onChange={(v) => setFloor(v || 12)} className="w-32" />
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-700/50 pb-4 mb-4">
                    <h3 className="text-lg font-medium text-white">Garages</h3>
                    <InputNumber min={0} max={14} value={gar} onChange={(v) => setGar(v || 0)} className="w-32" />
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-700/50 pb-4 mb-4">
                    <h3 className="font-medium text-white">Property Type</h3>
                    <Select showSearch value={propType} onChange={setPropType} className="w-64" options={[{ value: 'house', label: 'House' }, { value: 'Apartment', label: 'Apartment' }, { value: 'townhouse', label: 'Townhouse' }]} />
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-700/50 pb-4 mb-4">
                    <h3 className="font-medium text-white">Lease Term</h3>
                    <Select showSearch value={lease_term} onChange={setLeaseTerm} className="w-64" options={[{ value: 'Short Term', label: 'Short Term' }, { value: 'Long Term', label: 'Long Term' }]} />
                  </div>

                  <div className="flex items-start justify-between border-b border-slate-700/50 pb-4 mb-4 mt-4">
                    <div className="mt-1">
                      <h3 className="font-medium text-white">Amenities</h3>
                      <p className="text-xs text-slate-400">Select all included features</p>
                    </div>
                    <div className="w-2/3">
                      <Checkbox.Group style={{ width: '100%' }} value={amenities} onChange={(v) => setAmenities(v as string[])}>
                        <Row>
                          {amenityOptions.map((option) => (
                            <Col span={8} key={option.value} className="mb-3">
                              <Checkbox value={option.value}><span className="text-slate-300 text-sm">{option.label}</span></Checkbox>
                            </Col>
                          ))}
                        </Row>
                      </Checkbox.Group>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-700/50 pb-4 mb-4 mt-4">
                    <div className="mt-1">
                      <h3 className="font-medium text-white">Listed Rental Rate</h3>
                      <p className="text-xs text-slate-400">Per month</p>
                    </div>
                    <div className="w-2/3">
                      <InputNumber<number> min={3500} max={100000} step={500} value={askingPrice} onChange={(v) => setAskingPrice(v || 3500)} formatter={(v) => `R ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={(v) => v ? Number(v.replace(/R\s?|(,*)/g, '')) : 0} className="w-full" />
                    </div>
                  </div>

                  <div className="mt-8">
                    <Button type="primary" size="large" loading={isLoading} onClick={handleCalculate} className="w-full bg-indigo-600 hover:bg-indigo-500 border-none h-12 text-md font-semibold">
                      Run Predictive Valuation
                    </Button>
                  </div>
                </ConfigProvider>
              </div>

              <div className="lg:col-span-1">
                {predictionResult ? (
                  <div className="sticky top-28 flex flex-col gap-6">
                    <dl className="grid grid-cols-2 gap-4">
                      {statsData.map((item) => (
                        <Card key={item.name} className="flex flex-col justify-center h-full bg-slate-900/40 backdrop-blur-md border-slate-800/60 p-4">
                          <dt className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">{item.name}</dt>
                          <dd className="text-lg font-bold text-white mb-2">{item.stat}</dd>
                          {item.status && (
                            <dd className={cx(
                              item.status === 'within'
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                : item.status === 'observe'
                                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                  : 'bg-rose-500/20 text-rose-400 border-rose-500/30',
                              'inline-flex items-center gap-x-1.5 rounded border px-2 py-1 text-[10px] font-bold tracking-wider'
                            )}>
                              {item.status === 'within' ? <RiCheckLine className="size-1" /> : item.status === 'observe' ? <RiEyeLine className="size-3" /> : <RiErrorWarningLine className="size-3" />}
                              {item.range}
                            </dd>
                          )}
                        </Card>
                      ))}
                    </dl>

                    <Card className="bg-slate-900/40 backdrop-blur-md border border-slate-800/60 rounded-xl p-6 shadow-md mt-6">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-100 uppercase tracking-wider">Volora Deal Score</h3>
                        <p className="mt-1 text-xs text-slate-400">Aggregated deal rating based on financial arbitrage, safety score and civic score.</p>
                      </div>
                      <div className="mt-6 flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-300">Deal Score</p>
                        <div className="flex items-center gap-4">
                          <p className="text-2xl font-bold text-white">{predictionResult.deal_score ?? '0'} <span className="text-sm font-normal text-slate-500">/100</span></p>
                          <div className="relative flex items-center justify-center w-12 h-12">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                              <circle cx="18" cy="18" r="15.9155" fill="none" className="stroke-slate-700/50" strokeWidth="3" />
                              <circle cx="18" cy="18" r="15.9155" fill="none" className={(predictionResult.deal_score ?? 0) >= 75 ? 'stroke-emerald-500' : (predictionResult.deal_score ?? 0) > 35 ? 'stroke-amber-500' : 'stroke-rose-500'} strokeWidth="3" strokeDasharray="100, 100" strokeDashoffset={100 - (predictionResult.deal_score ?? 0)} strokeLinecap="round" />
                            </svg>
                            <div className="absolute flex items-center justify-center text-[10px] font-bold text-slate-300">{predictionResult.deal_score ?? '0'}</div>
                          </div>
                        </div>
                      </div>
                    </Card>

                    <Card className="bg-slate-900/40 backdrop-blur-md border border-slate-800/60 rounded-xl p-6 shadow-md mt-6 overflow-hidden relative">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-100 uppercase tracking-wider">Market Pulse</h3>
                        <p className="mt-1 text-xs text-slate-400">Current deal distribution in {suburb || 'this area'}.</p>
                      </div>
                      <div className="mt-6 relative">
                        <div className="flex w-full h-2.5 rounded-full overflow-hidden bg-slate-700/50">
                          <div style={{ width: `${predictionResult.market_pulse?.[0] ?? 15}%` }} className="bg-emerald-500 transition-all" />
                          <div style={{ width: `${predictionResult.market_pulse?.[1] ?? 55}%` }} className="bg-amber-500 transition-all" />
                          <div style={{ width: `${predictionResult.market_pulse?.[2] ?? 30}%` }} className="bg-rose-500 transition-all" />
                        </div>
                        <div className="absolute top-1/2 -translate-y-1/2 w-1.5 h-6 bg-white rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)] border-2 border-slate-800 transition-all z-10" style={{ left: `calc(${predictionResult ? Math.max(0, Math.min(100, 100 - (predictionResult.deal_score ?? 50))) : 50}% - 3px)` }} />
                      </div>
                      <div className="mt-6 flex justify-between items-center border-t border-slate-700/50 pt-4">
                        <span className="flex items-center gap-1.5 text-[10px] text-slate-400"><span className="h-2 w-2 rounded-full bg-emerald-500" />{predictionResult.market_pulse?.[0] ?? 15}% BARGAINS</span>
                        <span className="flex items-center gap-1.5 text-[10px] text-slate-400"><span className="h-2 w-2 rounded-full bg-amber-500" />{predictionResult.market_pulse?.[1] ?? 55}% GOOD-FAIR</span>
                        <span className="flex items-center gap-1.5 text-[10px] text-slate-400"><span className="h-2 w-2 rounded-full bg-rose-500" />{predictionResult.market_pulse?.[2] ?? 30}% STEEP</span>
                      </div>
                    </Card>
                  </div>
                ) : (
                  <div className="sticky top-28 h-64 border-2 border-dashed border-slate-700/50 rounded-xl flex flex-col items-center justify-center text-slate-500 bg-slate-900/20 p-8 text-center">
                    <p className="text-sm">Run valuation to see results.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: SUBURB BENCHMARKS MAP */}
        {activeTab === 'benchmarks' && (
          <div className="flex flex-col space-y-6 h-full">
            <div>
              <KineticText text="Valora Benchmarks" highlightFirst={true} className="text-2xl md:text-8xl tracking-tighter text-amber" />
              <p className="text-slate-400">Live structural data tracked by your daily scraper pipeline.</p>
            </div>

            <div ref={mapContainerRef} className="w-full h-[500px] rounded-xl overflow-hidden border border-slate-700 shadow-xl relative" />

            {selectedSuburb && (
              <div className="w-full mt-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
                <div className="text-center mb-8 relative">
                  <h3 className="text-3xl font-bold text-white tracking-tight">Market Analysis: {selectedSuburb}</h3>
                  <p className="text-slate-400 mt-2">Live structural data and active arbitrage opportunities.</p>
                  <button onClick={() => setSelectedSuburb(null)} className="absolute right-0 top-0 text-[10px] font-bold tracking-widest text-slate-500 hover:text-slate-300 transition-colors bg-slate-900/50 px-4 py-2 rounded-full border border-slate-800 shadow-sm">
                    CLOSE
                  </button>
                </div>

                {isFetchingStats ? (
                  <div className="w-full flex flex-col items-center justify-center py-16 bg-slate-900/20 backdrop-blur-sm border border-slate-800/50 rounded-2xl shadow-inner">
                    <span className="animate-pulse tracking-widest text-xs font-mono text-emerald-400">ANALYZING SUBURB DATA...</span>
                  </div>
                ) : backendStats && backendStats.sub_count > 0 ? (
                  <div className="w-full bg-slate-900/30 backdrop-blur-md rounded-2xl border border-slate-800/60 overflow-hidden shadow-2xl">
                    <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-800/60">
                      <div className="p-8 text-center flex flex-col items-center justify-center hover:bg-slate-800/20 transition-colors">
                        <p className="text-4xl font-bold text-white mb-2">{backendStats.sub_count}</p>
                        <p className="text-sm text-slate-400 font-medium">Active DB Listings</p>
                      </div>
                      <div className="p-8 text-center flex flex-col items-center justify-center hover:bg-slate-800/20 transition-colors">
                        <p className="text-4xl font-bold text-white mb-2">R{backendStats.sub_rent?.toLocaleString('en-ZA')}</p>
                        <p className="text-sm text-slate-400 font-medium">Avg Market Rent</p>
                      </div>
                      <div className="p-8 text-center flex flex-col items-center justify-center hover:bg-slate-800/20 transition-colors">
                        <p className="text-4xl font-bold text-white mb-2">{backendStats.sub_arb}</p>
                        <p className="text-sm text-slate-400 font-medium">Arbitrage Deals</p>
                      </div>
                      <div className="p-8 text-center flex flex-col items-center justify-center hover:bg-slate-800/20 transition-colors">
                        <p className="text-4xl font-bold text-amber-400 mb-2">{backendStats.sub_score}</p>
                        <p className="text-sm text-slate-400 font-medium">Avg Deal Score</p>
                      </div>
                    </div>

                    <div className="w-full p-4">
                      <Tabs defaultValue="tab1">
                        <TabsList className="grid w-full grid-cols-3 bg-slate-800/50 p-1 rounded-lg">
                          <TabsTrigger value="tab1">1 Bedroom</TabsTrigger>
                          <TabsTrigger value="tab2">2 Bedroom</TabsTrigger>
                          <TabsTrigger value="tab3">3 Bedroom</TabsTrigger>
                        </TabsList>

                        <div className="mt-4 p-6 bg-slate-900/30 rounded-xl border border-slate-800/50">
                          <TabsContent value="tab1">
                            <div className="flex flex-col gap-3">
                              {sparklineData.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 bg-slate-800/40 hover:bg-slate-800/60 transition-colors rounded-xl border border-slate-700/50 shadow-sm">
                                  <div className="w-1/3">
                                    <h4 className="font-semibold text-slate-100">{item.title}</h4>
                                    <p className="text-sm text-slate-400 mt-0.5">{item.subtitle}</p>
                                  </div>
                                  <div className="w-1/3 flex justify-center">
                                    <div className="flex items-end gap-1.5 h-8">
                                      {item.bars.map((height, i) => (
                                        <div key={i} className="w-2.5 bg-slate-500 rounded-sm hover:bg-slate-400 transition-colors" style={{ height: `${height}%` }} />
                                      ))}
                                    </div>
                                  </div>
                                  <div className="w-1/3 text-right font-bold text-slate-100">{item.value}</div>
                                </div>
                              ))}
                            </div>
                          </TabsContent>

                          <TabsContent value="tab2">
                            <div className="flex flex-col gap-3">
                              {sparklineData2.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 bg-slate-800/40 hover:bg-slate-800/60 transition-colors rounded-xl border border-slate-700/50 shadow-sm">
                                  <div className="w-1/3">
                                    <h4 className="font-semibold text-slate-100">{item.title}</h4>
                                    <p className="text-sm text-slate-400 mt-0.5">{item.subtitle}</p>
                                  </div>
                                  <div className="w-1/3 flex justify-center">
                                    <div className="flex items-end gap-1.5 h-8">
                                      {item.bars.map((height, i) => (
                                        <div key={i} className="w-2.5 bg-slate-500 rounded-sm hover:bg-slate-400 transition-colors" style={{ height: `${height}%` }} />
                                      ))}
                                    </div>
                                  </div>
                                  <div className="w-1/3 text-right font-bold text-slate-100">{item.value}</div>
                                </div>
                              ))}
                            </div>
                          </TabsContent>

                          <TabsContent value="tab3">
                            <div className="flex flex-col gap-3">
                              {sparklineData3.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 bg-slate-800/40 hover:bg-slate-800/60 transition-colors rounded-xl border border-slate-700/50 shadow-sm">
                                  <div className="w-1/3">
                                    <h4 className="font-semibold text-slate-100">{item.title}</h4>
                                    <p className="text-sm text-slate-400 mt-0.5">{item.subtitle}</p>
                                  </div>
                                  <div className="w-1/3 flex justify-center">
                                    <div className="flex items-end gap-1.5 h-8">
                                      {item.bars.map((height, i) => (
                                        <div key={i} className="w-2.5 bg-slate-500 rounded-sm hover:bg-slate-400 transition-colors" style={{ height: `${height}%` }} />
                                      ))}
                                    </div>
                                  </div>
                                  <div className="w-1/3 text-right font-bold text-slate-100">{item.value}</div>
                                </div>
                              ))}
                            </div>
                          </TabsContent>
                        </div>
                      </Tabs>
                    </div>
                  </div>
                ) : (
                  <div className="w-full flex flex-col items-center justify-center py-16 bg-slate-900/20 backdrop-blur-sm border border-slate-800/50 rounded-2xl shadow-inner">
                    <div className="p-4 bg-slate-800/50 rounded-full mb-4 border border-slate-700/50">
                      <RiErrorWarningLine className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-slate-200 font-bold text-lg tracking-tight">No Market Data</p>
                    <p className="text-sm text-slate-500 mt-1 max-w-sm text-center">We haven't detected any active structural comps or arbitrage listings in {selectedSuburb} today.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* VIEW 4: AGENT PORTAL */}
        {activeTab === 'Agentportal' && (
          <div className="flex flex-col space-y-6 h-full">

            {/* Conditional Rendering: Show Dashboard if logged in, otherwise show Login Form */}
            {isAgentLoggedIn ? (
              <AgentDashboard onLogout={() => setIsAgentLoggedIn(false)} />
            ) : (
              <>
                <div className="text-center md:text-left">
                  <KineticText text="Agent Portal" highlightFirst={true} className="text-2xl md:text-8xl tracking-tighter text-amber" />
                  <p className="text-slate-500">.</p>
                </div>
                <AgentLoginForm onLoginSuccess={() => setIsAgentLoggedIn(true)} />
              </>
            )}

          </div>
        )}

      </main>
    </div>
  );
}
const AgentDashboard = ({ onLogout }: { onLogout: () => void }) => {

  useEffect(() => {
    fetch("http://localhost:8000/api/locations")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch locations");
        return res.json();
      })
      .then((data) => {
        const formatted = (data.locations || []).map((loc: string) => ({ value: loc }));
        setLocations(formatted);
      })
      .catch((error) => {
        console.error("Location fetch error:", error);
      });
  }, []);

  const [activeMenu, setActiveMenu] = useState('Analytics');
  const [locationLookup, setLocationLookup] = useState('');
  const [agent_suburb, setagent_Suburb] = useState('');

  const [propUrl, setPropUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    type: string;
    asking_price: number;
    volora_value: number;
    score: number;
  } | null>(null);

  // We keep the initial mock data, but this will now dynamically grow when a URL is analyzed
  const [savedBook, setSavedBook] = useState([
    { id: 1, address: "14 Victoria Rd, Bantry Bay", type: "Villa", asking: 45000, volora: 52000, score: 88, status: "Negotiating" },
    { id: 2, address: "201 The Sentinel, CBD", type: "2 Bed Apt", asking: 18000, volora: 16500, score: 42, status: "Monitoring" },
    { id: 3, address: "12 Kloof St, Gardens", type: "Retail", asking: 35000, volora: 41000, score: 79, status: "Offer Placed" },
  ]);

  // --- Mock Data for Tremor Charts ---
  const revenueData = [
    { date: 'Mon', 'Volora Value': 2890, 'Asking Price': 2338 },
    { date: 'Tue', 'Volora Value': 2756, 'Asking Price': 2103 },
    { date: 'Wed', 'Volora Value': 3322, 'Asking Price': 2194 },
    { date: 'Thu', 'Volora Value': 3470, 'Asking Price': 2108 },
    { date: 'Fri', 'Volora Value': 3475, 'Asking Price': 1812 },
    { date: 'Sat', 'Volora Value': 3129, 'Asking Price': 1726 },
    { date: 'Sun', 'Volora Value': 3490, 'Asking Price': 1982 },
  ];

  const locationData = [
    { Location: 'Sea Point', 'Active Deals': 45 },
    { Location: 'CBD', 'Active Deals': 32 },
    { Location: 'Camps Bay', 'Active Deals': 28 },
    { Location: 'Vredehoek', 'Active Deals': 19 },
    { Location: 'Rondebosch', 'Active Deals': 14 },
  ];

  const portfolioBreakup = [
    { name: 'Bargain (Arbitrage)', value: 45 },
    { name: 'Fairly Priced', value: 35 },
    { name: 'Overpriced (Risk)', value: 20 },
  ];

  const recentTransactions = [
    { id: 1, type: 'New Mandate', location: 'Sea Point, 2 Bed', amount: '+ R 18,500', isPositive: true },
    { id: 2, type: 'Price Adjustment', location: 'CBD, Studio', amount: '- R 1,200', isPositive: false },
    { id: 3, type: 'Lease Signed', location: 'Vredehoek, 3 Bed', amount: '+ R 24,000', isPositive: true },
    { id: 4, type: 'Valuation Run', location: 'Camps Bay, Villa', amount: 'R 85,000', isPositive: true },
  ];

  const [locations, setLocations] = useState<{ value: string }[]>([]);


  const handleAnalyzeUrl = async () => {
    if (!propUrl.includes('property24.com')) {
      alert("Please enter a valid Property24 URL.");
      return;
    }

    if (!agent_suburb) {
      alert("Please select a suburb from the dropdown first.");
      return;
    }

    // Safely handle locations since your useEffect only fetches the 'value'
    const locationMatches = locations.filter((loc) => loc.value === agent_suburb);
    if (locationMatches.length === 0) {
      alert("Location details not found in the database.");
      return;
    }

    const computedMacro = (locationMatches[0] as any).macro_suburb || "";
    const computedRegion = (locationMatches[0] as any).region || "";

    setIsAnalyzing(true);

    try {
      // 1. Send URL to R (Plumber)
      // FIX: Changed localhost to 127.0.0.1. Next.js/Node often resolves localhost to IPv6 (::1), 
      // but your Plumber server is bound to IPv4 (127.0.0.1) as seen in your terminal screenshot.
      const rResponse = await fetch('http://127.0.0.1:8080/clean-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: propUrl,
          suburb: agent_suburb,
          macro_suburb: computedMacro,
          region: computedRegion
        }),
      });

      if (!rResponse.ok) {
        const errDetails = await rResponse.text();
        throw new Error(`R Pipeline failed: ${errDetails}`);
      }

      const cleanDataArray = await rResponse.json();
      const propertyData = cleanDataArray[0];

      if (!propertyData) throw new Error("R Pipeline returned empty data");

      // 2. Send to Python - We MUST add "|| 0" fallbacks. 
      // If R returns 'null' for a missing amenity, it will crash Python's strict validation.
      const pythonPayload = {
        suburb: agent_suburb,
        macro_suburb: computedMacro,
        region: computedRegion,
        asking_price: propertyData.price || 0,
        beds: propertyData.beds || 0,
        bath: propertyData.bath || 0,
        gar: propertyData.gar || 0,
        property_type: propertyData.type || "House",
        is_furnished: propertyData.is_furnished || 0,
        has_pool: propertyData.has_pool || 0,
        has_backup: propertyData.has_backup || 0,
        erf_size: propertyData.erf_size || 0,  // FIXED
        floor_size: propertyData.floor || 0,   // FIXED
        floor: propertyData.floor || 0,
        has_garden: propertyData.has_garden || 0,
        lease_term: propertyData.lease || 'Long Term',
        has_sercurity: propertyData.has_sercurity || 0,
        has_mountain_view: propertyData.has_mountain_view || 0,
        has_ocean_view: propertyData.has_ocean_view || 0,
        is_top_floor: propertyData.is_top_floor || 0,
        near_promenade: propertyData.near_promenade || 0,
        has_study: propertyData.has_study || 0,
        mentions_renovated: propertyData.mentions_renovated || 0,
        mentions_luxury: propertyData.mentions_luxury || 0,
        mentions_new_build: propertyData.mentions_new_build || 0,
        is_HouseShare: propertyData.is_HouseShare || 0,
        is_gated: propertyData.is_gated || 0,
        has_balcony: propertyData.has_balcony || 0,
        has_patio: propertyData.has_patio || 0,
        deposit: propertyData.deposit ? String(propertyData.deposit) : "0",
      };

      // FIX: Changed localhost to 127.0.0.1 here as well to ensure it reliably hits FastAPI
      const pythonResponse = await fetch('http://127.0.0.1:8000/predict-quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pythonPayload),
      });

      if (!pythonResponse.ok) {
        const errDetails = await pythonResponse.text();
        throw new Error(`Python ML Engine failed: ${errDetails}`);
      }

      const predictionData = await pythonResponse.json();

      // Catch the custom dictionary error returned by Python if the suburb isn't in lookup_db
      if (predictionData.message && predictionData.message.includes("Error")) {
        throw new Error(predictionData.message);
      }

      // 3. Keep standard analysis result state updated
      setAnalysisResult({
        type: `${propertyData.beds || 0} Bed ${propertyData.type || 'Property'}`,
        asking_price: propertyData.price || 0,
        volora_value: predictionData.estimated_value,
        score: predictionData.deal_score,
      });

      // 4. DYNAMICALLY ADD TO SAVED BOOK TABLE
      const newDeal = {
        id: Date.now(),
        address: `New Listing in ${agent_suburb}`,
        type: `${propertyData.beds || 0} Bed ${propertyData.type || 'Property'}`,
        asking: propertyData.price || 0,
        volora: predictionData.estimated_value,
        score: predictionData.deal_score,
        status: "Newly Analyzed"
      };

      setSavedBook((prevBook) => [newDeal, ...prevBook]);
      setPropUrl('');

    } catch (error: any) {
      console.error("Analysis Pipeline Error:", error);
      // This will now pop up with the EXACT cause of the crash (e.g., Python Engine Failed: 422 Unprocessable Entity)
      alert(`Pipeline Failed: \n\n${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  function setsuburb(value: string): void {
    setLocationLookup(value);
    setagent_Suburb(value);
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans text-slate-900 absolute inset-0 z-50">

      {/* 1. SIDEBAR */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-amber-500 flex items-center justify-center text-white font-black text-xs">V</div>
            <span className="font-bold text-lg tracking-tight">Valora</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-4 space-y-6">
          <div>
            <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Dashboards</p>
            <div className="space-y-1">
              {['Analytics', 'Predictive Valuation', 'Saved Deals', 'Your Book'].map((item) => (
                <button
                  key={item}
                  onClick={() => setActiveMenu(item)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeMenu === item
                    ? 'bg-amber-500 text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                >
                  {item === 'Analytics' && <RiDashboardLine className="w-4 h-4" />}
                  {item === 'Predictive Valuation' && <RiFileChartLine className="w-4 h-4" />}
                  {item === 'Saved Deals' && <RiMoneyDollarCircleLine className="w-4 h-4" />}
                  {item === 'Your Book' && <RiContactsBook3Line className="w-4 h-4" />}
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Intelligence</p>
            <div className="space-y-1">
              <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-slate-600 hover:bg-slate-100 transition-colors">
                <RiMapPinLine className="w-4 h-4" /> Lookup by Location

              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-slate-600 hover:bg-slate-100 transition-colors">
                <RiBuilding4Line className="w-4 h-4" /> Market Pulse
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100">
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-rose-600 hover:bg-rose-50 transition-colors">
            <RiSettings3Line className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">

        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center w-96 relative">
            <RiSearchLine className="w-4 h-4 text-slate-400 absolute left-3 z-10" />
            <AutoComplete
              className="w-64 pl-8"
              options={locations}
              value={agent_suburb}
              onChange={setsuburb}
              placeholder="Type a location..."
              filterOption={(inputValue, option) =>
                option?.value?.toUpperCase().includes(inputValue.toUpperCase()) ?? false
              }
            />
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors relative">
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full"></span>
              <RiNotification3Line className="w-5 h-5" />
            </button>
            <div className="h-8 w-8 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 font-bold border border-amber-200">
              <RiUserLine className="w-4 h-4" />
            </div>
          </div>
        </header>

        {/* Scrollable Dashboard Grid */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {activeMenu === 'Analytics' && (
              <>
                {/* ROW 1: Hero & Quick Stats */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                  {/* Welcome Card (Spans 8) */}
                  <Card className="lg:col-span-8 bg-amber-50 border-none shadow-sm flex flex-col md:flex-row items-center justify-between p-6">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900 mb-1">Volora Analytics Dashboard</h2>
                      <p className="text-slate-600 text-sm mb-6">Here is what is happening across your tracked locations today.</p>
                      <div className="flex gap-8">
                        <div>
                          <p className="text-3xl font-bold text-slate-900">R 2.4M</p>
                          <p className="text-xs font-medium text-emerald-600 mt-1 flex items-center gap-1">
                            <RiArrowUpLine className="w-3 h-3" /> +12% Total Arbitrage Value
                          </p>
                        </div>
                        <div>
                          <p className="text-3xl font-bold text-slate-900">42</p>
                          <p className="text-xs font-medium text-amber-600 mt-1">Active Deal Alerts</p>
                        </div>
                      </div>
                    </div>
                    {/* Illustration Placeholder */}
                    <div className="hidden md:flex w-48 h-32 bg-amber-200/50 rounded-xl border border-amber-300/50 items-center justify-center">
                      <RiBuilding4Line className="w-12 h-12 text-amber-500" />
                    </div>
                  </Card>

                  {/* Weekly Stat (Spans 2) */}
                  <Card className="lg:col-span-2 shadow-sm border-slate-200 p-6 flex flex-col justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">Avg Market Variance</p>
                      <p className="text-2xl font-bold text-slate-900 mt-2">- 14.5%</p>
                    </div>
                    <div className="text-xs font-medium text-emerald-600 flex items-center gap-1 mt-4">
                      <RiArrowDownLine className="w-3 h-3" /> Underpriced trend
                    </div>
                  </Card>

                  {/* Scraped Listings (Spans 2) */}
                  <Card className="lg:col-span-2 shadow-sm border-slate-200 p-6 flex flex-col justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">Listings Analyzed</p>
                      <p className="text-2xl font-bold text-slate-900 mt-2">1,204</p>
                    </div>
                    <div className="text-xs font-medium text-slate-500 flex items-center gap-1 mt-4">
                      Updated 10 mins ago
                    </div>
                  </Card>
                </div>

                {/* ROW 2: Main Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                  {/* Bar Chart (Spans 8) */}
                  <Card className="lg:col-span-8 shadow-sm border-slate-200 p-6">
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">Valuation Tracking</h3>
                        <p className="text-sm text-slate-500">Estimated value vs Asking price</p>
                      </div>
                    </div>
                    <BarChart
                      className="h-72 mt-4"
                      data={revenueData}
                      index="date"
                      categories={["Volora Value", "Asking Price"]}
                      colors={["amber", "slate"]}
                      yAxisWidth={48}
                      showAnimation={true}
                    />
                  </Card>

                  {/* Right Side Column (Spans 4) */}
                  <div className="lg:col-span-4 flex flex-col gap-6">

                    {/* Donut Chart */}
                    <Card className="shadow-sm border-slate-200 p-6 flex-1">
                      <h3 className="text-lg font-bold text-slate-900 mb-1">Portfolio Breakup</h3>
                      <p className="text-sm text-slate-500 mb-6">Current deal distribution</p>
                      <div className="flex items-center justify-center">
                        <DonutChart
                          className="h-40"
                          data={portfolioBreakup}
                          category="value"
                          index="name"
                          colors={["emerald", "amber", "rose"]}
                          showLabel={true}
                        />
                      </div>
                      <div className="mt-6 flex justify-between items-center px-4">
                        <p className="text-2xl font-bold text-slate-900">45%</p>
                        <p className="text-sm font-medium text-emerald-600">Bargain Deals</p>
                      </div>
                    </Card>
                  </div>

                </div>

                {/* ROW 3: Data Tables & Area Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                  {/* Deals by Location (Spans 8) */}
                  <Card className="lg:col-span-8 shadow-sm border-slate-200 p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-1">Active Deals by Location</h3>
                    <p className="text-sm text-slate-500 mb-6">Top performing analytical hubs</p>
                    <BarChart
                      className="h-64"
                      data={locationData}
                      index="Location"
                      categories={["Active Deals"]}
                      colors={["amber"]}
                      layout="vertical"
                      showLegend={false}
                      showAnimation={true}
                    />
                  </Card>

                  {/* Recent Transactions List (Spans 4) */}
                  <Card className="lg:col-span-4 shadow-sm border-slate-200 p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-6">Recent Activity</h3>
                    <div className="space-y-6">
                      {recentTransactions.map((tx) => (
                        <div key={tx.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${tx.isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                              <RiCheckboxCircleLine className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900">{tx.type}</p>
                              <p className="text-xs text-slate-500">{tx.location}</p>
                            </div>
                          </div>
                          <p className={`text-sm font-bold ${tx.isPositive ? 'text-emerald-600' : 'text-slate-900'}`}>
                            {tx.amount}
                          </p>
                        </div>
                      ))}
                    </div>
                  </Card>

                </div>
              </>
            )}

            {activeMenu === 'Your Book' && (
              <div className="space-y-6 max-w-7xl mx-auto">

                {/* Header Area */}
                <div>
                  <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Your Book</h2>
                  <p className="text-slate-500 text-sm mt-1">Manage your saved arbitrage deals and active client mandates.</p>
                </div>

                {/* TOP ROW: Quick Analyze Card */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm mb-6 max-w-3xl">
                  <h3 className="text-lg font-bold text-slate-900 mb-1">Quick Analyze</h3>
                  <p className="text-sm text-slate-500 mb-4">Paste a Property24 URL to instantly run a Volora valuation.</p>

                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <RiLinkM className="h-5 w-5 text-slate-400" />
                      </div>
                      <input
                        type="url"
                        value={propUrl}
                        onChange={(e) => setPropUrl(e.target.value)}
                        placeholder="https://www.property24.com/for-sale/cape-town/..."
                        className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-amber-500 focus:border-amber-500 sm:text-sm transition-colors"
                      />
                    </div>

                    <button
                      onClick={handleAnalyzeUrl}
                      disabled={isAnalyzing || !propUrl}
                      className={`px-6 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${isAnalyzing || !propUrl
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm'
                        }`}
                    >
                      {isAnalyzing ? (
                        <>
                          <RiLoader4Line className="w-4 h-4 animate-spin" /> Analyzing...
                        </>
                      ) : (
                        <>
                          <RiFlashlightLine className="w-4 h-4" /> Run Valuation
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* PIPELINE GRID - DYNAMICALLY POPULATED */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-900">Active Pipeline</h3>
                  </div>

                  {/* CSS Grid Header Row */}
                  <div className="grid grid-cols-12 gap-4 p-4 border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <div className="col-span-3">Property</div>
                    <div className="col-span-2">Type</div>
                    <div className="col-span-2">Asking Price</div>
                    <div className="col-span-2">Volora Value</div>
                    <div className="col-span-2">Deal Score</div>
                    <div className="col-span-1 text-right">Actions</div>
                  </div>

                  {/* Data Rows map over the dynamically updated state */}
                  <div className="divide-y divide-slate-100">
                    {savedBook.map((deal) => (
                      <div key={deal.id} className="grid grid-cols-12 gap-4 p-4 items-center text-sm hover:bg-slate-50 transition-colors">
                        <div className="col-span-3 font-medium text-slate-900">{deal.address}</div>
                        <div className="col-span-2 text-slate-500">{deal.type}</div>
                        <div className="col-span-2 text-slate-600">
                          R {typeof deal.asking === 'number' ? deal.asking.toLocaleString() : deal.asking}
                        </div>
                        <div className="col-span-2 font-medium text-slate-900">
                          R {typeof deal.volora === 'number' ? deal.volora.toLocaleString() : deal.volora}
                        </div>

                        {/* Dynamic Color Pill */}
                        <div className="col-span-2">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${deal.score ? (deal.score >= 75 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : deal.score >= 35 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200') :
                            'bg-slate-50 text-slate-700 border-slate-200'}`}>
                            {deal.score ? `${deal.score}` : 'N/A'}
                          </span>
                        </div>

                        {/* Action Icons */}
                        <div className="col-span-1 flex justify-end gap-2 text-slate-400">
                          <button className="hover:text-amber-500 transition-colors"><RiEyeLine className="w-5 h-5" /></button>
                          <button className="hover:text-rose-500 transition-colors"><RiDeleteBinLine className="w-5 h-5" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

