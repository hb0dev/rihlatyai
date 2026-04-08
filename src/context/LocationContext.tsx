import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Geolocation } from '@capacitor/geolocation';
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

export function LocationProvider({ children }: { children: ReactNode }) {
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const fetchLocation = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      const isNative = Capacitor.isNativePlatform();

      // Request permissions on native platforms
      if (isNative) {
        try {
          const permission = await Geolocation.checkPermissions();
          if (permission.location === 'denied') {
            const requestResult = await Geolocation.requestPermissions();
            if (requestResult.location === 'denied') {
              setPermissionDenied(true);
              setUserLocation(null);
              setIsLoading(false);
              return false;
            }
          } else if (permission.location === 'prompt' || permission.location === 'prompt-with-rationale') {
            const requestResult = await Geolocation.requestPermissions();
            if (requestResult.location === 'denied') {
              setPermissionDenied(true);
              setUserLocation(null);
              setIsLoading(false);
              return false;
            }
          }
        } catch (permError) {
          console.log('Permission check error:', permError);
        }
      }
      
      setPermissionDenied(false);
      
      // Get position
      let position;
      try {
        position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: false,
          timeout: 15000,
          maximumAge: 60000
        });
      } catch (e1) {
        console.log('First position attempt failed:', e1);
        try {
          position = await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 20000,
            maximumAge: 30000
          });
        } catch (e2) {
          console.log('Second position attempt failed:', e2);
          position = await Geolocation.getCurrentPosition({
            enableHighAccuracy: false,
            timeout: 30000,
            maximumAge: 300000
          });
        }
      }
      
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      
      console.log('Got position:', lat, lng);
      
      // Set location immediately with coordinates
      setUserLocation({ lat, lng, address: '' });
      setIsLoading(false);
      
      // Then try to get city name asynchronously
      try {
        const response = await fetch(
          `${WORKER_URL}/geocode?lat=${lat}&lon=${lng}`
        );
        if (response.ok) {
          const data = await response.json();
          if (data.features && data.features.length > 0) {
            const props = data.features[0].properties;
            const cityName = props?.city || props?.county || props?.state || props?.name || '';
            if (cityName) {
              setUserLocation({ lat, lng, address: cityName });
            }
          }
        }
      } catch (geoError) {
        console.log('Geocoding error:', geoError);
      }
      
      return true;

    } catch (err: any) {
      console.error('Location error:', err);
      setError(err.message || 'Failed to get location');
      setIsLoading(false);
      
      if (err.code === 1 || (err.message && err.message.toLowerCase().includes('denied'))) {
        setPermissionDenied(true);
      }
      setUserLocation(null);
      
      return false;
    }
  };

  const requestLocationPermission = async (): Promise<boolean> => {
    return await fetchLocation();
  };

  useEffect(() => {
    fetchLocation();
  }, []);

  const refreshLocation = async () => {
    await fetchLocation();
  };

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
