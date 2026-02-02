import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Coords, ItineraryItem } from '../types';
import { GPX_WAYPOINTS, FLORENCE_TRACK } from '../constants';

interface MapComponentProps {
    activities: ItineraryItem[];
    userLocation: Coords | null;
    focusedLocation: Coords | null;
}

const MapComponent: React.FC<MapComponentProps> = ({ activities, userLocation, focusedLocation }) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const layersRef = useRef<L.Layer[]>([]);

    useEffect(() => {
        if (!mapContainerRef.current || mapInstanceRef.current) return;
        
        // Initialize Map
        const map = L.map(mapContainerRef.current, { zoomControl: false }).setView([43.7731, 11.2553], 14);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { 
            maxZoom: 18, 
            attribution: '&copy; OpenStreetMap' 
        }).addTo(map);
        
        mapInstanceRef.current = map;

        return () => {
            map.remove();
            mapInstanceRef.current = null;
        };
    }, []);

    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;
        
        // Clear existing layers
        layersRef.current.forEach(layer => layer.remove());
        layersRef.current = [];

        // Fix Leaflet icons
        const defaultIcon = L.icon({
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
        });

        // Add Activity Markers
        activities.forEach(act => {
            const marker = L.marker([act.coords.lat, act.coords.lng], { icon: defaultIcon }).addTo(map);
            
            const navUrl = act.googleMapsUrl || `https://www.google.com/maps/dir/?api=1&destination=${act.coords.lat},${act.coords.lng}`;
            
            const popupContent = `
                <div style="padding: 5px; font-family: 'Roboto Condensed', sans-serif; max-width: 200px;">
                    <h3 style="margin: 0 0 5px 0; font-weight: bold; color: #1e3a8a; font-size: 14px;">${act.title}</h3>
                    <p style="margin: 0 0 8px 0; font-size: 11px; color: #475569; line-height: 1.3;">${act.description}</p>
                    <a href="${navUrl}" target="_blank" rel="noopener noreferrer" 
                       style="display: block; width: 100%; text-align: center; background-color: #1e3a8a; color: white; padding: 6px 0; border-radius: 8px; font-weight: bold; font-size: 10px; text-decoration: none; text-transform: uppercase; letter-spacing: 0.5px;">
                       IR AHORA
                    </a>
                </div>
            `;
            
            marker.bindPopup(popupContent);
            layersRef.current.push(marker);
        });

        // Add GPX Waypoints
        GPX_WAYPOINTS.forEach(wpt => {
            const circleMarker = L.circleMarker([wpt.lat, wpt.lng], { 
                radius: 6, 
                fillColor: "#BE123C", 
                color: "#fff", 
                weight: 2, 
                opacity: 1, 
                fillOpacity: 0.8 
            }).addTo(map);
            circleMarker.bindPopup(`<div style="font-size: 12px; font-weight: bold; color: #BE123C;">${wpt.name}</div>`);
            layersRef.current.push(circleMarker);
        });

        // Add Track Polyline
        if (FLORENCE_TRACK.length > 0) {
            const trackLine = L.polyline(FLORENCE_TRACK, { 
                color: '#1e3a8a', 
                weight: 4, 
                opacity: 0.7, 
                dashArray: '8, 12' 
            }).addTo(map);
            layersRef.current.push(trackLine);
        }

        // Add User Location
        if (userLocation) {
            const userIcon = L.divIcon({ 
                className: 'user-marker', 
                html: '<div style="background-color: #3b82f6; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(59,130,246,0.5);"></div>', 
                iconSize: [18, 18] 
            });
            const marker = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon }).addTo(map);
            layersRef.current.push(marker);
        }
    }, [activities, userLocation]);

    useEffect(() => { 
        if (mapInstanceRef.current && focusedLocation) {
            mapInstanceRef.current.flyTo([focusedLocation.lat, focusedLocation.lng], 16); 
        }
    }, [focusedLocation]);

    return <div ref={mapContainerRef} className="w-full h-full z-0" />;
};

export default MapComponent;