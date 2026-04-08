import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { notificationManager } from '../services/notificationManager';
import { useLocation } from './LocationContext';

interface NotificationSettings {
  weatherEnabled: boolean;
  nearbyPlacesEnabled: boolean;
  aiSuggestionsEnabled: boolean;
}

interface NotificationContextType {
  isSupported: boolean;
  isEnabled: boolean;
  settings: NotificationSettings;
  updateSettings: (settings: Partial<NotificationSettings>) => void;
  requestPermission: () => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children, language }: { children: ReactNode; language: string }) {
  const [isSupported] = useState(true); // Always supported - let the native layer handle it
  const [isEnabled, setIsEnabled] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    weatherEnabled: true,
    nearbyPlacesEnabled: true,
    aiSuggestionsEnabled: true
  });
  const { userLocation } = useLocation();

  // Initialize notifications when language is available
  useEffect(() => {
    if (language) {
      initializeNotifications();
    }
  }, [language]);

  // Start monitoring when location is available
  useEffect(() => {
    if (isEnabled && userLocation) {
      notificationManager.updateLocation(userLocation.lat, userLocation.lng);
    }
  }, [isEnabled, userLocation]);
  // Update language in notification services
  useEffect(() => {
    if (language) {
      notificationManager.updateLanguage(language);
    }
  }, [language]);
  const initializeNotifications = async () => {
    const success = await notificationManager.initialize(language);
    setIsEnabled(success);
    if (success) {
      setSettings(notificationManager.getSettings());
      console.log('Notification system initialized successfully');
    }
  };
  // Start monitoring when both notifications are enabled AND location is available
  useEffect(() => {
    if (isEnabled && userLocation) {
      console.log('Starting notification monitoring with location:', userLocation.lat, userLocation.lng);
      notificationManager.startMonitoring(async () => {
        return {
          lat: userLocation.lat,
          lng: userLocation.lng,
          address: userLocation.address
        };
      });
    }
    
    return () => {
      notificationManager.stopMonitoring();
    };
  }, [isEnabled, userLocation?.lat, userLocation?.lng]);

  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported) return false;
    
    const success = await notificationManager.initialize(language);
    setIsEnabled(success);
    return success;
  };

  const updateSettings = (newSettings: Partial<NotificationSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    
    if ('weatherEnabled' in newSettings) {
      notificationManager.setWeatherEnabled(newSettings.weatherEnabled!);
    }
    if ('nearbyPlacesEnabled' in newSettings) {
      notificationManager.setNearbyPlacesEnabled(newSettings.nearbyPlacesEnabled!);
    }
    if ('aiSuggestionsEnabled' in newSettings) {
      notificationManager.setAISuggestionsEnabled(newSettings.aiSuggestionsEnabled!);
    }
  };

  return (
    <NotificationContext.Provider value={{
      isSupported,
      isEnabled,
      settings,
      updateSettings,
      requestPermission
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}