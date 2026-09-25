import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { api } from '../lib/api';
import { ApexLogo } from '../components/common/ApexLogo';
import { Eye, EyeOff, LogIn, ShieldCheck, Lock, User, AlertCircle, Truck, Users, UserCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { setUser, setIsAuthenticated } = useStore();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [particles, setParticles] = useState<{ x: number; y: number; size: number; speed: number }[]>([]);

  // Demo credentials helper
  const demoCredentials = [
    { label: 'Admin', id: 'admin@vms.com', pass: 'admin123', icon: ShieldCheck, color: 'indigo' },
    { label: 'Employee', id: 'EMP-101', pass: 'password123', icon: UserCheck, color: 'emerald' },
    { label: 'Driver', id: 'DRV-001', pass: 'password123', icon: Truck, color: 'amber' },
  ];

  useEffect(() => {
    // Generate floating particles for background ambiance
    const pts = Array.from({ length: 20 }, (_, i) => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      speed: Math.random() * 15 + 10,
    }));
    setParticles(pts);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setError('Please enter your ID/email and password.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await api.login(identifier.trim(), password);
      if (res?.success && res.token && res.user) {
        localStorage.setItem('vms_token', res.token);
        setUser(res.user);
        setIsAuthenticated(true);
      } else {
        setError(res?.message || 'Invalid credentials. Please try again.');
      }
    } catch (err: any) {
      setError('Unable to connect to the server. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (id: string, pass: string) => {
    setIdentifier(id);
    setPassword(pass);
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-indigo-950/30 to-slate-950" />
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/5 rounded-full blur-2xl" />
      </div>

      {/* Floating particles */}
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-indigo-400/20"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animation: `float ${p.speed}s ease-in-out infinite alternate`,
            animationDelay: `${i * 0.5}s`,
          }}
        />
      ))}

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(rgba(99,102,241,1) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Main card */}
      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Logo area */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <ApexLogo variant="full" size="lg" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100 mt-2">Vehicle Management System</h1>
          <p className="text-slate-400 text-sm mt-1">Secure fleet operations platform</p>
        </div>

        {/* Login form card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/60 rounded-2xl p-8 shadow-2xl shadow-indigo-900/20">
          {/* Card header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
              <Lock className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Sign In</h2>
              <p className="text-xs text-slate-400">Use your Employee ID or email address</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Identifier field */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                Employee ID or Email
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  id="login-identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => { setIdentifier(e.target.value); setError(''); }}
                  placeholder="e.g. EMP-101 or admin@vms.com"
                  className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                  autoComplete="username"
                  autoFocus
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="Enter your password"
                  className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl pl-10 pr-12 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="flex items-start gap-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <p className="text-sm text-rose-300">{error}</p>
              </div>
            )}

            {/* Submit button */}
            <button
              id="login-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white font-semibold py-3 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-600/25 hover:shadow-indigo-500/40 active:scale-[0.99] text-sm"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Authenticating...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign In to Dashboard
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-slate-800" />
            <span className="text-xs text-slate-500 font-medium">Quick Demo Access</span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          {/* Demo credentials */}
          <div className="grid grid-cols-3 gap-2">
            {demoCredentials.map((cred) => {
              const Icon = cred.icon;
              const colorMap: Record<string, string> = {
                indigo: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20',
                emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20',
                amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20',
              };
              return (
                <button
                  key={cred.label}
                  type="button"
                  onClick={() => fillDemo(cred.id, cred.pass)}
                  className={`flex flex-col items-center gap-1.5 p-3 border rounded-xl transition-all duration-150 ${colorMap[cred.color]}`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-[11px] font-bold">{cred.label}</span>
                  <span className="text-[9px] opacity-70 font-mono">{cred.id}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer note */}
        <div className="text-center mt-6 flex items-center justify-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500/70" />
          <span>Access is role-based. Admin credentials required for full dashboard.</span>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          100% { transform: translateY(-20px); }
        }
      `}</style>
    </div>
  );
};
