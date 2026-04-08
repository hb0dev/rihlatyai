import { notificationService } from './notificationService';
import { WORKER_URL } from '../config/apiKeys';
interface SuggestionContext {
  lat: number;
  lng: number;
  city: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  dayOfWeek: string;
}
// Translations for notifications
const translations = {
  ar: {
    title: '🤖 اقتراح من رحلتي',
    morningBeach: '☀️ صباح مشرق! ماذا عن زيارة {place} للاستمتاع بالشاطئ؟',
    afternoonHistorical: '🏛️ وقت مثالي لاستكشاف {place}! موقع تاريخي رائع',
    eveningRestaurant: '🍽️ جائع؟ {place} قريب منك ويقدم أطباق لذيذة!',
    weekendNature: '🌲 عطلة نهاية الأسبوع! اكتشف جمال {place}',
    generalSuggestion: '✨ {place} ينتظرك! مكان رائع للزيارة',
    exploreNearby: '🧭 اكتشف {count} أماكن سياحية جديدة قريبة منك!'
  },
  fr: {
    title: '🤖 Suggestion de Rihlaty',
    morningBeach: '☀️ Belle matinée! Que diriez-vous de visiter {place}?',
    afternoonHistorical: '🏛️ Moment idéal pour explorer {place}!',
    eveningRestaurant: '🍽️ Faim? {place} est proche avec de délicieux plats!',
    weekendNature: '🌲 Bon week-end! Découvrez {place}',
    generalSuggestion: '✨ {place} vous attend! Un endroit magnifique',
    exploreNearby: '🧭 Découvrez {count} nouveaux lieux touristiques!'
  },
  en: {
    title: '🤖 Rihlaty Suggestion',
    morningBeach: '☀️ Beautiful morning! How about visiting {place}?',
    afternoonHistorical: '🏛️ Perfect time to explore {place}!',
    eveningRestaurant: '🍽️ Hungry? {place} is nearby with delicious food!',
    weekendNature: '🌲 Weekend vibes! Discover {place}',
    generalSuggestion: '✨ {place} awaits you! A great place to visit',
    exploreNearby: '🧭 Discover {count} new tourist places nearby!'
  }
};
class AISuggestions {
  private language: string = 'ar';
  private lastSuggestionDate: string | null = null;
  private suggestionInterval: NodeJS.Timeout | null = null;

  setLanguage(lang: string): void {
    this.language = lang;
  }

  // Get current time of day
  private getTimeOfDay(): 'morning' | 'afternoon' | 'evening' {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    return 'evening';
  }

  // Check if today is weekend
  private isWeekend(): boolean {
    const day = new Date().getDay();
    return day === 5 || day === 6; // Friday & Saturday in Algeria
  }

  // Get today's date as string
  private getTodayString(): string {
    return new Date().toISOString().split('T')[0];
  }

  // Check if we already sent suggestion today
  private alreadySuggestedToday(): boolean {
    return this.lastSuggestionDate === this.getTodayString();
  }

  // Fetch nearby places for suggestions
  private async fetchPlacesForSuggestion(lat: number, lng: number, category: string): Promise<any[]> {
    const categoryMap: Record<string, string> = {
      beach: 'beach',
      nature: 'natural,national_park,leisure.park',
      historical: 'heritage,tourism.sights,building.historic',
      restaurant: 'catering.restaurant,catering.cafe'
    };

    try {
      const response = await fetch(
        `${WORKER_URL}/places?categories=${categoryMap[category]}&filter=circle:${lng},${lat},30000&bias=proximity:${lng},${lat}&limit=10`
      );

      if (!response.ok) return [];

      const data = await response.json();
      return data.features?.filter((f: any) => f.properties.name) || [];
    } catch (error) {
      console.error('Error fetching places for AI suggestion:', error);
      return [];
    }
  }

