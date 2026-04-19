'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ATM } from '@/lib/types';
import { useEffect, useState, useMemo } from 'react';
import { Clock, Navigation } from 'lucide-react';

// Fix for default marker icons in Leaflet with Next.js
// We do this only once
if (typeof window !== 'undefined') {
  const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  });
  L.Marker.prototype.options.icon = DefaultIcon;
}

const MoneyIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #22c55e; width: 18px; height: 18px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.2);"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const NoMoneyIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #6b7280; width: 18px; height: 18px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.2);"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const WarningIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #f97316; width: 18px; height: 18px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.2);"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  const [lastCenter, setLastCenter] = useState<[number, number] | null>(null);
  const [isUserInteracting, setIsUserInteracting] = useState(false);

  useEffect(() => {
    if (!map) return;
    
    const onInteractionStart = () => setIsUserInteracting(true);
    const onInteractionEnd = () => {
      // Small delay to resume auto-centering after interaction
      setTimeout(() => setIsUserInteracting(false), 3000);
    };

    map.on('dragstart', onInteractionStart);
    map.on('zoomstart', onInteractionStart);
    map.on('dragend', onInteractionEnd);
    map.on('zoomend', onInteractionEnd);

    return () => {
      map.off('dragstart', onInteractionStart);
      map.off('zoomstart', onInteractionStart);
      map.off('dragend', onInteractionEnd);
      map.off('zoomend', onInteractionEnd);
    };
  }, [map]);

  useEffect(() => {
    if (!center || isUserInteracting || !map) return;

    // Helper to calculate distance in meters
    const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371e3;
      const φ1 = lat1 * Math.PI / 180;
      const φ2 = lat2 * Math.PI / 180;
      const Δφ = (lat2 - lat1) * Math.PI / 180;
      const Δλ = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    try {
      if (!lastCenter) {
        map.setView(center);
        setLastCenter(center);
      } else {
        const distance = getDistance(lastCenter[0], lastCenter[1], center[0], center[1]);
        // Only re-center if moved more than 25 meters to avoid "shaking" on mobile
        if (distance > 25) {
          map.panTo(center, { animate: true, duration: 1.5 });
          setLastCenter(center);
        }
      }
    } catch (e) {
      console.warn("Map view update failed:", e);
    }
  }, [center[0], center[1], map, isUserInteracting]);
  return null;
}

interface MapViewProps {
  atms: ATM[];
  onSelectATM: (atm: ATM) => void;
  userLocation: [number, number] | null;
  userHeading?: number | null;
  selectedATM?: ATM | null;
  showRoute?: boolean;
  height?: string;
}

