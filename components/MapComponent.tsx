import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Layers, MapPin, Plus, Trash2, X } from 'lucide-react';
import { Coords, ItineraryItem, UserWaypoint } from '../types';
import { GPX_WAYPOINTS, FLORENCE_TRACK } from '../constants';

interface MapComponentProps {
    activities: ItineraryItem[];
    userLocation: Coords | null;
    focusedLocation: Coords | null;
    userWaypoints: UserWaypoint[];
    onAddWaypoint: (waypoint: UserWaypoint) => void;
    onDeleteWaypoint: (id: string) => void;
}

const MapComponent: React.FC<MapComponentProps> = ({ 
    activities, userLocation, focusedLocation, 
    userWaypoints, onAddWaypoint, onDeleteWaypoint 
}) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const layersRef = useRef<L.Layer[]>([]);
    const tileLayerRef = useRef<L.TileLayer | null>(null);
    const [isSatellite, setIsSatellite] = useState(false);
    
    // State for creating new waypoint
    const [isCreating, setIsCreating] = useState(false);
    const [tempCoords, setTempCoords] = useState<Coords | null>(null);
    const [newWaypointName, setNewWaypointName] = useState('');

    // Initialize Map Core
    useEffect(() => {
        if (!mapContainerRef.current || mapInstanceRef.current) return;
        
        // Initialize Map
        const map = L.map(mapContainerRef.current, { zoomControl: false }).setView([43.7731, 11.2553], 14);
        mapInstanceRef.current = map;

        // Map Click Listener for adding waypoints
        map.on('click', (e: L.LeafletMouseEvent) => {
            setTempCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
            setNewWaypointName('');
            setIsCreating(true);
        });

        return () => {
            map.remove();
            mapInstanceRef.current = null;
        };
    }, []);

    // Handle Tile Layer Switching
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;

        if (tileLayerRef.current) map.removeLayer(tileLayerRef.current);

        const satelliteUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
        const satelliteAttrib = 'Tiles &copy; Esri';
        const standardUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
        const standardAttrib = '&copy; OpenStreetMap &copy; CARTO';

        const newTileLayer = L.tileLayer(isSatellite ? satelliteUrl : standardUrl, {
            maxZoom: 19,
            attribution: isSatellite ? satelliteAttrib : standardAttrib
        });

        newTileLayer.addTo(map);
        tileLayerRef.current = newTileLayer;
    }, [isSatellite]);

    // Handle Markers (Activities, GPX, Track, User)
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;
        
        // Clear existing layers
        layersRef.current.forEach(layer => layer.remove());
        layersRef.current = [];

        const defaultIcon = L.icon({
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
        });

        // 1. Itinerary Activities
        activities.forEach(act => {
            const marker = L.marker([act.coords.lat, act.coords.lng], { icon: defaultIcon }).addTo(map);
            const navUrl = act.googleMapsUrl || `https://www.google.com/maps/dir/?api=1&destination=${act.coords.lat},${act.coords.lng}`;
            
            const popupContent = `
                <div style="padding: 5px; font-family: sans-serif; max-width: 200px;">
                    <h3 style="margin: 0 0 5px 0; font-weight: bold; color: #1e3a8a; font-size: 14px;">${act.title}</h3>
                    <p style="margin: 0 0 8px 0; font-size: 11px; color: #475569;">${act.description}</p>
                    <a href="${navUrl}" target="_blank" style="display: block; text-align: center; background-color: #1e3a8a; color: white; padding: 6px 0; border-radius: 8px; font-weight: bold; font-size: 10px; text-decoration: none; text-transform: uppercase;">IR AHORA</a>
                </div>
            `;
            marker.bindPopup(popupContent);
            layersRef.current.push(marker);
        });

        // 2. Custom User Waypoints
        userWaypoints.forEach(wp => {
            // Create a custom purple marker for user waypoints
            const userWPIcon = L.divIcon({
                className: 'custom-wp-marker',
                html: `<div style="background-color: #7c3aed; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.3); color: white;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
                iconSize: [24, 24],
                iconAnchor: [12, 24],
                popupAnchor: [0, -28]
            });

            const marker = L.marker([wp.lat, wp.lng], { icon: userWPIcon }).addTo(map);
            
            // Create a popup DOM element to handle click events (delete) properly
            const container = document.createElement('div');
            container.innerHTML = `
                <div style="font-family: sans-serif; min-width: 150px;">
                    <h4 style="margin: 0 0 4px 0; font-weight: bold; color: #5b21b6;">${wp.name}</h4>
                    <p style="margin: 0 0 8px 0; font-size: 10px; color: #6b7280;">Añadido: ${new Date(wp.createdAt).toLocaleTimeString().slice(0,5)}</p>
                    <button id="delete-btn-${wp.id}" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 4px; background-color: #fee2e2; color: #991b1b; border: 1px solid #fecaca; padding: 6px; border-radius: 6px; font-size: 10px; font-weight: bold; cursor: pointer;">
                        ELIMINAR
                    </button>
                </div>
            `;

            // Bind click event for delete button after popup opens
            marker.bindPopup(container).on('popupopen', () => {
                const btn = document.getElementById(`delete-btn-${wp.id}`);
                if (btn) {
                    btn.onclick = () => {
                        onDeleteWaypoint(wp.id);
                        map.closePopup();
                    };
                }
            });

            layersRef.current.push(marker);
        });

        // 3. GPX Waypoints
        GPX_WAYPOINTS.forEach(wpt => {
            const circleMarker = L.circleMarker([wpt.lat, wpt.lng], { 
                radius: 6, fillColor: "#BE123C", color: "#fff", weight: 2, opacity: 1, fillOpacity: 0.8 
            }).addTo(map);
            circleMarker.bindPopup(`<div style="font-size: 12px; font-weight: bold; color: #BE123C;">${wpt.name}</div>`);
            layersRef.current.push(circleMarker);
        });

        // 4. Track Polyline
        if (FLORENCE_TRACK.length > 0) {
            const trackLine = L.polyline(FLORENCE_TRACK, { 
                color: isSatellite ? '#fbbf24' : '#1e3a8a', 
                weight: 4, opacity: 0.8, dashArray: '8, 12' 
            }).addTo(map);
            layersRef.current.push(trackLine);
        }

        // 5. User Location
        if (userLocation) {
            const userIcon = L.divIcon({ 
                className: 'user-marker', 
                html: '<div style="background-color: #3b82f6; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(59,130,246,0.5);"></div>', 
                iconSize: [18, 18] 
            });
            const marker = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon }).addTo(map);
            layersRef.current.push(marker);
        }
    }, [activities, userLocation, isSatellite, userWaypoints, onDeleteWaypoint]); // Dependencies updated

    useEffect(() => { 
        if (mapInstanceRef.current && focusedLocation) {
            mapInstanceRef.current.flyTo([focusedLocation.lat, focusedLocation.lng], 16); 
        }
    }, [focusedLocation]);

    const handleSaveWaypoint = (e: React.FormEvent) => {
        e.preventDefault();
        if (tempCoords && newWaypointName.trim()) {
            onAddWaypoint({
                id: Date.now().toString(),
                name: newWaypointName.trim(),
                lat: tempCoords.lat,
                lng: tempCoords.lng,
                createdAt: Date.now()
            });
            setIsCreating(false);
            setTempCoords(null);
            setNewWaypointName('');
        }
    };

    return (
        <div className="relative w-full h-full">
            <div ref={mapContainerRef} className="w-full h-full z-0" />
            
            {/* Map Type Toggle */}
            <button onClick={() => setIsSatellite(!isSatellite)} className="absolute top-4 right-4 z-[400] bg-white/90 backdrop-blur-sm text-blue-900 p-3 rounded-2xl shadow-lg border border-white/50 active:scale-95 transition-all hover:bg-white">
                <Layers size={24} className={isSatellite ? "text-blue-600" : "text-slate-600"} />
            </button>
            
            {isSatellite && <div className="absolute bottom-6 left-4 z-[400] pointer-events-none"><span className="text-[10px] font-bold text-white/80 bg-black/40 px-2 py-1 rounded backdrop-blur-md">Vista Satélite</span></div>}

            {/* "How to add" Hint */}
            {!isCreating && (
                <div className="absolute top-4 left-4 z-[400] bg-white/90 backdrop-blur-sm px-3 py-2 rounded-xl shadow-md border border-white/50 flex items-center gap-2 pointer-events-none">
                    <MapPin size={14} className="text-violet-600" />
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">Toca el mapa para añadir punto</span>
                </div>
            )}

            {/* Create Waypoint Modal (Bottom Sheet style) */}
            {isCreating && (
                <div className="absolute inset-0 z-[500] bg-black/20 backdrop-blur-[2px] flex items-end">
                    <div className="bg-white w-full rounded-t-[2rem] p-6 shadow-2xl animate-in slide-in-from-bottom duration-300">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-black text-violet-900 uppercase tracking-widest text-sm flex items-center gap-2">
                                <Plus size={18} className="text-violet-500" /> Nuevo Punto
                            </h3>
                            <button onClick={() => setIsCreating(false)} className="bg-slate-100 p-2 rounded-full text-slate-500 hover:bg-slate-200">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveWaypoint}>
                            <div className="mb-4">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Nombre del Lugar</label>
                                <input 
                                    autoFocus
                                    type="text" 
                                    value={newWaypointName}
                                    onChange={(e) => setNewWaypointName(e.target.value)}
                                    placeholder="Ej: Gelateria increíble..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder:font-normal placeholder:text-slate-300"
                                />
                            </div>
                            <button 
                                type="submit" 
                                disabled={!newWaypointName.trim()}
                                className="w-full bg-violet-600 text-white font-black uppercase tracking-widest py-4 rounded-xl shadow-lg shadow-violet-200 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none"
                            >
                                Guardar Marcador
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MapComponent;