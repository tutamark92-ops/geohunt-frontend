/**
 * Map Component — renders the interactive Leaflet map with treasure markers
 * and the user's live GPS location.
 * 
 * Features:
 *   - Treasure markers: green (unlocked), blue (nearby), grey (locked)
 *   - User location: blue pulsing dot with accuracy circle
 *   - Auto-follow mode: keeps the map centered on the user
 *   - Map style picker: streets vs satellite tiles
 *   - Distance indicator: shows proximity to nearest treasure
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Treasure } from '../types';
import { Target, Navigation, Map, Layers, Satellite } from 'lucide-react';

/** Props for the MapComponent */
interface MapComponentProps {
  treasures: Treasure[];
  unlockedIds: string[];
  onTreasureClick: (treasure: Treasure) => void;
  userLocation: GeolocationCoordinates | null;
}

declare const L: any;

/** Available map tile styles */
type MapStyle = 'streets' | 'satellite';

/** Tile provider URLs for each map style */
const MAP_TILES: Record<MapStyle, { url: string; attribution?: string }> = {
  streets: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
  }
};

export const MapComponent: React.FC<MapComponentProps> = ({ 
  treasures, 
  unlockedIds, 
  onTreasureClick,
  userLocation,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarker = useRef<any>(null);
  const userAccuracyCircle = useRef<any>(null);
  const [mapStyle, setMapStyle] = useState<MapStyle>('streets');
  const [showStylePicker, setShowStylePicker] = useState(false);
  const [autoFollow, setAutoFollow] = useState(true);
  const [isMapReady, setIsMapReady] = useState(false);
  const hasInitialLocation = useRef(false);

  /** Memoized user position as a [lat, lng] tuple for Leaflet compatibility */
  const userPos = useMemo(() => {
    if (!userLocation) return null;
    return [userLocation.latitude, userLocation.longitude] as [number, number];
  }, [userLocation]);

  /**
   * Calculate the distance between two GPS coordinates using the Haversine formula.
   * @param {number} lat1 - Latitude of point A
   * @param {number} lon1 - Longitude of point A
   * @param {number} lat2 - Latitude of point B
   * @param {number} lon2 - Longitude of point B
   * @returns {number} Distance in meters
   */
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  /** Find the nearest locked treasure and its distance from the user */
  const nearestTreasure = useMemo(() => {
    if (!userPos) return null;
    const unlockedTreasures = treasures.filter(t => !unlockedIds.includes(t.id));
    if (unlockedTreasures.length === 0) return null;
    
    let nearest = unlockedTreasures[0];
    let minDist = calculateDistance(userPos[0], userPos[1], nearest.latitude, nearest.longitude);
    
    unlockedTreasures.forEach(t => {
      const dist = calculateDistance(userPos[0], userPos[1], t.latitude, t.longitude);
      if (dist < minDist) {
        minDist = dist;
        nearest = t;
      }
    });
    
    return { treasure: nearest, distance: minDist };
  }, [userPos, treasures, unlockedIds]);

  /**
   * Format a distance in meters to a human-friendly string.
   * @param {number} meters - Distance in meters
   * @returns {string} Formatted distance (e.g., "Very close!", "150m", "1.2km")
   */
  const formatDistance = (meters: number) => {
    if (meters < 50) return 'Very close!';
    if (meters < 100) return `${Math.round(meters)}m away`;
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  /** Initialize the Leaflet map on first render — starts at zoom 3 (world view) */
  useEffect(() => {
    if (!mapRef.current) return;

    try {
      leafletMap.current = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView([51.5074, -0.1278], 14);

      tileLayerRef.current = L.tileLayer(MAP_TILES[mapStyle].url, {
        maxZoom: 20
      }).addTo(leafletMap.current);

      // Small delay to ensure map container is fully ready
      setTimeout(() => {
        setIsMapReady(true);
        updateMarkers();
        // Fit bounds to show all treasures on initial load
        if (treasures.length > 0) {
          const bounds = L.latLngBounds(treasures.map((t: Treasure) => [t.latitude, t.longitude]));
          leafletMap.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
        }
      }, 100);
    } catch (e) {
      console.error('Map initialization error:', e);
    }

    return () => {
      setIsMapReady(false);
      if (leafletMap.current) leafletMap.current.remove();
    };
  }, []);

  /** Swap the tile layer when the user switches between streets and satellite view */
  useEffect(() => {
    if (leafletMap.current && tileLayerRef.current) {
      tileLayerRef.current.remove();
      tileLayerRef.current = L.tileLayer(MAP_TILES[mapStyle].url, {
        maxZoom: 20
      }).addTo(leafletMap.current);
    }
  }, [mapStyle]);

  /** Handle GPS position updates — adds/moves the blue dot and accuracy circle */
  useEffect(() => {
    if (!leafletMap.current || !userPos) return;

    const [latitude, longitude] = userPos;
    const accuracy = userLocation?.accuracy || 0;

    // Accuracy Circle
    if (!userAccuracyCircle.current) {
      userAccuracyCircle.current = L.circle([latitude, longitude], {
        radius: accuracy,
        color: '#1cb0f6',
        fillColor: '#1cb0f6',
        fillOpacity: 0.1,
        weight: 1,
        className: 'accuracy-circle'
      }).addTo(leafletMap.current);
    } else {
      userAccuracyCircle.current.setLatLng([latitude, longitude]);
      userAccuracyCircle.current.setRadius(accuracy);
    }

    // User Marker (Pulse)
    if (!userMarker.current) {
      const pulseHtml = `
        <div class="user-pulse-container">
          <div class="user-pulse-ring"></div>
          <div class="user-pulse-center"></div>
        </div>
      `;
      const pulseIcon = L.divIcon({
        html: pulseHtml,
        className: 'user-location-icon',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      userMarker.current = L.marker([latitude, longitude], {
        icon: pulseIcon,
        zIndexOffset: 1000
      }).addTo(leafletMap.current);
    } else {
      userMarker.current.setLatLng([latitude, longitude]);
    }

    if (autoFollow) {
      if (!hasInitialLocation.current) {
        // First location fix — fly to user with animation
        hasInitialLocation.current = true;
        leafletMap.current.flyTo([latitude, longitude], 17, { duration: 1.5 });
      } else {
        leafletMap.current.panTo([latitude, longitude]);
      }
    }

    updateMarkers();
  }, [userPos, userLocation?.accuracy, autoFollow]);

  useEffect(() => {
    updateMarkers();
  }, [treasures, unlockedIds, userPos]);

  /** Clear and re-render all treasure markers with current state (unlocked/nearby/locked) */
  const updateMarkers = () => {
    if (!leafletMap.current) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    treasures.forEach(t => {
      const isUnlocked = unlockedIds.includes(t.id);
      let nearby = false;
      if (userPos && userPos.length >= 2) {
        nearby = calculateDistance(userPos[0], userPos[1], t.latitude, t.longitude) < 50;
      }

      // Color: green = unlocked, blue = nearby, amber = locked
      const bgColor = isUnlocked ? '#58cc02' : nearby ? '#1cb0f6' : '#ff9600';
      const shadowColor = isUnlocked ? '#46a302' : nearby ? '#1899d6' : '#e08600';
      const pulseClass = (nearby && !isUnlocked) ? 'treasure-marker-pulse' : '';

      // SVG icons — map pin for locked, checkmark for unlocked
      const pinSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;
      const checkSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

      const markerHtml = `
        <div class="treasure-marker ${pulseClass}" style="
          background: ${bgColor};
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 0 ${shadowColor}, 0 6px 16px rgba(0,0,0,0.25);
          border: 3px solid white;
          cursor: pointer;
          transition: transform 0.2s;
          position: relative;
        ">
          ${isUnlocked ? checkSvg : pinSvg}
          ${!isUnlocked ? `<div style="
            position: absolute;
            top: -6px;
            right: -6px;
            background: white;
            border-radius: 50%;
            width: 18px;
            height: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: 900;
            color: ${bgColor};
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          ">${t.points}</div>` : ''}
        </div>
      `;

      const icon = L.divIcon({
        html: markerHtml,
        className: 'treasure-marker-icon',
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });

      const marker = L.marker([t.latitude, t.longitude], {
        icon,
        zIndexOffset: isUnlocked ? 100 : nearby ? 500 : 200
      }).addTo(leafletMap.current);

      // Tooltip with treasure name on hover
      marker.bindTooltip(t.name, {
        permanent: false,
        direction: 'top',
        offset: [0, -24],
        className: 'treasure-tooltip'
      });

      marker.on('click', () => onTreasureClick(t));
      markersRef.current.push(marker);
    });
  };

  /** Center the map on the user's current position and enable auto-follow */
  const centerOnUser = () => {
    if (userPos && leafletMap.current) {
      setAutoFollow(true);
      leafletMap.current.setView(userPos, 18);
    }
  };

  const styleIcons: Record<MapStyle, React.ReactNode> = {
    streets: <Map className="w-5 h-5" />,
    satellite: <Satellite className="w-5 h-5" />
  };

  return (
    <div className="relative w-full h-[60vh] sm:h-[70vh]">
      <div ref={mapRef} id="map" className="h-full w-full" />
      
      {/* Live Feedback Banner */}
      <div className="absolute top-4 left-4 right-4 z-[400] flex items-center justify-between gap-2">
        <div className="bg-white px-4 py-2.5 rounded-xl border-2 border-slate-100 flex items-center gap-3 shadow-md">
          <div className={`w-2.5 h-2.5 rounded-full ${userLocation ? 'bg-[#58cc02] animate-pulse' : 'bg-slate-300'}`}></div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 block">
              Live Tracking
            </span>
            {nearestTreasure && (
              <span className="text-[9px] font-bold text-[#1cb0f6]">
                → {nearestTreasure.treasure.name}: {formatDistance(nearestTreasure.distance)}
              </span>
            )}
          </div>
        </div>
        
        {/* Map style toggle and auto-follow */}
        <div className="flex gap-2">
          {/* Auto Follow Toggle */}
          <button
            onClick={() => setAutoFollow(!autoFollow)}
            className={`p-3 rounded-xl border-2 shadow-md transition-all ${
              autoFollow ? 'bg-[var(--duo-blue)] border-[var(--duo-blue)] text-white' : 'bg-white border-slate-100 text-slate-600'
            }`}
          >
            <Target className="w-5 h-5" />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowStylePicker(!showStylePicker)}
              className="bg-white p-3 rounded-xl border-2 border-slate-100 shadow-md hover:bg-slate-50 transition-all"
            >
              <Layers className="w-5 h-5 text-slate-600" />
            </button>
            
            {showStylePicker && (
              <div className="absolute top-full right-0 mt-2 bg-white rounded-xl border-2 border-slate-100 shadow-lg overflow-hidden">
                {(['streets', 'satellite'] as MapStyle[]).map(style => (
                  <button
                    key={style}
                    onClick={() => { setMapStyle(style); setShowStylePicker(false); }}
                    className={`w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-50 transition-all ${
                      mapStyle === style ? 'bg-[#1cb0f6]/10 text-[#1cb0f6]' : 'text-slate-600'
                    }`}
                  >
                    {styleIcons[style]}
                    <span className="text-xs font-black uppercase tracking-wide capitalize">{style}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Center on Me Button */}
      <button 
        onClick={centerOnUser}
        disabled={!userPos}
        className={`absolute bottom-8 right-4 p-4 rounded-xl shadow-lg border-b-4 z-[400] active:border-b-0 active:translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
          autoFollow ? 'bg-[var(--duo-green)] border-[var(--duo-green-dark)]' : 'bg-[#1cb0f6] border-[#1899d6]'
        }`}
      >
        <Navigation className="w-6 h-6 text-white" />
      </button>

      {/* Distance indicator when near a treasure */}
      {nearestTreasure && nearestTreasure.distance < 100 && (
        <div className="absolute bottom-8 left-4 right-24 z-[400]">
          <div className={`px-4 py-3 rounded-xl shadow-lg ${
            nearestTreasure.distance < 50 
              ? 'bg-[#58cc02] text-white border-b-4 border-[#4caf00]' 
              : 'bg-white text-slate-800 border-2 border-slate-100'
          }`}>
            <p className="text-xs font-black uppercase tracking-wide">
              {nearestTreasure.distance < 50 ? '🎯 Ready to scan!' : `Getting closer to ${nearestTreasure.treasure.name}...`}
            </p>
            <p className={`text-[10px] font-bold ${nearestTreasure.distance < 50 ? 'text-white/80' : 'text-slate-500'}`}>
              {formatDistance(nearestTreasure.distance)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
