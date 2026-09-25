import React, { useState, useEffect } from 'react';
import { Trip, Vehicle, Driver } from '../../types';
import { api } from '../../lib/api';
import { X, CheckCircle, Truck, User, Calendar, MapPin } from 'lucide-react';

interface AssignTripModalProps {
  trip: Trip;
  onClose: () => void;
  onSuccess: () => void;
}

export const AssignTripModal: React.FC<AssignTripModalProps> = ({ trip, onClose, onSuccess }) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch available assets
    Promise.all([api.getAvailableVehicles(), api.getAvailableDrivers()]).then(
      ([vehRes, drvRes]) => {
        if (vehRes.data) {
          setVehicles(vehRes.data);
          if (vehRes.data.length > 0) setSelectedVehicleId(vehRes.data[0].id);
        }
        if (drvRes.data) {
          setDrivers(drvRes.data);
          if (drvRes.data.length > 0) setSelectedDriverId(drvRes.data[0].id);
        }
      }
    );
  }, []);

  const handleApprove = async () => {
    if (!selectedVehicleId || !selectedDriverId) {
      setError('Please select both a vehicle and an available driver.');
      return;
    }

    setLoading(true);
    setError('');

    const res = await api.approveTrip(trip.id, {
      vehicleId: selectedVehicleId,
      driverId: selectedDriverId,
      adminNotes,
    });

    setLoading(false);
    if (res.success) {
      onSuccess();
    } else {
      setError(res.message || 'Failed to approve trip');
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold">
              ✓
            </div>
            <div>
              <h3 className="font-display font-bold text-white text-base">Approve & Dispatch Trip</h3>
              <p className="text-xs text-slate-400">Assign fleet assets atomically</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Trip Summary Card */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Requester:</span>
              <span className="font-bold text-white">{trip.requester?.name || 'Staff'}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Route:</span>
              <span className="font-medium text-slate-200">
                {trip.fromOffice?.name || trip.pickupAddress || 'Origin'} &rarr;{' '}
                {trip.toOffice?.name || trip.dropoffAddress || 'Destination'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Departure:</span>
              <span className="text-indigo-300 font-mono">
                {new Date(trip.departureAt).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Select Vehicle */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
              <Truck className="w-4 h-4 text-indigo-400" />
              <span>Assign Available Vehicle</span>
            </label>
            {vehicles.length === 0 ? (
              <p className="text-xs text-amber-400 italic">No available vehicles currently in fleet.</p>
            ) : (
              <select
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.make} {v.model} ({v.registrationNo}) — {v.capacity} seats | {v.fuelEfficiency} km/L
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Select Driver */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-400" />
              <span>Assign Available Driver</span>
            </label>
            {drivers.length === 0 ? (
              <p className="text-xs text-amber-400 italic">No available drivers on duty.</p>
            ) : (
              <select
                value={selectedDriverId}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.user?.name || 'Driver'} — Lic: {d.licenseNumber}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Admin Notes */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">Admin Instructions / Notes</label>
            <input
              type="text"
              placeholder="e.g. Please pick up VIP guest at Lobby A first"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          <button
            disabled={loading || vehicles.length === 0 || drivers.length === 0}
            onClick={handleApprove}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
          >
            {loading ? 'Assigning...' : 'Confirm Assignment'}
          </button>
        </div>
      </div>
    </div>
  );
};