  // Get a smart suggestion based on context
  private async getSmartSuggestion(context: SuggestionContext): Promise<{ message: string; place?: any } | null> {
    const t = translations[this.language as keyof typeof translations] || translations.ar;
    
    // Morning + Weekend = Beach suggestion
    if (context.timeOfDay === 'morning' && this.isWeekend()) {
      const beaches = await this.fetchPlacesForSuggestion(context.lat, context.lng, 'beach');
      if (beaches.length > 0) {
        const randomBeach = beaches[Math.floor(Math.random() * Math.min(3, beaches.length))];
        return {
          message: t.morningBeach.replace('{place}', randomBeach.properties.name),
          place: randomBeach
        };
      }
    }

    // Afternoon = Historical sites
    if (context.timeOfDay === 'afternoon') {
      const historical = await this.fetchPlacesForSuggestion(context.lat, context.lng, 'historical');
      if (historical.length > 0) {
        const randomSite = historical[Math.floor(Math.random() * Math.min(3, historical.length))];
        return {
          message: t.afternoonHistorical.replace('{place}', randomSite.properties.name),
          place: randomSite
        };
      }
    }

    // Evening = Restaurant
    if (context.timeOfDay === 'evening') {
      const restaurants = await this.fetchPlacesForSuggestion(context.lat, context.lng, 'restaurant');
      if (restaurants.length > 0) {
        const randomRestaurant = restaurants[Math.floor(Math.random() * Math.min(3, restaurants.length))];
        return {
          message: t.eveningRestaurant.replace('{place}', randomRestaurant.properties.name),
          place: randomRestaurant
        };
      }
    }

    // Weekend = Nature
    if (this.isWeekend()) {
      const nature = await this.fetchPlacesForSuggestion(context.lat, context.lng, 'nature');
      if (nature.length > 0) {
        const randomNature = nature[Math.floor(Math.random() * Math.min(3, nature.length))];
        return {
          message: t.weekendNature.replace('{place}', randomNature.properties.name),
          place: randomNature
        };
      }
    }

    // General suggestion - any interesting place
    const allPlaces = await this.fetchPlacesForSuggestion(context.lat, context.lng, 'historical');
    if (allPlaces.length > 0) {
      const randomPlace = allPlaces[Math.floor(Math.random() * Math.min(5, allPlaces.length))];
      return {
        message: t.generalSuggestion.replace('{place}', randomPlace.properties.name),
        place: randomPlace
      };
    }

    return null;
  }

  // Generate and send AI suggestion
  async generateSuggestion(lat: number, lng: number, city: string = ''): Promise<boolean> {
    // Only one suggestion per day
    if (this.alreadySuggestedToday()) {
      console.log('Already sent suggestion today');
      return false;
    }

    const context: SuggestionContext = {
      lat,
      lng,
      city,
      timeOfDay: this.getTimeOfDay(),
      dayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'long' })
    };

    const suggestion = await this.getSmartSuggestion(context);
    
    if (!suggestion) {
      console.log('No suitable suggestion found');
      return false;
    }

    const t = translations[this.language as keyof typeof translations] || translations.ar;
    
    const sent = await notificationService.sendNotification(
      {
        title: t.title,
        body: suggestion.message,
        data: {
          type: 'ai_suggestion',
          place: suggestion.place ? {
            name: suggestion.place.properties.name,
            lat: suggestion.place.geometry.coordinates[1],
            lng: suggestion.place.geometry.coordinates[0]
          } : null
        }
      },
      `ai_suggestion_${this.getTodayString()}`
    );

    if (sent) {
      this.lastSuggestionDate = this.getTodayString();
      console.log('AI suggestion sent:', suggestion.message);
    }

    return sent;
  }

  // Start daily suggestions (check at optimal times)
  startDailySuggestions(getCurrentLocation: () => Promise<{ lat: number; lng: number; address?: string } | null>): void {
    const checkAndSuggest = async () => {
      const location = await getCurrentLocation();
      if (location) {
        await this.generateSuggestion(location.lat, location.lng, location.address);
      }
    };

    // Check every hour during active hours (8 AM - 8 PM)
    this.suggestionInterval = setInterval(() => {
      const hour = new Date().getHours();
      if (hour >= 8 && hour <= 20) {
        checkAndSuggest();
      }
    }, 60 * 60 * 1000); // Every hour

    // Initial check after 5 seconds
    setTimeout(checkAndSuggest, 5000);

    console.log('AI suggestions started');
  }

  // Stop suggestions
  stopSuggestions(): void {
    if (this.suggestionInterval) {
      clearInterval(this.suggestionInterval);
      this.suggestionInterval = null;
      console.log('AI suggestions stopped');
    }
  }

  // Reset state (for testing)
  reset(): void {
    this.lastSuggestionDate = null;
  }
}

export const aiSuggestions = new AISuggestions();

