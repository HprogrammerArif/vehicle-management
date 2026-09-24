import React, { useState, useEffect } from 'react';
import { LiveFleetMap } from '../components/map/LiveFleetMap';
import { useStore } from '../store/useStore';
import { api } from '../lib/api';
import { Play, Radio, Navigation, Gauge, RefreshCw, Car } from 'lucide-react';

export const LiveTrackingPage: React.FC = () => {
  const { liveFleet, isSimulating, setIsSimulating } = useStore();
  const [activeTrips, setActiveTrips] = useState<any[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const [simStatus, setSimStatus] = useState<string>('');

  useEffect(() => {
    api.getTrips('?status=IN_PROGRESS').then((res) => {
      if (res.data && res.data.length > 0) {
        setActiveTrips(res.data);
        setSelectedTripId(res.data[0].id);
      }
    });
  }, []);

  const handleStartSimulation = async () => {
    if (!selectedTripId && activeTrips.length === 0) {
      // Fetch any trip or active trip
      const allTrips = await api.getTrips();
      if (allTrips.data && allTrips.data.length > 0) {
        setSelectedTripId(allTrips.data[0].id);
      }
    }

    const tripId = selectedTripId || activeTrips[0]?.id;
    if (!tripId) {
      setSimStatus('No active trip available to simulate.');
      return;
    }

    setIsSimulating(true);
    setSimStatus('Streaming GPS coordinates every 1.5s via WebSockets...');
    const res = await api.simulateTrip(tripId);
    if (!res.success) {
      setSimStatus(res.message || 'Simulation error');
    }
  };

  const fleetList = Object.values(liveFleet);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-extrabold text-2xl text-white tracking-tight flex items-center gap-3">
            <Radio className="w-6 h-6 text-indigo-400 animate-pulse" />
            <span>Mission Telemetry & Live GPS Tracker</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Real-time vehicle movement over OpenStreetMap with WebSocket breadcrumbs.
          </p>
        </div>

        {/* Live Simulation Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleStartSimulation}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition active:scale-95"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Simulate Live Movement</span>
          </button>
        </div>
      </div>

      {simStatus && (
        <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
          <span>{simStatus}</span>
        </div>
      )}

      {/* Main Grid: Map & Active Vehicles Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Map Container */}
        <div className="lg:col-span-3">
          <LiveFleetMap height="600px" selectedTripId={selectedTripId} />
        </div>

        {/* Live Vehicles Telemetry Panel */}
        <div className="space-y-4">
          <div className="glass-card p-4 rounded-xl border border-slate-800">
            <h3 className="font-display font-bold text-sm text-white flex items-center gap-2">
              <Car className="w-4 h-4 text-indigo-400" />
              <span>Active Vehicles ({fleetList.length})</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Streaming telemetry updates</p>

            <div className="mt-4 space-y-3">
              {fleetList.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg">
                  Click "Simulate Live Movement" above to see the car moving on the map!
                </div>
              ) : (
                fleetList.map((vehicle, idx) => (
                  <div
                    key={vehicle.vehicleId || idx}
                    className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/60 space-y-2 hover:border-indigo-500/50 transition cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">{vehicle.vehicleModel || 'Vehicle'}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <Gauge className="w-3 h-3" />
                        <span>{vehicle.speed || 45} km/h</span>
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400">
                      Plate: <span className="text-slate-200 font-mono">{vehicle.registrationNo || 'Fleet Car'}</span>
                    </div>

                    <div className="text-[11px] text-slate-400">
                      Driver: <span className="text-indigo-300 font-medium">{vehicle.driverName || 'Driver'}</span>
                    </div>

                    <div className="pt-2 border-t border-slate-700/40 flex items-center justify-between text-[10px] text-slate-400">
                      <span>Lat: {vehicle.latitude?.toFixed(4)}</span>
                      <span>Lng: {vehicle.longitude?.toFixed(4)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
