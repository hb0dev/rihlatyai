import { notificationService } from './notificationService';
import { WORKER_URL } from '../config/apiKeys';

interface WeatherAlert {
  type: 'rain' | 'storm' | 'heat' | 'cold' | 'snow';
  severity: 'low' | 'medium' | 'high';
}

// Weather code meanings
const WEATHER_CODES = {
  CLEAR: [0],
  PARTLY_CLOUDY: [1, 2, 3],
  FOG: [45, 48],
  DRIZZLE: [51, 53, 55],
  RAIN: [61, 63, 65],
  SNOW: [71, 73, 75, 77],
  RAIN_SHOWERS: [80, 81, 82],
  SNOW_SHOWERS: [85, 86],
  THUNDERSTORM: [95, 96, 99]
};

// Translations for notifications
const translations = {
  ar: {
    rain: '🌧️ أمطار متوقعة اليوم في {city}، خذ احتياطاتك!',
    storm: '⛈️ تحذير: عواصف رعدية في {city}، ابق في مكان آمن!',
    heat: '🌡️ درجات حرارة مرتفعة في {city} ({temp}°)، اشرب الماء!',
    cold: '❄️ برد شديد في {city} ({temp}°)، ارتدي ملابس دافئة!',
    snow: '🌨️ ثلوج متوقعة في {city}، كن حذراً!',
    weatherAlert: 'تنبيه الطقس'
  },
  fr: {
    rain: '🌧️ Pluie prévue aujourd\'hui à {city}, prenez vos précautions!',
    storm: '⛈️ Alerte: Orages à {city}, restez en sécurité!',
    heat: '🌡️ Températures élevées à {city} ({temp}°), hydratez-vous!',
    cold: '❄️ Froid intense à {city} ({temp}°), couvrez-vous bien!',
    snow: '🌨️ Neige prévue à {city}, soyez prudent!',
    weatherAlert: 'Alerte Météo'
  },
  en: {
    rain: '🌧️ Rain expected today in {city}, take precautions!',
    storm: '⛈️ Warning: Thunderstorms in {city}, stay safe!',
    heat: '🌡️ High temperatures in {city} ({temp}°), stay hydrated!',
    cold: '❄️ Extreme cold in {city} ({temp}°), dress warmly!',
    snow: '🌨️ Snow expected in {city}, be careful!',
    weatherAlert: 'Weather Alert'
  }
};

class WeatherMonitor {
  private lastWeatherCode: number | null = null;
  private checkInterval: NodeJS.Timeout | null = null;
  private language: string = 'ar';

  setLanguage(lang: string): void {
    this.language = lang;
  }

  // Check if weather code indicates bad weather
  private detectWeatherAlert(code: number, temp: number): WeatherAlert | null {
    // Thunderstorm
    if (WEATHER_CODES.THUNDERSTORM.includes(code)) {
      return { type: 'storm', severity: 'high' };
    }

    // Rain
    if (WEATHER_CODES.RAIN.includes(code) || WEATHER_CODES.RAIN_SHOWERS.includes(code)) {
      return { type: 'rain', severity: code >= 63 ? 'high' : 'medium' };
    }

    // Snow
    if (WEATHER_CODES.SNOW.includes(code) || WEATHER_CODES.SNOW_SHOWERS.includes(code)) {
      return { type: 'snow', severity: 'medium' };
    }

    // Drizzle
    if (WEATHER_CODES.DRIZZLE.includes(code)) {
      return { type: 'rain', severity: 'low' };
    }

    // Extreme heat (above 40°C)
    if (temp >= 40) {
      return { type: 'heat', severity: 'high' };
    }

    // Extreme cold (below 0°C)
    if (temp <= 0) {
      return { type: 'cold', severity: 'medium' };
    }

    return null;
  }

  // Format message with city and temperature
  private formatMessage(template: string, city: string, temp: number): string {
    return template.replace('{city}', city).replace('{temp}', temp.toString());
  }

  // Get translated message
  private getTranslatedMessage(alertType: string, city: string, temp: number): { title: string; body: string } {
    const t = translations[this.language as keyof typeof translations] || translations.ar;
    const message = t[alertType as keyof typeof t] || '';
    
    return {
      title: t.weatherAlert,
      body: this.formatMessage(message as string, city, temp)
    };
  }

  // Check weather and send alert if needed
  async checkWeather(lat: number, lng: number): Promise<void> {
    try {
      // Get city name
      let cityName = '';
      try {
        const geoResponse = await fetch(`${WORKER_URL}/geocode?lat=${lat}&lon=${lng}`);
        if (geoResponse.ok) {
          const geoData = await geoResponse.json();
          cityName = geoData.features?.[0]?.properties?.city || 
                     geoData.features?.[0]?.properties?.state || 
                     geoData.features?.[0]?.properties?.name || '';
        }
      } catch (e) {
        console.log('Geocoding error:', e);
      }

      // Get weather data
      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code&timezone=auto`
      );

      if (!weatherResponse.ok) return;

      const data = await weatherResponse.json();
      const currentCode = data.current.weather_code;
      const currentTemp = Math.round(data.current.temperature_2m);

      // Only alert if weather changed significantly
      if (this.lastWeatherCode !== null) {
        const wasGoodWeather = WEATHER_CODES.CLEAR.includes(this.lastWeatherCode) || 
                               WEATHER_CODES.PARTLY_CLOUDY.includes(this.lastWeatherCode);
        const isBadNow = this.detectWeatherAlert(currentCode, currentTemp);

        // Send notification only if weather changed from good to bad
        if (wasGoodWeather && isBadNow) {
          const { title, body } = this.getTranslatedMessage(isBadNow.type, cityName, currentTemp);
          
          await notificationService.sendNotification(
            { title, body, data: { type: 'weather', alert: isBadNow.type } },
            `weather_${isBadNow.type}` // Unique key to prevent spam
          );
        }
      }

      this.lastWeatherCode = currentCode;
    } catch (error) {
      console.error('Weather check error:', error);
    }
  }

  // Start monitoring (check every 30 minutes)
  startMonitoring(lat: number, lng: number, intervalMinutes: number = 30): void {
    // Initial check
    this.checkWeather(lat, lng);

    // Set up interval
    this.checkInterval = setInterval(() => {
      this.checkWeather(lat, lng);
    }, intervalMinutes * 60 * 1000);

    console.log(`Weather monitoring started (every ${intervalMinutes} minutes)`);
  }

  // Stop monitoring
  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('Weather monitoring stopped');
    }
  }

  // Reset state
  reset(): void {
    this.lastWeatherCode = null;
  }
}

export const weatherMonitor = new WeatherMonitor();