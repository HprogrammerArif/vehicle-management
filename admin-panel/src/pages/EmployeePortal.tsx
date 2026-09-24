import React, { useState, useEffect } from 'react';
import { Office, TripType } from '../types';
import { api } from '../lib/api';
import { useStore } from '../store/useStore';
import { Compass, Calendar, MapPin, Users, Send, CheckCircle2 } from 'lucide-react';

export const EmployeePortal: React.FC = () => {
  const { user, setActiveTab } = useStore();
  const [offices, setOffices] = useState<Office[]>([]);
  const [form, setForm] = useState({
    fromOfficeId: '',
    toOfficeId: '',
    departureAt: '',
    returnAt: '',
    purpose: '',
    tripType: 'ONE_WAY' as TripType,
    passengerName: '',
    passengerEmail: '',
  });

  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getOffices().then((res) => {
      if (res.data && res.data.length > 0) {
        setOffices(res.data);
        setForm((prev) => ({
          ...prev,
          fromOfficeId: res.data[0].id,
          toOfficeId: res.data[1]?.id || res.data[0].id,
        }));
      }
    });

    // Default departure: tomorrow at 09:00 AM
    const tmrw = new Date();
    tmrw.setDate(tmrw.getDate() + 1);
    tmrw.setHours(9, 0, 0, 0);
    const tmrwStr = tmrw.toISOString().slice(0, 16);
    setForm((prev) => ({ ...prev, departureAt: tmrwStr }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const payload = {
      fromOfficeId: form.fromOfficeId,
      toOfficeId: form.toOfficeId,
      departureAt: form.departureAt,
      returnAt: form.tripType === 'ROUND_TRIP' ? form.returnAt : undefined,
      purpose: form.purpose,
      tripType: form.tripType,
      passengers: form.passengerName
        ? [{ name: form.passengerName, email: form.passengerEmail || null }]
        : [],
    };

    const res = await api.createTrip(payload);
    if (res.success) {
      setSubmitted(true);
    } else {
      setError(res.message || 'Failed to submit trip request');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 mx-auto flex items-center justify-center">
          <Compass className="w-6 h-6" />
        </div>
        <h2 className="font-display font-extrabold text-2xl text-white">Employee Vehicle Requisition</h2>
        <p className="text-sm text-slate-400">
          Request official transport between Head Office, Regional Branches, and Factories.
        </p>
      </div>

      {submitted ? (
        <div className="glass-card p-8 rounded-3xl text-center space-y-4 border border-emerald-500/30">
          <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="font-display font-bold text-xl text-white">Request Successfully Dispatched!</h3>
          <p className="text-xs text-slate-300 max-w-md mx-auto">
            Your vehicle requisition has been transmitted to the Fleet Manager. You will be notified once a vehicle and driver are assigned.
          </p>
          <div className="pt-4 flex justify-center gap-3">
            <button
              onClick={() => {
                setSubmitted(false);
                setForm((prev) => ({ ...prev, purpose: '', passengerName: '' }));
              }}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700"
            >
              Submit Another Request
            </button>
            <button
              onClick={() => setActiveTab('trips')}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500"
            >
              View My Trips &rarr;
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="glass-card p-8 rounded-3xl border border-slate-800 space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Route Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Departure Location</label>
              <select
                required
                value={form.fromOfficeId}
                onChange={(e) => setForm({ ...form, fromOfficeId: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                {offices.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} ({o.type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Destination Location</label>
              <select
                required
                value={form.toOfficeId}
                onChange={(e) => setForm({ ...form, toOfficeId: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                {offices.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} ({o.type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Journey Type & Date */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Trip Type</label>
              <select
                value={form.tripType}
                onChange={(e) => setForm({ ...form, tripType: e.target.value as TripType })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="ONE_WAY">One Way</option>
                <option value="ROUND_TRIP">Round Trip</option>
                <option value="PICKUP_DROPOFF">Pick-up / Drop-off</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Departure Date & Time</label>
              <input
                type="datetime-local"
                required
                value={form.departureAt}
                onChange={(e) => setForm({ ...form, departureAt: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {form.tripType === 'ROUND_TRIP' && (
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Return Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={form.returnAt}
                  onChange={(e) => setForm({ ...form, returnAt: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}
          </div>

          {/* Purpose */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Official Purpose / Justification</label>
            <textarea
              required
              rows={3}
              placeholder="e.g. Inspecting industrial boiler installation and meeting plant manager at Gazipur"
              value={form.purpose}
              onChange={(e) => setForm({ ...form, purpose: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Co-passengers */}
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 space-y-3">
            <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              <span>Accompanying Officials / Co-passengers</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Colleague full name"
                value={form.passengerName}
                onChange={(e) => setForm({ ...form, passengerName: e.target.value })}
                className="bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white"
              />
              <input
                type="email"
                placeholder="Colleague work email (optional)"
                value={form.passengerEmail}
                onChange={(e) => setForm({ ...form, passengerEmail: e.target.value })}
                className="bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-display font-bold text-sm shadow-xl shadow-indigo-600/30 transition flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span>Submit Requisition for Fleet Approval</span>
          </button>
        </form>
      )}
    </div>
  );
};
