import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Layers, MapPin, Plus, X, Search, Loader2 } from 'lucide-react';
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

interface SearchResult {
    label: string;
    lat: number;
    lng: number;
    type: 'internal' | 'external';
    details?: string;
}

const MapComponent: React.FC<MapComponentProps> = ({ 
    activities, userLocation, focusedLocation, 
    userWaypoints, onAddWaypoint, onDeleteWaypoint 
}) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const layersRef = useRef<L.Layer[]>([]);
    const tileLayerRef = useRef<L.TileLayer | null>(null);
    const searchMarkerRef = useRef<L.Marker | null>(null);

    const [isSatellite, setIsSatellite] = useState(false);
    
    // State for creating new waypoint
    const [isCreating, setIsCreating] = useState(false);
    const [tempCoords, setTempCoords] = useState<Coords | null>(null);
    const [newWaypointName, setNewWaypointName] = useState('');
    const [newWaypointDescription, setNewWaypointDescription] = useState('');

    // State for Search
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);

    // Initialize Map Core
    useEffect(() => {
        if (!mapContainerRef.current || mapInstanceRef.current) return;
        
        // Initialize Map
        const map = L.map(mapContainerRef.current, { zoomControl: false }).setView([43.7731, 11.2553], 14);
        mapInstanceRef.current = map;

        // Map Click Listener for adding waypoints
        map.on('click', (e: L.LeafletMouseEvent) => {
            // Close search results if open
            setShowResults(false);
            
            setTempCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
            setNewWaypointName('');
            setNewWaypointDescription('');
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
        
        // Clear existing layers (except search marker)
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
            const userWPIcon = L.divIcon({
                className: 'custom-wp-marker',
                html: `<div style="background-color: #7c3aed; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.3); color: white;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
                iconSize: [24, 24],
                iconAnchor: [12, 24],
                popupAnchor: [0, -28]
            });

            const marker = L.marker([wp.lat, wp.lng], { icon: userWPIcon }).addTo(map);
            
            const container = document.createElement('div');
            container.innerHTML = `
                <div style="font-family: sans-serif; min-width: 150px;">
                    <h4 style="margin: 0 0 4px 0; font-weight: bold; color: #5b21b6; font-size: 14px;">${wp.name}</h4>
                    ${wp.description ? `<p style="margin: 0 0 8px 0; font-size: 11px; color: #475569; line-height: 1.4;">${wp.description}</p>` : ''}
                    <p style="margin: 0 0 8px 0; font-size: 9px; color: #94a3b8;">Añadido: ${new Date(wp.createdAt).toLocaleTimeString().slice(0,5)}</p>
                    <button id="delete-btn-${wp.id}" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 4px; background-color: #fee2e2; color: #991b1b; border: 1px solid #fecaca; padding: 6px; border-radius: 6px; font-size: 10px; font-weight: bold; cursor: pointer; text-transform: uppercase;">
                        ELIMINAR
                    </button>
                </div>
            `;

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
    }, [activities, userLocation, isSatellite, userWaypoints, onDeleteWaypoint]);

    useEffect(() => { 
        if (mapInstanceRef.current && focusedLocation) {
            mapInstanceRef.current.flyTo([focusedLocation.lat, focusedLocation.lng], 16); 
        }
    }, [focusedLocation]);

    // Search Logic
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchQuery.length < 2) {
                setSearchResults([]);
                return;
            }

            setIsSearching(true);
            const lowerQuery = searchQuery.toLowerCase();
            const results: SearchResult[] = [];

            // 1. Search Internal Activities
            activities.forEach(act => {
                if (act.title.toLowerCase().includes(lowerQuery) || act.locationName.toLowerCase().includes(lowerQuery)) {
                    results.push({
                        label: act.title,
                        lat: act.coords.lat,
                        lng: act.coords.lng,
                        type: 'internal',
                        details: 'Itinerario'
                    });
                }
            });

            // 2. Search GPX Waypoints
            GPX_WAYPOINTS.forEach(wp => {
                if (wp.name.toLowerCase().includes(lowerQuery)) {
                    results.push({
                        label: wp.name,
                        lat: wp.lat,
                        lng: wp.lng,
                        type: 'internal',
                        details: 'Punto de interés'
                    });
                }
            });

            // 3. Search User Waypoints
            userWaypoints.forEach(wp => {
                if (wp.name.toLowerCase().includes(lowerQuery)) {
                    results.push({
                        label: wp.name,
                        lat: wp.lat,
                        lng: wp.lng,
                        type: 'internal',
                        details: 'Mis lugares'
                    });
                }
            });

            // 4. External Search (Nominatim) - Bounded to Tuscany region roughly
            // Viewbox for Tuscany area: 10.0,42.0 to 12.5,44.5
            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&viewbox=10.0,44.5,12.5,42.0&bounded=1&limit=5`);
                if (response.ok) {
                    const data = await response.json();
                    data.forEach((item: any) => {
                        results.push({
                            label: item.display_name.split(',')[0], // Take first part of name
                            lat: parseFloat(item.lat),
                            lng: parseFloat(item.lon),
                            type: 'external',
                            details: item.display_name.split(',').slice(1, 3).join(',') // Short address
                        });
                    });
                }
            } catch (error) {
                console.error("Search error", error);
            }

            setSearchResults(results);
            setShowResults(true);
            setIsSearching(false);
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery, activities, userWaypoints]);

    const handleSelectResult = (result: SearchResult) => {
        if (!mapInstanceRef.current) return;

        // Clear previous search marker
        if (searchMarkerRef.current) {
            searchMarkerRef.current.remove();
        }

        // Add new search marker (Orange for search results)
        const searchIcon = L.divIcon({
            className: 'search-marker',
            html: `<div style="background-color: #f97316; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.3); color: white;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 24],
            popupAnchor: [0, -28]
        });

        const marker = L.marker([result.lat, result.lng], { icon: searchIcon }).addTo(mapInstanceRef.current);
        marker.bindPopup(`<div style="font-weight:bold; color:#c2410c">${result.label}</div>`).openPopup();
        searchMarkerRef.current = marker;

        // Fly to location
        mapInstanceRef.current.flyTo([result.lat, result.lng], 16);
        
        // UI Cleanup
        setShowResults(false);
        setSearchQuery(result.label);
    };

    const handleSaveWaypoint = (e: React.FormEvent) => {
        e.preventDefault();
        if (tempCoords && newWaypointName.trim()) {
            onAddWaypoint({
                id: Date.now().toString(),
                name: newWaypointName.trim(),
                lat: tempCoords.lat,
                lng: tempCoords.lng,
                description: newWaypointDescription.trim(),
                createdAt: Date.now()
            });
            setIsCreating(false);
            setTempCoords(null);
            setNewWaypointName('');
            setNewWaypointDescription('');
        }
    };

    return (
        <div className="relative w-full h-full">
            <div ref={mapContainerRef} className="w-full h-full z-0" />
            
            {/* Search Bar Overlay */}
            <div className="absolute top-4 left-4 right-16 z-[400]">
                <div className="relative shadow-lg rounded-xl">
                    <div className="bg-white rounded-xl flex items-center border border-slate-200">
                        <div className="pl-3 text-slate-400">
                            {isSearching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                        </div>
                        <input 
                            type="text" 
                            className="w-full bg-transparent p-3 text-sm font-bold text-slate-800 focus:outline-none placeholder:font-normal placeholder:text-slate-400"
                            placeholder="Buscar en Florencia / Livorno..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => { if(searchResults.length > 0) setShowResults(true); }}
                        />
                        {searchQuery && (
                            <button onClick={() => { setSearchQuery(''); setSearchResults([]); }} className="p-3 text-slate-400 hover:text-slate-600">
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    {/* Search Results Dropdown */}
                    {showResults && searchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden max-h-60 overflow-y-auto">
                            {searchResults.map((result, idx) => (
                                <button 
                                    key={idx}
                                    onClick={() => handleSelectResult(result)}
                                    className="w-full text-left p-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors flex items-center gap-3"
                                >
                                    <div className={`p-2 rounded-full ${result.type === 'internal' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-500'}`}>
                                        <MapPin size={14} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-slate-800 leading-tight">{result.label}</p>
                                        <p className="text-[10px] text-slate-400 truncate max-w-[200px]">{result.details}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Map Type Toggle */}
            <button onClick={() => setIsSatellite(!isSatellite)} className="absolute top-4 right-4 z-[400] bg-white/90 backdrop-blur-sm text-blue-900 p-3 rounded-2xl shadow-lg border border-white/50 active:scale-95 transition-all hover:bg-white">
                <Layers size={24} className={isSatellite ? "text-blue-600" : "text-slate-600"} />
            </button>
            
            {isSatellite && <div className="absolute bottom-6 left-4 z-[400] pointer-events-none"><span className="text-[10px] font-bold text-white/80 bg-black/40 px-2 py-1 rounded backdrop-blur-md">Vista Satélite</span></div>}

            {/* "How to add" Hint (Only show when not creating and not searching) */}
            {!isCreating && !showResults && (
                <div className="absolute top-20 left-4 z-[400] bg-white/90 backdrop-blur-sm px-3 py-2 rounded-xl shadow-md border border-white/50 flex items-center gap-2 pointer-events-none animate-in fade-in duration-500">
                    <MapPin size={14} className="text-violet-600" />
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">Toca mapa para añadir</span>
                </div>
            )}

            {/* Create Waypoint Modal (Bottom Sheet style) */}
            {isCreating && (
                <div className="absolute inset-0 z-[500] bg-black/40 backdrop-blur-[2px] flex items-end">
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
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder:font-normal placeholder:text-slate-300 mb-4"
                                />
                                
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Descripción (Opcional)</label>
                                <textarea 
                                    value={newWaypointDescription}
                                    onChange={(e) => setNewWaypointDescription(e.target.value)}
                                    placeholder="Notas sobre el lugar..."
                                    rows={2}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder:font-normal placeholder:text-slate-300 resize-none"
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