function RoutingLayer({ userLocation, destination }: { userLocation: [number, number], destination: ATM }) {
  const [route, setRoute] = useState<[number, number][]>([]);
  const [eta, setEta] = useState<number | null>(null);
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const fetchRoute = async () => {
      try {
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${userLocation[1]},${userLocation[0]};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson`
        );
        const data = await response.json();
        if (data.routes && data.routes.length > 0) {
          const coordinates = data.routes[0].geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]);
          setRoute(coordinates);
          setEta(Math.round(data.routes[0].duration / 60));
          
          // Fit bounds to show the whole route
          if (map) {
            const bounds = L.latLngBounds(coordinates);
            map.fitBounds(bounds, { padding: [50, 50] });
          }
        }
      } catch (error) {
        console.error("Error fetching route:", error);
      }
    };

    fetchRoute();
  }, [userLocation, destination, map]);

  if (route.length === 0) return null;

  return (
    <>
      <Polyline positions={route} color="#3b82f6" weight={5} opacity={0.7} dashArray="10, 10" />
      {eta !== null && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000]">
          <div className="bg-white/90 backdrop-blur-lg px-4 py-2 rounded-2xl shadow-xl border border-blue-100 flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="bg-blue-100 p-1.5 rounded-lg">
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Tempo Estimado</span>
              <span className="text-sm font-black text-gray-900">{eta} min para chegar</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function MapView({ atms, onSelectATM, userLocation, userHeading, selectedATM, showRoute, height = "h-[calc(100vh-250px)]" }: MapViewProps) {
  const defaultCenter: [number, number] = [-8.8383, 13.2344]; // Luanda
  const [smoothedLoc, setSmoothedLoc] = useState<[number, number] | null>(userLocation);
  const [smoothedHeading, setSmoothedHeading] = useState<number>(userHeading || 0);

  // Smoothing logic for GPS jitter
  useEffect(() => {
    if (!userLocation) return;
    
    setSmoothedLoc(prev => {
      if (!prev) return userLocation;

      const [lat1, lon1] = prev;
      const [lat2, lon2] = userLocation;
      
      // Distance check
      const R = 6371e3;
      const φ1 = lat1 * Math.PI / 180;
      const φ2 = lat2 * Math.PI / 180;
      const Δφ = (lat2 - lat1) * Math.PI / 180;
      const Δλ = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distanceEncountered = R * c;

      // Ignore very small movements (less than 2.0 meters) to stop "flickering"
      if (distanceEncountered < 2.0) return prev;

      // Anti-drift: If the jump is massive (> 500m) suddenly, it's likely a GPS glitch
      if (distanceEncountered > 500) {
        console.warn("Massive GPS jump detected, ignoring to prevent drifting.");
        return prev;
      }

      // Dynamic smoothing: 
      // Small distance = very smooth (slow follow)
      // Medium distance = normal follow
      // Large distance = snap faster to prevent being left behind
      let alpha = 0.2;
      if (distanceEncountered > 30) alpha = 0.5;
      if (distanceEncountered > 100) alpha = 0.8;
      
      return [
        lat1 + alpha * (lat2 - lat1),
        lon1 + alpha * (lon2 - lon1)
      ];
    });
  }, [userLocation]);

  // Smoothing for Compass Heading
  useEffect(() => {
    if (userHeading === undefined || userHeading === null) return;
    
    setSmoothedHeading(prev => {
      // Handle degree wrap-around (360 -> 0)
      let diff = userHeading - prev;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      
      // Dynamic alpha: more reactive for larger turns, smoother for small jitters
      let alpha = Math.abs(diff) > 20 ? 0.4 : 0.15;
      
      return (prev + alpha * diff + 360) % 360;
    });
  }, [userHeading]);

  const center = smoothedLoc || defaultCenter;

  const getIcon = (status: ATM['status']) => {
    if (status === 'disponivel') return MoneyIcon;
    if (status === 'sem_dinheiro') return NoMoneyIcon;
    return WarningIcon;
  };

  const userIcon = useMemo(() => L.divIcon({
    className: 'user-loc-arrow',
    html: `
      <div style="
        width: 38px; 
        height: 38px; 
        display: flex; 
        align-items: center; 
        justify-content: center;
        transform: rotate(${smoothedHeading}deg);
        transition: transform 0.4s ease-out;
      ">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3))">
          <path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z" fill="#3b82f6" stroke="white" stroke-width="2" stroke-linejoin="round"/>
        </svg>
        <div style="
          position: absolute;
          width: 14px;
          height: 14px;
          background: #3b82f6;
          border: 2px solid white;
          border-radius: 50%;
          z-index: -1;
          box-shadow: 0 0 15px rgba(59, 130, 246, 0.8), 0 0 30px rgba(59, 130, 246, 0.4);
          animation: user-pulse 2s infinite;
        "></div>
      </div>
      <style>
        @keyframes user-pulse {
          0% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.5); opacity: 0.2; }
          100% { transform: scale(1); opacity: 0.8; }
        }
      </style>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  }), [smoothedHeading]);

  return (
    <div className={`${height} w-full rounded-3xl overflow-hidden shadow-inner border border-gray-100`}>
      <MapContainer 
        center={center} 
        zoom={14} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        key={atms.length > 0 ? 'map-with-data' : 'map-empty'}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <ChangeView center={center} />

        {smoothedLoc && selectedATM && showRoute && (
          <RoutingLayer userLocation={smoothedLoc} destination={selectedATM} />
        )}

        {smoothedLoc && (
          <Marker position={smoothedLoc} icon={userIcon}>
            <Popup>Você está aqui</Popup>
          </Marker>
        )}

        {atms.map((atm) => (
          <Marker 
            key={atm.id} 
            position={[atm.latitude, atm.longitude]}
            icon={getIcon(atm.status)}
            eventHandlers={{
              click: () => onSelectATM(atm),
            }}
          >
            <Popup>
              <div className="p-1">
                <h3 className="font-bold text-sm">{atm.bankName}</h3>
                <p className="text-xs text-gray-500">{atm.locationName}</p>
                <button 
                  onClick={() => onSelectATM(atm)}
                  className="mt-2 w-full bg-blue-600 text-white text-[10px] py-1 rounded font-bold uppercase"
                >
                  Ver Detalhes
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
