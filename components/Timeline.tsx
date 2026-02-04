import React, { useState, useEffect } from 'react';
import { 
    CheckCircle2, Circle, MapPin, AlertTriangle, 
    ExternalLink, AlertCircle, Headphones, Ticket, Maximize2, Navigation, Footprints 
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

    const getStatusColor = (act: ItineraryItem, isActive: boolean) => {
        if (act.completed) return 'border-emerald-500 bg-emerald-50 bg-opacity-30';
        if (isActive) return 'border-blue-500 bg-white';
        if (act.notes === 'CRITICAL') return 'border-rose-600 bg-rose-50';
        return 'border-blue-100 bg-white';
    };

    // Helper to check if current time is within activity range
    const isActivityActive = (startTime: string, endTime: string) => {
        const now = new Date();
        const currentMins = now.getHours() * 60 + now.getMinutes();
        
        const [startH, startM] = startTime.split(':').map(Number);
        const startTotal = startH * 60 + startM;
        
        const [endH, endM] = endTime.split(':').map(Number);
        const endTotal = endH * 60 + endM;

        return currentMins >= startTotal && currentMins < endTotal;
    };

    return (
        <div className="pb-24 px-4 pt-4 max-w-lg mx-auto">
            <div className="flex justify-between items-end mb-6">
                <h2 className="text-2xl font-bold text-blue-900 uppercase tracking-tight">Escala Livorno/Florencia</h2>
                <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                    </span>
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest bg-blue-50 px-2 py-1 rounded-md border border-blue-100">En Vivo</span>
                </div>
            </div>
            
            <div className="relative border-l-2 border-blue-100 ml-3 space-y-8">
                {itinerary.map((act, idx) => {
                    const prevAct = idx > 0 ? itinerary[idx - 1] : null;
                    const gap = prevAct ? calculateGap(prevAct.endTime, act.startTime) : 0;
                    const isCritical = act.notes === 'CRITICAL';
                    const duration = calculateDuration(act.startTime, act.endTime);
                    const actProgress = calculateTimeProgress(act.startTime, act.endTime);
                    const gapProgress = prevAct ? calculateTimeProgress(prevAct.endTime, act.startTime) : 0;
                    const isActive = isActivityActive(act.startTime, act.endTime);
                    
                    // Distance and Direction Logic
                    let distanceText = null;
                    let arrowRotation = 0;
                    let isNear = false;
                    
                    if (userLocation && !act.completed) {
                        const km = calculateDistance(userLocation.lat, userLocation.lng, act.coords.lat, act.coords.lng);
                        const bearing = calculateBearing(userLocation.lat, userLocation.lng, act.coords.lat, act.coords.lng);
                        
                        arrowRotation = bearing - heading; 
                        
                        if (km < 1) {
                            const meters = Math.round(km * 1000);
                            distanceText = `${meters} m`;
                            if (meters < 300) isNear = true; // Less than 300m considered "Near"
                        } else {
                            distanceText = `${km.toFixed(1)} km`;
                        }
                    }

                    return (
                        <React.Fragment key={act.id}>
                            {/* Visualización del Tiempo de Traslado */}
                            {gap > 0 && prevAct && (
                                <div className="relative ml-0 my-6 pl-6">
                                    <div className="absolute left-[-2px] top-[-24px] bottom-[-24px] w-[2px] bg-gradient-to-b from-blue-100 via-blue-300 to-blue-100"></div>
                                    
                                    <div className="bg-slate-50/80 backdrop-blur-sm px-4 py-3 rounded-2xl border border-blue-100 flex flex-col shadow-sm w-full max-w-[260px] hover:bg-white transition-colors">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center">
                                                <div className="bg-blue-100 p-1.5 rounded-full mr-3 border border-blue-200">
                                                    <Footprints size={14} className="text-blue-600" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Tiempo de Traslado</span>
                                                    <span className="text-xs font-bold text-slate-700 uppercase flex items-center gap-2">
                                                        {formatMinutes(gap)} 
                                                        <span className="text-[9px] px-1.5 py-0.5 bg-slate-200 rounded text-slate-500">{gap > 30 ? 'Paseo' : 'Caminata'}</span>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Barra de progreso del traslado */}
                                        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                            <div className="h-full bg-slate-400 transition-all duration-1000" style={{ width: `${gapProgress}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="mb-8 ml-6 relative">
                                {/* Icono de estado (Check o Círculo) */}
                                <div 
                                    className={`absolute -left-[31px] top-0 rounded-full bg-white border-2 cursor-pointer transition-all z-20 
                                    ${act.completed ? 'border-emerald-500 text-emerald-500 shadow-sm' : isActive ? 'border-blue-600 text-blue-600 shadow-md scale-110' : 'border-blue-200 text-blue-300'}
                                    `} 
                                    onClick={() => onToggleComplete(act.id)}
                                >
                                    {act.completed ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                                </div>

                                {/* Tarjeta de la Actividad */}
                                <div className={`rounded-2xl border transition-all duration-300 overflow-hidden relative
                                    ${getStatusColor(act, isActive)}
                                    ${isActive ? 'ring-2 ring-blue-500 ring-offset-2 shadow-xl shadow-blue-200/50 scale-[1.02] z-10' : act.completed ? 'opacity-70 grayscale-[0.5]' : 'shadow-md'}
                                `}>
                                    {isActive && (
                                        <div className="absolute top-0 right-0 z-20">
                                            <span className="bg-blue-600 text-white text-[9px] font-black px-3 py-1.5 rounded-bl-xl uppercase tracking-widest animate-pulse shadow-sm">
                                                En Curso
                                            </span>
                                        </div>
                                    )}

                                    {/* Barra de Progreso de la Actividad */}
                                    <div className="w-full h-1.5 bg-slate-100 overflow-hidden">
                                        <div 
                                            className={`h-full transition-all duration-1000 ${actProgress === 100 ? 'bg-emerald-400' : 'bg-blue-600'}`} 
                                            style={{ width: `${actProgress}%` }}
                                        ></div>
                                    </div>

                                    {act.imageUrl && (
                                        <div className="relative h-40 w-full overflow-hidden cursor-pointer group" onClick={() => onImageClick(act.imageUrl!)}>
                                            <img src={act.imageUrl} alt={act.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Maximize2 size={24} className="text-white drop-shadow-md" />
                                            </div>
                                        </div>
                                    )}

                                    <div className="p-5">
                                        <div className="flex justify-between items-start mb-2 pr-12"> {/* pr-12 para espacio de etiqueta EN CURSO */}
                                            <div>
                                                <div className="flex items-center space-x-2 mb-2">
                                                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-tighter uppercase ${isActive ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800'}`}>
                                                        {act.startTime} - {act.endTime}
                                                    </span>
                                                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                                        {duration}
                                                    </span>
                                                </div>
                                                <h3 className={`font-bold text-lg leading-tight ${isActive ? 'text-blue-700' : 'text-slate-800'}`}>{act.title}</h3>
                                            </div>
                                            {isCritical && <AlertTriangle className="text-rose-600 animate-pulse mt-1" size={20} />}
                                        </div>

                                        <div className="mb-4 flex items-center justify-between gap-2">
                                            <div className="flex items-center text-sm text-slate-600 overflow-hidden">
                                                <MapPin size={14} className="mr-1 text-blue-600 shrink-0"/> 
                                                <span className="font-medium truncate">{act.locationName}</span>
                                            </div>
                                            
                                            {distanceText && (
                                                <div className={`flex items-center px-2 py-1 rounded-lg border transition-all duration-500 shrink-0
                                                    ${isNear 
                                                        ? 'bg-emerald-100 border-emerald-300 text-emerald-800 shadow-sm animate-pulse' 
                                                        : 'bg-blue-50 border-blue-100 text-blue-700'}
                                                `}>
                                                    <Navigation 
                                                        size={12} 
                                                        className={`mr-1.5 transition-transform duration-500 ease-out ${isNear ? 'text-emerald-600' : 'text-blue-500'}`}
                                                        style={{ transform: `rotate(${arrowRotation}deg)` }} 
                                                        fill="currentColor" 
                                                    />
                                                    <span className="text-[10px] font-black tabular-nums">{distanceText}</span>
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

                                        <div className="flex flex-wrap items-center gap-2 mt-3 pt-4 border-t border-slate-50/80">
                                            <button onClick={() => onLocate(act.coords, act.endCoords)} className="flex items-center text-[10px] font-bold text-blue-800 bg-blue-50 px-3 py-2 rounded-xl border border-blue-100 hover:bg-blue-100 shadow-sm transition-colors active:scale-95">
                                                <Navigation size={12} className="mr-1.5" /> UBICACIÓN
                                            </button>
                                            
                                            {act.googleMapsUrl && (
                                                <a href={act.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-100 hover:bg-emerald-100 shadow-sm transition-colors active:scale-95">
                                                    <ExternalLink size={12} className="mr-1.5" /> MAPS
                                                </a>
                                            )}

                                            {act.ticketUrl && (
                                                <a href={act.ticketUrl} target="_blank" rel="noopener noreferrer" className="flex items-center text-[10px] font-bold text-purple-700 bg-purple-50 px-3 py-2 rounded-xl border border-purple-100 hover:bg-purple-100 shadow-sm transition-colors active:scale-95">
                                                    <Ticket size={12} className="mr-1.5" /> TICKET
                                                </a>
                                            )}
                                            
                                            {act.audioGuideText && (
                                                <button onClick={() => onOpenAudioGuide(act)} className="flex items-center text-[10px] font-bold text-amber-700 bg-amber-50 px-3 py-2 rounded-xl border border-amber-100 shadow-sm active:bg-amber-100 active:scale-95"><Headphones size={12} className="mr-1.5" /> AUDIOGUÍA</button>
                                            )}

                                            <div className="ml-auto">
                                                <button onClick={() => onToggleComplete(act.id)} className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95 ${act.completed ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-blue-900 text-white shadow-md hover:bg-blue-800'}`}>
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