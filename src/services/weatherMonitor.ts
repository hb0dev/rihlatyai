import { notificationService } from './notificationService';
import { WORKER_URL } from '../config/apiKeys';

interface WeatherAlert {
  type: 'rain' | 'storm' | 'heat' | 'cold' | 'snow';
  severity: 'low' | 'medium' | 'high';
}

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
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private language: string = 'ar';
  private consecutiveFailures = 0;
  private readonly MAX_FAILURES = 3;

  setLanguage(lang: string): void {
    this.language = lang;
  }

  private detectWeatherAlert(code: number, temp: number): WeatherAlert | null {
    if (WEATHER_CODES.THUNDERSTORM.includes(code)) {
      return { type: 'storm', severity: 'high' };
    }
    if (WEATHER_CODES.RAIN.includes(code) || WEATHER_CODES.RAIN_SHOWERS.includes(code)) {
      return { type: 'rain', severity: code >= 63 ? 'high' : 'medium' };
    }
    if (WEATHER_CODES.SNOW.includes(code) || WEATHER_CODES.SNOW_SHOWERS.includes(code)) {
      return { type: 'snow', severity: 'medium' };
    }
    if (WEATHER_CODES.DRIZZLE.includes(code)) {
      return { type: 'rain', severity: 'low' };
    }
    if (temp >= 40) {
      return { type: 'heat', severity: 'high' };
    }
    if (temp <= 0) {
      return { type: 'cold', severity: 'medium' };
    }
    return null;
  }

  private formatMessage(template: string, city: string, temp: number): string {
    return template.replace('{city}', city || '---').replace('{temp}', temp.toString());
  }

  private getTranslatedMessage(alertType: string, city: string, temp: number): { title: string; body: string } {
    const t = translations[this.language as keyof typeof translations] || translations.ar;
    const message = t[alertType as keyof typeof t] || '';

    return {
      title: t.weatherAlert,
      body: this.formatMessage(message as string, city, temp)
    };
  }

  async checkWeather(lat: number, lng: number): Promise<void> {
    try {
      let cityName = '';
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const geoResponse = await fetch(
          `${WORKER_URL}/geocode?lat=${lat}&lon=${lng}`,
          { signal: controller.signal }
        );
        clearTimeout(timeoutId);
        if (geoResponse.ok) {
          const geoData = await geoResponse.json();
          cityName = geoData.features?.[0]?.properties?.city ||
                     geoData.features?.[0]?.properties?.state ||
                     geoData.features?.[0]?.properties?.name || '';
        }
      } catch {
        // Geocoding is non-critical
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code&timezone=auto`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);

      if (!weatherResponse.ok) {
        throw new Error(`Weather API returned ${weatherResponse.status}`);
      }

      const data = await weatherResponse.json();
      if (!data.current || data.current.temperature_2m == null || data.current.weather_code == null) {
        throw new Error('Invalid weather data structure');
      }

      const currentCode = data.current.weather_code;
      const currentTemp = Math.round(data.current.temperature_2m);

      this.consecutiveFailures = 0;

      if (this.lastWeatherCode !== null) {
        const wasGoodWeather = WEATHER_CODES.CLEAR.includes(this.lastWeatherCode) ||
                               WEATHER_CODES.PARTLY_CLOUDY.includes(this.lastWeatherCode);
        const isBadNow = this.detectWeatherAlert(currentCode, currentTemp);

        if (wasGoodWeather && isBadNow) {
          const { title, body } = this.getTranslatedMessage(isBadNow.type, cityName, currentTemp);
          await notificationService.sendNotification(
            { title, body, data: { type: 'weather', alert: isBadNow.type } },
            `weather_${isBadNow.type}`
          );
        }
      }

      this.lastWeatherCode = currentCode;
    } catch (error) {
      this.consecutiveFailures++;
      console.error(`Weather check error (${this.consecutiveFailures}/${this.MAX_FAILURES}):`, error);

      if (this.consecutiveFailures >= this.MAX_FAILURES) {
        console.warn('Too many weather failures, pausing monitoring');
        this.stopMonitoring();
      }
    }
  }

  startMonitoring(lat: number, lng: number, intervalMinutes: number = 30): void {
    this.stopMonitoring();
    this.consecutiveFailures = 0;

    this.checkWeather(lat, lng);

    this.checkInterval = setInterval(() => {
      this.checkWeather(lat, lng);
    }, intervalMinutes * 60 * 1000);
  }

  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  reset(): void {
    this.lastWeatherCode = null;
    this.consecutiveFailures = 0;
  }
}

export const weatherMonitor = new WeatherMonitor();
