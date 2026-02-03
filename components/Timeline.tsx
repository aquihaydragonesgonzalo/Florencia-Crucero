import React, { useState, useEffect } from 'react';
import { 
    Clock, CheckCircle2, Circle, MapPin, AlertTriangle, 
    ExternalLink, AlertCircle, Headphones, Ticket, Maximize2, Navigation 
} from 'lucide-react';
import { ItineraryItem, Coords } from '../types';
import { formatMinutes, calculateDuration, calculateTimeProgress, calculateDistance, calculateBearing } from '../utils';

interface TimelineProps {
    itinerary: ItineraryItem[];
    onToggleComplete: (id: string) => void;
    onLocate: (coords: Coords, endCoords?: Coords) => void;
    userLocation: Coords | null;
    onOpenAudioGuide: (act: ItineraryItem) => void;
    onImageClick: (url: string) => void;
}

const Timeline: React.FC<TimelineProps> = ({ itinerary, onToggleComplete, onLocate, userLocation, onOpenAudioGuide, onImageClick }) => {
    const [, setTick] = useState(0);
    const [heading, setHeading] = useState(0);

    // Update time every minute
    useEffect(() => { const t = setInterval(() => setTick(n => n + 1), 60000); return () => clearInterval(t); }, []);

    // Handle device orientation for compass
    useEffect(() => {
        const handleOrientation = (event: DeviceOrientationEvent) => {
            // iOS uses webkitCompassHeading, others use alpha
            // This is a best-effort implementation without forcing permission request UI
            const compass = (event as any).webkitCompassHeading || (event.alpha ? 360 - event.alpha : 0);
            setHeading(compass);
        };

        if (window.DeviceOrientationEvent) {
            window.addEventListener('deviceorientation', handleOrientation);
        }
        return () => window.removeEventListener('deviceorientation', handleOrientation);
    }, []);

    const calculateGap = (endStrPrev: string, startStrNext: string) => {
        const [endH, endM] = endStrPrev.split(':').map(Number);
        const [startH, startM] = startStrNext.split(':').map(Number);
        const diffMins = (startH * 60 + startM) - (endH * 60 + endM);
        return diffMins > 0 ? diffMins : 0;
    };

    const getStatusColor = (act: ItineraryItem) => {
        if (act.completed) return 'border-emerald-500 bg-emerald-50 bg-opacity-30';
        if (act.notes === 'CRITICAL') return 'border-rose-600 bg-rose-50';
        return 'border-blue-50 bg-white';
    };

    return (
        <div className="pb-24 px-4 pt-4 max-w-lg mx-auto">
            <div className="flex justify-between items-end mb-6">
                <h2 className="text-2xl font-bold text-blue-900 uppercase tracking-tight">Escala Livorno/Florencia</h2>
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest bg-blue-50 px-2 py-1 rounded-md border border-blue-100">En Vivo</span>
            </div>
            
            <div className="relative border-l-2 border-blue-100 ml-3 space-y-8">
                {itinerary.map((act, idx) => {
                    const prevAct = idx > 0 ? itinerary[idx - 1] : null;
                    const gap = prevAct ? calculateGap(prevAct.endTime, act.startTime) : 0;
                    const isCritical = act.notes === 'CRITICAL';
                    const duration = calculateDuration(act.startTime, act.endTime);
                    const actProgress = calculateTimeProgress(act.startTime, act.endTime);
                    const gapProgress = prevAct ? calculateTimeProgress(prevAct.endTime, act.startTime) : 0;
                    
                    // Distance and Direction Logic
                    let distanceText = null;
                    let arrowRotation = 0;
                    
                    if (userLocation && !act.completed) {
                        const km = calculateDistance(userLocation.lat, userLocation.lng, act.coords.lat, act.coords.lng);
                        const bearing = calculateBearing(userLocation.lat, userLocation.lng, act.coords.lat, act.coords.lng);
                        
                        // If heading is 0 (no device orientation), arrow points to bearing (North Up map style)
                        // If heading exists, arrow acts like a compass
                        arrowRotation = bearing - heading; 
                        
                        if (km < 1) {
                            distanceText = `${Math.round(km * 1000)} m`;
                        } else {
                            distanceText = `${km.toFixed(1)} km`;
                        }
                    }

                    return (
                        <React.Fragment key={act.id}>
                            {gap > 0 && prevAct && (
                                <div className="relative ml-0 my-8">
                                    <div className="absolute left-[-2px] top-[-20px] bottom-[-20px] border-l-2 border-dashed border-blue-200"></div>
                                    <div className="ml-6 flex items-center">
                                        <div className="bg-white/80 backdrop-blur-sm px-4 py-3 rounded-2xl border border-blue-50 flex flex-col shadow-sm w-full max-w-[240px]">
                                            <div className="flex items-center mb-2">
                                                <div className="bg-blue-100 p-1.5 rounded-full mr-3 border border-blue-200">
                                                    <Clock size={12} className="text-blue-600" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1">Traslado</span>
                                                    <span className="text-[10px] font-bold text-blue-600 uppercase">{formatMinutes(gap)} — {gap > 30 ? 'Paseo Libre' : 'Caminata'}</span>
                                                </div>
                                            </div>
                                            <div className="w-full h-1 bg-blue-50 rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-300 transition-all duration-1000" style={{ width: `${gapProgress}%` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="mb-8 ml-6 relative">
                                <div className={`absolute -left-[31px] top-0 rounded-full bg-white border-2 cursor-pointer transition-all z-10 ${act.completed ? 'border-emerald-500 text-emerald-500 shadow-sm' : 'border-blue-700 text-blue-700 shadow-sm'}`} onClick={() => onToggleComplete(act.id)}>
                                    {act.completed ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                                </div>

                                <div className={`rounded-2xl border shadow-sm transition-all overflow-hidden ${getStatusColor(act)} ${act.completed ? 'opacity-70' : 'shadow-md'}`}>
                                    <div className="w-full h-1.5 bg-blue-50 overflow-hidden">
                                        <div className={`h-full transition-all duration-1000 ${actProgress === 100 ? 'bg-slate-300' : 'bg-blue-800'}`} style={{ width: `${actProgress}%` }}></div>
                                    </div>

                                    {act.imageUrl && (
                                        <div className="relative h-40 w-full overflow-hidden cursor-pointer group" onClick={() => onImageClick(act.imageUrl!)}>
                                            <img src={act.imageUrl} alt={act.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                            <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Maximize2 size={24} className="text-white" />
                                            </div>
                                        </div>
                                    )}

                                    <div className="p-5">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <div className="flex items-center space-x-2 mb-2">
                                                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 tracking-tighter uppercase">{act.startTime} - {act.endTime}</span>
                                                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">{duration}</span>
                                                </div>
                                                <h3 className="font-bold text-lg text-slate-800 leading-tight">{act.title}</h3>
                                            </div>
                                            {isCritical && <AlertTriangle className="text-rose-600 animate-pulse" size={20} />}
                                        </div>

                                        <div className="mb-3 flex items-center justify-between">
                                            <div className="flex items-center text-sm text-slate-600 max-w-[65%]">
                                                <MapPin size={14} className="mr-0.5 text-blue-700 shrink-0"/> 
                                                <span className="font-medium truncate">{act.locationName}</span>
                                            </div>
                                            {distanceText && (
                                                <div className="flex items-center bg-blue-100/50 px-2 py-1 rounded-lg border border-blue-200">
                                                    <Navigation 
                                                        size={12} 
                                                        className="text-blue-600 mr-1.5 transition-transform duration-500 ease-out" 
                                                        style={{ transform: `rotate(${arrowRotation}deg)` }} 
                                                        fill="currentColor" 
                                                    />
                                                    <span className="text-[10px] font-black text-blue-800 tabular-nums">{distanceText}</span>
                                                </div>
                                            )}
                                        </div>

                                        <p className="text-sm text-slate-600 mb-4 leading-relaxed whitespace-pre-line">{act.description}</p>
                                        
                                        <div className="bg-blue-50/50 p-3 rounded-xl text-sm text-blue-950 italic border-l-4 border-amber-500 mb-4">"{act.keyDetails}"</div>

                                        {act.contingencyNote && (
                                            <div className="mt-3 mb-4 flex items-start p-3 bg-red-50 text-red-800 rounded-xl text-xs font-medium border border-red-100">
                                                <AlertCircle size={14} className="mr-2 mt-0.5 flex-shrink-0" />
                                                <span>{act.contingencyNote}</span>
                                            </div>
                                        )}

                                        <div className="flex flex-wrap items-center gap-2 mt-3 pt-4 border-t border-slate-50">
                                            <button onClick={() => onLocate(act.coords, act.endCoords)} className="flex items-center text-[10px] font-bold text-blue-800 bg-blue-50 px-3 py-2 rounded-xl border border-blue-100 hover:bg-blue-100 shadow-sm transition-colors">
                                                <Navigation size={12} className="mr-1.5" /> UBICACIÓN
                                            </button>
                                            
                                            {act.googleMapsUrl && (
                                                <a href={act.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-100 hover:bg-emerald-100 shadow-sm transition-colors">
                                                    <ExternalLink size={12} className="mr-1.5" /> GOOGLE MAPS
                                                </a>
                                            )}

                                            {act.ticketUrl && (
                                                <a href={act.ticketUrl} target="_blank" rel="noopener noreferrer" className="flex items-center text-[10px] font-bold text-purple-700 bg-purple-50 px-3 py-2 rounded-xl border border-purple-100 hover:bg-purple-100 shadow-sm transition-colors">
                                                    <Ticket size={12} className="mr-1.5" /> TICKET
                                                </a>
                                            )}
                                            
                                            {act.audioGuideText && (
                                                <button onClick={() => onOpenAudioGuide(act)} className="flex items-center text-[10px] font-bold text-amber-700 bg-amber-50 px-3 py-2 rounded-xl border border-amber-100 shadow-sm active:bg-amber-100"><Headphones size={12} className="mr-1.5" /> AUDIOGUÍA</button>
                                            )}

                                            <div className="ml-auto">
                                                <button onClick={() => onToggleComplete(act.id)} className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${act.completed ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-blue-900 text-white shadow-md active:scale-95'}`}>
                                                {act.completed ? 'Hecho' : 'Completar'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </React.Fragment>
                    );
                })}
            </div>
        </div >
    );
};

export default Timeline;