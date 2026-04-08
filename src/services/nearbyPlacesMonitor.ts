import { notificationService } from './notificationService';
import { WORKER_URL } from '../config/apiKeys';

interface Place {
  name: string;
  category: string;
  distance: number;
  lat: number;
  lng: number;
}

// Translations for notifications
const translations = {
  ar: {
    beach: '🏖️ شاطئ {name} يبعد {distance} كم عنك!',
    nature: '🌲 منطقة طبيعية {name} على بعد {distance} كم!',
    historical: '🏛️ موقع تاريخي {name} قريب منك ({distance} كم)!',
    hotel: '🏨 فندق {name} يبعد {distance} كم فقط!',
    restaurant: '🍽️ مطعم {name} على بعد {distance} كم!',
    nearbyPlace: 'مكان قريب',
    discover: 'اكتشف مكان جديد'
  },
  fr: {
    beach: '🏖️ Plage {name} à {distance} km de vous!',
    nature: '🌲 Zone naturelle {name} à {distance} km!',
    historical: '🏛️ Site historique {name} près de vous ({distance} km)!',
    hotel: '🏨 Hôtel {name} à seulement {distance} km!',
    restaurant: '🍽️ Restaurant {name} à {distance} km!',
    nearbyPlace: 'Lieu proche',
    discover: 'Découvrez un nouveau lieu'
  },
  en: {
    beach: '🏖️ Beach {name} is {distance} km away!',
    nature: '🌲 Natural area {name} is {distance} km away!',
    historical: '🏛️ Historical site {name} nearby ({distance} km)!',
    hotel: '🏨 Hotel {name} only {distance} km away!',
    restaurant: '🍽️ Restaurant {name} is {distance} km away!',
    nearbyPlace: 'Nearby Place',
    discover: 'Discover a new place'
  }
};

// Category to API categories mapping
const CATEGORY_MAP = {
  beach: 'beach',
  nature: 'natural,national_park,leisure.park',
  historical: 'heritage,tourism.sights,building.historic',
  hotel: 'accommodation.hotel',
  restaurant: 'catering.restaurant,catering.fast_food,catering.cafe'
};

class NearbyPlacesMonitor {
  private language: string = 'ar';
  private lastLocation: { lat: number; lng: number } | null = null;
  private notifiedPlaces: Map<string, number> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;
  
  // Minimum distance to trigger location change (km)
  private readonly MIN_DISTANCE_CHANGE = 0.5;
  
  // Maximum distance to notify about a place (km)
  private readonly NOTIFY_RADIUS = 15;
  
  // Cooldown for same place notification (6 hours)
  private readonly PLACE_COOLDOWN = 6 * 60 * 60 * 1000;

  setLanguage(lang: string): void {
    this.language = lang;
  }

  // Calculate distance between two points (Haversine formula)
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Check if location has changed significantly
  private hasLocationChanged(newLat: number, newLng: number): boolean {
    if (!this.lastLocation) return true;
    
    const distance = this.calculateDistance(
      this.lastLocation.lat,
      this.lastLocation.lng,
      newLat,
      newLng
    );
    
    return distance >= this.MIN_DISTANCE_CHANGE;
  }

  // Check if we already notified about this place recently
  private wasRecentlyNotified(placeId: string): boolean {
    const lastNotified = this.notifiedPlaces.get(placeId);
    if (!lastNotified) return false;
    
    return Date.now() - lastNotified < this.PLACE_COOLDOWN;
  }

  // Mark place as notified
  private markAsNotified(placeId: string): void {
    this.notifiedPlaces.set(placeId, Date.now());
    
    // Clean old entries
    const now = Date.now();
    this.notifiedPlaces.forEach((timestamp, id) => {
      if (now - timestamp > this.PLACE_COOLDOWN) {
        this.notifiedPlaces.delete(id);
      }
    });
  }

  // Get translated message
  private getTranslatedMessage(category: string, name: string, distance: number): { title: string; body: string } {
    const t = translations[this.language as keyof typeof translations] || translations.ar;
    const template = t[category as keyof typeof t] || t.beach;
    
    const body = (template as string)
      .replace('{name}', name)
      .replace('{distance}', distance.toFixed(1));
    
    return {
      title: t.discover,
      body
    };
  }

  // Fetch nearby places from API
  private async fetchNearbyPlaces(lat: number, lng: number, category: string): Promise<Place[]> {
    try {
      const apiCategories = CATEGORY_MAP[category as keyof typeof CATEGORY_MAP];
      if (!apiCategories) return [];

      const response = await fetch(
        `${WORKER_URL}/places?categories=${apiCategories}&filter=circle:${lng},${lat},${this.NOTIFY_RADIUS * 1000}&bias=proximity:${lng},${lat}&limit=5`
      );

      if (!response.ok) return [];

      const data = await response.json();
      
      if (!data.features) return [];

      return data.features
        .filter((f: any) => f.properties.name)
        .map((f: any) => ({
          name: f.properties.name,
          category,
          lat: f.geometry.coordinates[1],
          lng: f.geometry.coordinates[0],
          distance: this.calculateDistance(lat, lng, f.geometry.coordinates[1], f.geometry.coordinates[0])
        }));
    } catch (error) {
      console.error(`Error fetching ${category} places:`, error);
      return [];
    }
  }

  // Check for nearby places and send notification
  async checkNearbyPlaces(lat: number, lng: number): Promise<void> {
    // Only check if location changed significantly
    if (!this.hasLocationChanged(lat, lng)) {
      return;
    }

    this.lastLocation = { lat, lng };
    console.log('Checking nearby places for new location:', lat, lng);

    // Categories to check (prioritized)
    const categories = ['beach', 'historical', 'nature'];
    
    for (const category of categories) {
      const places = await this.fetchNearbyPlaces(lat, lng, category);
      
      for (const place of places) {
        const placeId = `${category}_${place.name}_${Math.round(place.lat * 100)}_${Math.round(place.lng * 100)}`;
        
        // Skip if already notified recently
        if (this.wasRecentlyNotified(placeId)) {
          continue;
        }

        // Only notify for places within the radius
        if (place.distance <= this.NOTIFY_RADIUS) {
          const { title, body } = this.getTranslatedMessage(category, place.name, place.distance);
          
          const sent = await notificationService.sendNotification(
            {
              title,
              body,
              data: {
                type: 'nearby_place',
                category,
                name: place.name,
                lat: place.lat,
                lng: place.lng
              }
            },
            placeId
          );

          if (sent) {
            this.markAsNotified(placeId);
            // Only send one notification at a time
            return;
          }
        }
      }
    }
  }

  // Start monitoring (check every 5 minutes)
  startMonitoring(getCurrentLocation: () => Promise<{ lat: number; lng: number } | null>, intervalMinutes: number = 5): void {
    const check = async () => {
      const location = await getCurrentLocation();
      if (location) {
        await this.checkNearbyPlaces(location.lat, location.lng);
      }
    };

    // Initial check
    check();

    // Set up interval
    this.checkInterval = setInterval(check, intervalMinutes * 60 * 1000);

    console.log(`Nearby places monitoring started (every ${intervalMinutes} minutes)`);
  }

  // Stop monitoring
  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('Nearby places monitoring stopped');
    }
  }

  // Reset state
  reset(): void {
    this.lastLocation = null;
    this.notifiedPlaces.clear();
  }
}

export const nearbyPlacesMonitor = new NearbyPlacesMonitor();

