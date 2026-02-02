import React, { useState, useEffect } from 'react';
import { Anchor, CalendarClock, Map as MapIcon, Wallet, BookOpen, Headphones, X, Square, Play } from 'lucide-react';
import Timeline from './components/Timeline';
import Budget from './components/Budget';
import Guide from './components/Guide';
import MapComponent from './components/MapComponent';
import { INITIAL_ITINERARY, SHIP_ONBOARD_TIME } from './constants';
import { ItineraryItem, Coords } from './types';

const App: React.FC = () => {
    const [itinerary, setItinerary] = useState<ItineraryItem[]>(INITIAL_ITINERARY);
    const [activeTab, setActiveTab] = useState<'timeline' | 'map' | 'budget' | 'guide'>('timeline');
    const [userLocation, setUserLocation] = useState<Coords | null>(null);
    const [mapFocus, setMapFocus] = useState<Coords | null>(null);
    const [countdown, setCountdown] = useState('00h 00m 00s');
    const [audioGuideActivity, setAudioGuideActivity] = useState<ItineraryItem | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [expandedImage, setExpandedImage] = useState<string | null>(null);

    // Load persisted state
    useEffect(() => {
        const saved = localStorage.getItem('genova_guide_v1_storage');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                const merged = INITIAL_ITINERARY.map(initItem => {
                    const savedItem = parsed.find((p: any) => p.id === initItem.id);
                    return savedItem ? { ...initItem, completed: savedItem.completed } : initItem;
                });
                setItinerary(merged);
            } catch(e) { console.error("Error restoring state", e); }
        }
    }, []);

    const handleToggleComplete = (id: string) => {
        const newItinerary = itinerary.map(act => act.id === id ? { ...act, completed: !act.completed } : act);
        setItinerary(newItinerary);
        localStorage.setItem('genova_guide_v1_storage', JSON.stringify(newItinerary));
    };

    // Geolocation
    useEffect(() => {
        if ('geolocation' in navigator) {
            const watchId = navigator.geolocation.watchPosition(
                pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }), 
                err => console.log(err), 
                { enableHighAccuracy: true }
            );
            return () => navigator.geolocation.clearWatch(watchId);
        }
    }, []);

    // Countdown Timer
    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            const [hours, minutes] = SHIP_ONBOARD_TIME.split(':').map(Number);
            const target = new Date();
            target.setHours(hours, minutes, 0, 0);
            const diff = target.getTime() - now.getTime();
            if (diff <= 0) setCountdown("¡A BORDO!");
            else {
                const h = Math.floor(diff / (1000 * 60 * 60));
                const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const s = Math.floor((diff % (1000 * 60)) / 1000);
                setCountdown(`${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`);
            }
        }, 1000);
        
        // Remove simulated loader if present (handled via CSS mainly, but good practice)
        const loader = document.getElementById('initial-loader');
        if(loader) { 
            loader.style.opacity = '0'; 
            setTimeout(() => loader.remove(), 500); 
        }

        return () => clearInterval(timer);
    }, []);

    const handleLocate = (coords: Coords) => { 
        setMapFocus(coords); 
        setActiveTab('map'); 
    };
    
    const handlePlayAudio = () => {
        if (!audioGuideActivity?.audioGuideText) return;
        if (isPlaying) { 
            window.speechSynthesis.cancel(); 
            setIsPlaying(false); 
        } else {
            const utterance = new SpeechSynthesisUtterance(audioGuideActivity.audioGuideText);
            utterance.lang = 'es-ES';
            utterance.rate = 0.95;
            utterance.onend = () => setIsPlaying(false);
            window.speechSynthesis.speak(utterance);
            setIsPlaying(true);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
            <header className="bg-blue-950 text-white p-4 shadow-xl z-20 flex justify-between items-center shrink-0">
                <div className="flex items-center">
                    <Anchor className="mr-3 text-amber-500" size={24} />
                    <div><h1 className="font-black text-[10px] uppercase tracking-[0.2em] text-blue-300">Escala Florencia</h1><p className="text-[12px] font-bold text-white/90 leading-tight">15 Abril 2026</p></div>
                </div>
                <div className="flex flex-col items-end"><span className="text-[8px] font-black uppercase text-amber-400 tracking-widest mb-0.5">Límite Embarque</span><div className="text-lg font-black font-mono text-white leading-none tracking-tighter">{countdown}</div></div>
            </header>

            <main className="flex-1 overflow-hidden relative">
                {activeTab === 'timeline' && (
                    <div className="h-full overflow-y-auto no-scrollbar">
                        <Timeline 
                            itinerary={itinerary} 
                            onToggleComplete={handleToggleComplete} 
                            onLocate={handleLocate} 
                            userLocation={userLocation} 
                            onOpenAudioGuide={(act) => setAudioGuideActivity(act)}
                            onImageClick={(url) => setExpandedImage(url)}
                        />
                    </div>
                )}
                {activeTab === 'map' && (<MapComponent activities={itinerary} userLocation={userLocation} focusedLocation={mapFocus} />)}
                {activeTab === 'budget' && <Budget itinerary={itinerary} />}
                {activeTab === 'guide' && <Guide userLocation={userLocation} />}

                {/* Fullscreen Image Modal */}
                {expandedImage && (
                    <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setExpandedImage(null)}>
                        <button className="absolute top-6 right-6 bg-white/10 p-3 rounded-full text-white hover:bg-white/20 transition-colors z-[110]" onClick={() => setExpandedImage(null)}>
                            <X size={32} />
                        </button>
                        <img src={expandedImage} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300" alt="Vista ampliada" />
                    </div>
                )}

                {/* Audio Guide Modal */}
                {audioGuideActivity && (
                    <div className="absolute inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-blue-950/40 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
                            <div className="p-8">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="bg-blue-100 p-3 rounded-2xl border border-blue-200"><Headphones size={24} className="text-blue-700" /></div>
                                    <button onClick={() => { window.speechSynthesis.cancel(); setIsPlaying(false); setAudioGuideActivity(null); }} className="text-slate-300 hover:text-slate-600 transition-colors"><X size={28} /></button>
                                </div>
                                <h3 className="text-xs font-black text-blue-400 uppercase tracking-[0.2em] mb-2">Audioguía</h3>
                                <h4 className="text-xl font-black text-slate-800 mb-6 leading-tight">{audioGuideActivity.title}</h4>
                                <div className="max-h-[300px] overflow-y-auto pr-2 custom-h-scrollbar mb-8"><p className="text-slate-600 leading-relaxed font-medium italic">{audioGuideActivity.audioGuideText}</p></div>
                                <div className="flex gap-4"><button onClick={handlePlayAudio} className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-3xl font-black uppercase tracking-widest text-sm transition-all shadow-lg active:scale-95 ${isPlaying ? 'bg-rose-600 text-white shadow-rose-200' : 'bg-blue-900 text-white shadow-blue-200'}`}>{isPlaying ? <Square size={18} fill="white" /> : <Play size={18} fill="white" />}{isPlaying ? 'Detener' : 'Escuchar'}</button></div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            <nav className="bg-white/95 backdrop-blur-md border-t border-slate-100 z-30 shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                <div className="flex justify-around items-center h-20 px-2 pb-safe">
                    {[{ id: 'timeline', icon: CalendarClock, label: 'Itinerario' }, { id: 'map', icon: MapIcon, label: 'Mapa' }, { id: 'budget', icon: Wallet, label: 'Gastos' }, { id: 'guide', icon: BookOpen, label: 'Guía' }].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex flex-col items-center w-full justify-center transition-all ${activeTab === tab.id ? 'text-blue-900' : 'text-slate-400'}`}>
                            <div className={`p-2 rounded-xl mb-1 ${activeTab === tab.id ? 'bg-blue-50 shadow-sm' : ''}`}>
                                <tab.icon size={22} />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-widest">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </nav>
        </div>
    );
};

export default App;