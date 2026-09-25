/**
 * VMS Query Hooks — centralised TanStack Query hooks for the admin dashboard.
 *
 * Cache behaviour (configured in main.tsx QueryClient):
 *   staleTime  30 s  — data is served instantly from cache within this window
 *   gcTime      5 m  — unused cache entries are purged after 5 minutes
 *
 * Query keys are exported so pages can invalidate them after mutations.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

// ─── Query key factory ────────────────────────────────────────────────────────
export const QK = {
  stats:        ['stats']                       as const,
  trips:        (status?: string) => ['trips', status ?? 'ALL'],
  trip:         (id: string)      => ['trip', id],
  vehicles:     (status?: string) => ['vehicles', status ?? 'ALL'],
  drivers:      (params?: string) => ['drivers', params ?? ''],
  employees:    (search?: string) => ['employees', search ?? ''],
  fuel:         (vId?: string)    => ['fuel', vId ?? ''],
  maintenance:  ()                => ['maintenance'],
  notifications:()                => ['notifications'],
  unreadChat:   ()                => ['chat', 'unread'],
} as const;

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useDashboardStats() {
  return useQuery({
    queryKey: QK.stats,
    queryFn:  () => api.getStats().then((r) => r.data ?? null),
  });
}

export function useTrips(status?: string) {
  const param = status ? `?status=${status}` : '';
  return useQuery({
    queryKey: QK.trips(status),
    queryFn:  () => api.getTrips(param).then((r) => r.data ?? []),
  });
}

export function useTripById(id: string) {
  return useQuery({
    queryKey: QK.trip(id),
    queryFn:  () => api.getTripById(id).then((r) => r.data ?? null),
    enabled:  !!id,
  });
}

export function useVehicles(status?: string) {
  const param = status && status !== 'ALL' ? `?status=${status}` : '';
  return useQuery({
    queryKey: QK.vehicles(status),
    queryFn:  () => api.getVehicles(param).then((r) => r.data ?? []),
  });
}

export function useDrivers(params?: string) {
  return useQuery({
    queryKey: QK.drivers(params),
    queryFn:  () => api.getDrivers(params ?? '').then((r) => r.data ?? []),
  });
}

export function useEmployees(search?: string) {
  return useQuery({
    queryKey: QK.employees(search),
    queryFn:  () =>
      api.getUsers(`?role=EMPLOYEE${search ? `&search=${encodeURIComponent(search)}` : ''}`)
        .then((r) => r.data ?? []),
    staleTime: 60_000, // employees change rarely — cache longer
  });
}

export function useFuelLogs(vehicleId?: string) {
  const param = vehicleId ? `?vehicleId=${vehicleId}` : '';
  return useQuery({
    queryKey: QK.fuel(vehicleId),
    queryFn:  () => api.getFuelLogs?.(param).then((r) => r.data ?? []),
  });
}

export function useMaintenanceLogs() {
  return useQuery({
    queryKey: QK.maintenance(),
    queryFn:  () => api.getMaintenanceLogs('').then((r) => r.data ?? []),
    staleTime: 60_000,
  });
}

/** Returns a helper to invalidate a specific query key after mutations */
export function useInvalidate() {
  const qc = useQueryClient();
  return (key: readonly unknown[]) => qc.invalidateQueries({ queryKey: key });
}
