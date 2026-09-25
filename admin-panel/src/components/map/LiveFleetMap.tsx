import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useStore } from '../../store/useStore';
import { getSocket } from '../../lib/socket';
import { api } from '../../lib/api';
import { Office, LiveVehicleLocation } from '../../types';

// Fix Leaflet Default Icon path issues
const carSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36" fill="#4f46e5">
  <path d="M19 17h2c.55 0 1-.45 1-1v-3c0-.55-.45-1-1-1h-1V9c0-1.66-1.34-3-3-3H7C5.34 6 4 7.34 4 9v3H3c-.55 0-1 .45-1 1v3c0 .55.45 1 1 1h2c0 1.66 1.34 3 3 3s3-1.34 3-3h4c0 1.66 1.34 3 3 3s3-1.34 3-3zM7.5 18c-.83 0-1.5-.67-1.5-1.5S6.67 15 7.5 15s1.5.67 1.5 1.5S8.33 18 7.5 18zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM6 10c0-.55.45-1 1-1h10c.55 0 1 .45 1 1v2H6v-2z"/>
</svg>`;

const vehicleIcon = L.divIcon({
  className: 'custom-vehicle-marker',
  html: `
    <div class="relative flex items-center justify-center">
      <div class="absolute w-8 h-8 rounded-full bg-indigo-500/30 animate-ping"></div>
      <div class="w-10 h-10 rounded-full bg-slate-900 border-2 border-indigo-500 shadow-xl flex items-center justify-center text-white">
        🚗
      </div>
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

const officeIcon = L.divIcon({
  className: 'custom-office-marker',
  html: `
    <div class="w-8 h-8 rounded-lg bg-emerald-600 border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold">
      🏢
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

// Component to dynamically re-center map if coordinates change
const MapUpdater: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.panTo(center, { animate: true, duration: 1 });
  }, [center, map]);
  return null;
};

interface LiveFleetMapProps {
  height?: string;
  selectedTripId?: string;
}

export const LiveFleetMap: React.FC<LiveFleetMapProps> = ({ height = '550px', selectedTripId }) => {
  const { liveFleet, updateVehicleLocation, setLiveFleet } = useStore();
  const [offices, setOffices] = useState<Office[]>([]);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);

  // Default center: Dhaka HQ
  const [center, setCenter] = useState<[number, number]>([23.8103, 90.4125]);

  useEffect(() => {
    // 1. Fetch Corporate Offices
    api.getOffices().then((res) => {
      if (res.data) setOffices(res.data);
    });

    // 2. Initial fleet coordinates fetch
    api.getFleetLocations().then((res) => {
      if (res.data && res.data.length > 0) {
        setLiveFleet(res.data);
        const first = res.data[0];
        if (first.latitude && first.longitude) {
          setCenter([first.latitude, first.longitude]);
        }
      }
    });

    // 3. Listen to real-time WebSocket vehicle updates
    const socket = getSocket();
    const handleLocationUpdate = (data: LiveVehicleLocation) => {
      updateVehicleLocation(data);
      if (data.latitude && data.longitude) {
        setCenter([data.latitude, data.longitude]);
        setRouteCoordinates((prev) => [...prev, [data.latitude, data.longitude]]);
      }
    };

    socket.on('vehicle:location', handleLocationUpdate);

    return () => {
      socket.off('vehicle:location', handleLocationUpdate);
    };
  }, []);

  const activeVehicles = Object.values(liveFleet);

  return (
    <div className="relative isolate z-0 w-full rounded-xl overflow-hidden border border-slate-800 shadow-2xl" style={{ height }}>
      {/* Map Legend Overlay */}
      <div className="absolute top-4 right-4 z-[1000] glass-panel px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-4 text-xs font-semibold">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-indigo-500 inline-block" />
          <span>Active Vehicles ({activeVehicles.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-emerald-500 inline-block" />
          <span>Offices ({offices.length})</span>
        </div>
      </div>

      <MapContainer
        center={center}
        zoom={11}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <MapUpdater center={center} />

        {/* OpenStreetMap Tile Layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Corporate Office Markers */}
        {offices.map((office) => {
          if (!office.latitude || !office.longitude) return null;
          return (
            <Marker
              key={office.id}
              position={[office.latitude, office.longitude]}
              icon={officeIcon}
            >
              <Popup>
                <div className="p-1">
                  <h4 className="font-bold text-slate-900 text-sm">{office.name}</h4>
                  <span className="inline-block text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded mt-1">
                    {office.type}
                  </span>
                  <p className="text-xs text-slate-600 mt-1">{office.address}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Real-time Moving Vehicle Markers */}
        {activeVehicles.map((vehicle, idx) => {
          if (!vehicle.latitude || !vehicle.longitude) return null;
          return (
            <Marker
              key={vehicle.vehicleId || `v_${idx}`}
              position={[vehicle.latitude, vehicle.longitude]}
              icon={vehicleIcon}
            >
              <Popup>
                <div className="p-2 space-y-1.5 min-w-[200px]">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">
                      {vehicle.vehicleModel || 'Fleet Vehicle'}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">
                      {vehicle.speed || 48} km/h
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">Plate: {vehicle.registrationNo || 'Assigned'}</p>
                  <p className="text-xs text-slate-700">Driver: <strong>{vehicle.driverName || 'Designated Driver'}</strong></p>
                  {vehicle.from && vehicle.to && (
                    <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                      Route: {vehicle.from} &rarr; {vehicle.to}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Dynamic Route Polyline */}
        {routeCoordinates.length > 1 && (
          <Polyline
            positions={routeCoordinates}
            color="#4f46e5"
            weight={4}
            opacity={0.8}
            dashArray="4, 8"
          />
        )}
      </MapContainer>
    </div>
  );
};
