import { notificationService } from './notificationService';
import { weatherMonitor } from './weatherMonitor';
import { nearbyPlacesMonitor } from './nearbyPlacesMonitor';
import { aiSuggestions } from './aiSuggestions';

interface NotificationSettings {
  weatherEnabled: boolean;
  nearbyPlacesEnabled: boolean;
  aiSuggestionsEnabled: boolean;
}

class NotificationManager {
  private isInitialized = false;
  private permissionGranted = false;
  private settings: NotificationSettings = {
    weatherEnabled: true,
    nearbyPlacesEnabled: true,
    aiSuggestionsEnabled: true
  };

  // Load settings from localStorage
  private loadSettings(): void {
    try {
      const saved = localStorage.getItem('notificationSettings');
      if (saved) {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.log('Error loading notification settings:', e);
    }
  }

  // Save settings to localStorage
  saveSettings(settings: Partial<NotificationSettings>): void {
    this.settings = { ...this.settings, ...settings };
    localStorage.setItem('notificationSettings', JSON.stringify(this.settings));
  }

  // Get current settings
  getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  // Initialize the notification system
  async initialize(language: string): Promise<boolean> {
    console.log('Initializing notification manager...');
    
    if (this.isInitialized) {
      return this.permissionGranted;
    }

    this.loadSettings();

    // Initialize notification service
    try {
      this.permissionGranted = await notificationService.initialize();
      console.log('Notification permission granted:', this.permissionGranted);
    } catch (error) {
      console.error('Error initializing notification service:', error);
      this.permissionGranted = false;
    }

    // Set language for all services
    weatherMonitor.setLanguage(language);
    nearbyPlacesMonitor.setLanguage(language);
    aiSuggestions.setLanguage(language);

    this.isInitialized = true;
    console.log('Notification manager initialized, permission:', this.permissionGranted);
    
    return this.permissionGranted;
  }

  // Start all monitoring services
  startMonitoring(
    getCurrentLocation: () => Promise<{ lat: number; lng: number; address?: string } | null>
  ): void {
    if (!this.isInitialized) {
      console.log('Notification manager not initialized');
      return;
    }

    // Start weather monitoring if enabled
    if (this.settings.weatherEnabled) {
      getCurrentLocation().then(location => {
        if (location) {
          weatherMonitor.startMonitoring(location.lat, location.lng, 30); // Every 30 minutes
        }
      });
    }

    // Start nearby places monitoring if enabled
    if (this.settings.nearbyPlacesEnabled) {
      nearbyPlacesMonitor.startMonitoring(async () => {
        const location = await getCurrentLocation();
        return location ? { lat: location.lat, lng: location.lng } : null;
      }, 5); // Every 5 minutes
    }

    // Start AI suggestions if enabled
    if (this.settings.aiSuggestionsEnabled) {
      aiSuggestions.startDailySuggestions(getCurrentLocation);
    }

    console.log('All notification services started');
  }

  // Stop all monitoring services
  stopMonitoring(): void {
    weatherMonitor.stopMonitoring();
    nearbyPlacesMonitor.stopMonitoring();
    aiSuggestions.stopSuggestions();
    console.log('All notification services stopped');
  }

  // Update language for all services
  updateLanguage(language: string): void {
    weatherMonitor.setLanguage(language);
    nearbyPlacesMonitor.setLanguage(language);
    aiSuggestions.setLanguage(language);
  }

  // Update location for weather monitoring
  updateLocation(lat: number, lng: number): void {
    if (this.settings.weatherEnabled) {
      weatherMonitor.stopMonitoring();
      weatherMonitor.startMonitoring(lat, lng, 30);
    }
  }

  // Enable/disable weather notifications
  setWeatherEnabled(enabled: boolean): void {
    this.saveSettings({ weatherEnabled: enabled });
    if (enabled) {
      // Will be started on next location update
    } else {
      weatherMonitor.stopMonitoring();
    }
  }

  // Enable/disable nearby places notifications
  setNearbyPlacesEnabled(enabled: boolean): void {
    this.saveSettings({ nearbyPlacesEnabled: enabled });
    if (!enabled) {
      nearbyPlacesMonitor.stopMonitoring();
    }
  }

  // Enable/disable AI suggestions
  setAISuggestionsEnabled(enabled: boolean): void {
    this.saveSettings({ aiSuggestionsEnabled: enabled });
    if (!enabled) {
      aiSuggestions.stopSuggestions();
    }
  }

  // Clear all notification history (for testing)
  clearHistory(): void {
    notificationService.clearHistory();
    weatherMonitor.reset();
    nearbyPlacesMonitor.reset();
    aiSuggestions.reset();
  }

  }
export const notificationManager = new NotificationManager();