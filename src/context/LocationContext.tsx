import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { Geolocation, Position } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { WORKER_URL } from '../config/apiKeys';

interface Location {
  lat: number;
  lng: number;
  address?: string;
}

interface LocationContextType {
  userLocation: Location | null;
  isLoading: boolean;
  error: string | null;
  permissionDenied: boolean;
  refreshLocation: () => Promise<void>;
  requestLocationPermission: () => Promise<boolean>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

function isValidCoords(lat: number, lng: number): boolean {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (isNaN(lat) || isNaN(lng)) return false;
  if (lat === 0 && lng === 0) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;
  return true;
}

async function fetchCityName(lat: number, lng: number): Promise<string> {
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(
      `${WORKER_URL}/geocode?lat=${lat}&lon=${lng}`,
      { signal: controller.signal }
    );
    clearTimeout(tid);
    if (res.ok) {
      const data = await res.json();
      const props = data?.features?.[0]?.properties;
      const city = props?.city || props?.county || props?.state || props?.name || '';
      if (city) return city;
    }
  } catch {
    // Worker geocode failed, try fallback
  }

  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ar`,
      { signal: controller.signal, headers: { 'User-Agent': 'RihlatyApp/2.0' } }
    );
    clearTimeout(tid);
    if (res.ok) {
      const data = await res.json();
      const addr = data?.address;
      return addr?.city || addr?.town || addr?.village || addr?.municipality ||
             addr?.county || addr?.state || '';
    }
  } catch {
    // Nominatim also failed
  }

  return '';
}

export function LocationProvider({ children }: { children: ReactNode }) {
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const isFetching = useRef(false);

  const fetchLocation = useCallback(async (): Promise<boolean> => {
    if (isFetching.current) return false;
    isFetching.current = true;

    try {
      setIsLoading(true);
      setError(null);

      if (Capacitor.isNativePlatform()) {
        try {
          const perm = await Geolocation.checkPermissions();
          if (perm.location !== 'granted') {
            const req = await Geolocation.requestPermissions();
            if (req.location === 'denied') {
              setPermissionDenied(true);
              setUserLocation(null);
              setIsLoading(false);
              isFetching.current = false;
              return false;
            }
          }
        } catch {
          // Let getCurrentPosition handle permission
        }
      }

      setPermissionDenied(false);

      let position: Position | null = null;
      try {
        position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 30000
        });
      } catch {
        try {
          position = await Geolocation.getCurrentPosition({
            enableHighAccuracy: false,
            timeout: 15000,
            maximumAge: 60000
          });
        } catch {
          position = await Geolocation.getCurrentPosition({
            enableHighAccuracy: false,
            timeout: 30000,
            maximumAge: 300000
          });
        }
      }

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      if (!isValidCoords(lat, lng)) {
        throw new Error('Invalid position received');
      }

      // Get city name BEFORE setting state (max 5s per attempt)
      const city = await fetchCityName(lat, lng);

      // Set location ONCE with everything
      setUserLocation({ lat, lng, address: city });
      setIsLoading(false);

      isFetching.current = false;
      return true;
    } catch (err: any) {
      console.error('Location error:', err);
      const msg = err?.message?.toLowerCase?.() || '';
      const code = err?.code;

      if (code === 1 || msg.includes('denied') || msg.includes('permission')) {
        setPermissionDenied(true);
        setError('location_denied');
      } else if (msg.includes('disabled') || msg.includes('turned off') || code === 2) {
        setError('location_disabled');
      } else {
        setError(msg || 'Failed to get location');
      }

      setUserLocation(null);
      setIsLoading(false);
      isFetching.current = false;
      return false;
    }
  }, []);

  const requestLocationPermission = useCallback(async (): Promise<boolean> => {
    isFetching.current = false;
    return await fetchLocation();
  }, [fetchLocation]);

  const refreshLocation = useCallback(async () => {
    isFetching.current = false;
    await fetchLocation();
  }, [fetchLocation]);

  useEffect(() => {
    fetchLocation();
  }, []);

  return (
    <LocationContext.Provider value={{
      userLocation,
      isLoading,
      error,
      permissionDenied,
      refreshLocation,
      requestLocationPermission
    }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}
