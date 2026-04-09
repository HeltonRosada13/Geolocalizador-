'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ATM } from '@/app/page';
import { useEffect, useState } from 'react';
import { Clock, Navigation } from 'lucide-react';

// Fix for default marker icons in Leaflet with Next.js
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

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
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
}

interface MapViewProps {
  atms: ATM[];
  onSelectATM: (atm: ATM) => void;
  userLocation: [number, number] | null;
  selectedATM?: ATM | null;
  showRoute?: boolean;
  height?: string;
}

function RoutingLayer({ userLocation, destination }: { userLocation: [number, number], destination: ATM }) {
  const [route, setRoute] = useState<[number, number][]>([]);
  const [eta, setEta] = useState<number | null>(null);
  const map = useMap();

  useEffect(() => {
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
          const bounds = L.latLngBounds(coordinates);
          map.fitBounds(bounds, { padding: [50, 50] });
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

export default function MapView({ atms, onSelectATM, userLocation, selectedATM, showRoute, height = "h-[calc(100vh-250px)]" }: MapViewProps) {
  const defaultCenter: [number, number] = [-8.8383, 13.2344]; // Luanda
  const center = userLocation || defaultCenter;

  const getIcon = (status: ATM['status']) => {
    if (status === 'disponivel') return MoneyIcon;
    if (status === 'sem_dinheiro') return NoMoneyIcon;
    return WarningIcon;
  };

  return (
    <div className={`${height} w-full rounded-3xl overflow-hidden shadow-inner border border-gray-100`}>
      <MapContainer 
        center={center} 
        zoom={14} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <ChangeView center={center} />

        {userLocation && selectedATM && showRoute && (
          <RoutingLayer userLocation={userLocation} destination={selectedATM} />
        )}

        {userLocation && (
          <Marker position={userLocation} icon={L.divIcon({
            className: 'user-loc',
            html: `<div style="background-color: #3b82f6; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 15px #3b82f6;"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          })}>
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
