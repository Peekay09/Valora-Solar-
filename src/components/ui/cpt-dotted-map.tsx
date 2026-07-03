"use client";

import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, TileLayer, Tooltip } from "react-leaflet";

// 1. Fixed isDeal to be a boolean
export type CptMarker = {
    lat: number;
    lng: number;
    suburb: string;
    variance: number;
    deal_score: number;
    deal_status: string;
    isDeal: boolean; 
    Total_Listings: number
};

interface CptMapProps {
    markers?: CptMarker[];
}

export default function CptLeafletMap({ markers = [] }: CptMapProps) {
    const cptCenter: [number, number] = [-33.9249, 18.4241];

    return (
        <div className="w-full h-full min-h-[400px] rounded-xl overflow-hidden relative z-0">
            <MapContainer
                center={cptCenter}
                zoom={12}
                scrollWheelZoom={false}
                className="w-full h-full bg-slate-950"
            >
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
                />

                {markers.map((marker, idx) => (
                    <CircleMarker
                        key={idx}
                        center={[marker.lat, marker.lng]}
                        radius={6}
                        pathOptions={{
                            color: marker.isDeal ? "#34d399" : marker.deal_status === 'FAIR' ? "#ff9317" : "#f43f5e",
                            fillColor: marker.isDeal ? "#10b981" : marker.deal_status === 'FAIR' ? "#f59e0b" : "#e11d48",
                            fillOpacity: 0.9,
                            weight: 2,
                        }}
                    >
                        {/* 2. Reset Leaflet CSS completely */}
                        <Tooltip
                            direction="bottom"
                            offset={[10, 0]}
                            opacity={1}
                            permanent
                            className="!bg-transparent !border-none !shadow-none !p-0 !whitespace-normal"
                        >
                            {/* 3. The isolated Tailwind Wrapper */}
                            <div className={`flex items-center gap-3 bg-slate-900/95 backdrop-blur-md border p-2.5 rounded-xl shadow-2xl w-max ${
                                marker.isDeal ? "border-emerald-500/30" : "border-rose-500/30"
                            }`}>
                                {/* The Mini Deal Score Circle */}
                                <div className="relative flex items-center justify-center w-9 h-9 shrink-0">
                                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                        <circle cx="18" cy="18" r="15.9155" fill="none" className="stroke-slate-700/50" strokeWidth="3" />
                                        <circle
                                            cx="18" cy="18" r="15.9155" fill="none"
                                            className={marker.deal_score >= 75 ? 'stroke-emerald-500' : marker.deal_score >= 35 ? 'stroke-amber-500' : 'stroke-rose-500'}
                                            strokeWidth="3" strokeDasharray="100, 100" strokeDashoffset={100 - marker.deal_score} strokeLinecap="round"
                                        />
                                    </svg>
                                    <div className="absolute flex items-center justify-center text-[10px] font-bold text-slate-200">
                                        {marker.deal_score}
                                    </div>
                                </div>

                                {/* The Text & Verdict Badge */}
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-slate-100 text-[10px] font-bold tracking-wider uppercase">
                                        {marker.suburb}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        <span className={`text-[9px] font-black tracking-widest uppercase ${
                                            marker.deal_status === 'BARGAIN' ? 'text-emerald-400' : marker.deal_status === 'FAIR' ? 'text-amber-400' : 'text-rose-400'
                                        }`}>
                                            {marker.deal_status}
                                        </span>
                                        <span className="text-[9px] font-small text-slate-400">
                                            ({marker.variance > 0 ? '+' : ''}{marker.variance}%)
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </Tooltip>
                    </CircleMarker>
                ))}
            </MapContainer>
        </div>
    );
}