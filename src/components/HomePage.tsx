import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { MapPin, ChevronRight, Sun, Loader2, Cloud, CloudRain, CloudSun, CloudDrizzle, CloudSnow } from 'lucide-react';
import { useLocation } from '../context/LocationContext';
import { WORKER_URL } from '../config/apiKeys';
import rihlatyLogo from '../logo/rihlaty logo home page.png';
import beachesImg from '../logo/beache.jpg';
import natureImg from '../logo/nature.jpg';
import historicalImg from '../logo/Historical.png';
import shoppingImg from '../logo/Shopping.png';
import restaurantsImg from '../logo/restaurants.png';
import hotelsImg from '../logo/hotels.jpg';
import aiLogoImg from '../logo/ailogo.png';

interface HomePageProps {
  language: string;
  onNavigateToBeaches?: () => void;
  onNavigateToNature?: () => void;
  onNavigateToHistorical?: () => void;
  onNavigateToHotels?: () => void;
  onNavigateToEat?: () => void;
  onNavigateToShopping?: () => void;
  onNavigateToAI?: () => void;
}

function HomePageContent({ 
  language, 
  onNavigateToBeaches,
  onNavigateToNature,
  onNavigateToHistorical,
  onNavigateToHotels,
  onNavigateToEat,
  onNavigateToShopping,
  onNavigateToAI
}: HomePageProps) {
  const { userLocation, isLoading: locationLoading } = useLocation();
  const [weather, setWeather] = useState<{
    temp: number | null;
    weatherCode: number | null;
    city: string;
  }>({
    temp: null,
    weatherCode: null,
    city: ''
  });

  const translations = {
    ar: {
      yourLocation: 'موقعك',
      hotels: 'فنادق قريبة',
      beaches: 'شواطئ',
      nature: 'طبيعة',
      historical: 'تاريخ',
      shopping: 'تسوق',
      restaurants: 'مطاعم',
      askAssistant: 'اسأل المساعد الذكي',
      askQuestion: 'وين نروح اليوم؟'
    },
    fr: {
      yourLocation: 'Votre position',
      hotels: 'Hôtels proches',
      beaches: 'Plages',
      nature: 'Nature',
      historical: 'Histoire',
      shopping: 'Shopping',
      restaurants: 'Restaurants',
      askAssistant: 'Demandez à l\'assistant IA',
      askQuestion: 'Où aller aujourd\'hui ?'
    },
    en: {
      yourLocation: 'Your Location',
      hotels: 'Nearby Hotels',
      beaches: 'Beaches',
      nature: 'Nature',
      historical: 'Historical',
      shopping: 'Shopping',
      restaurants: 'Restaurants',
      askAssistant: 'Ask AI Assistant',
      askQuestion: 'Where to go today?'
    }
  };
  const t = translations[language as keyof typeof translations] || translations.en;

  useEffect(() => {
    const fetchWeather = async () => {
      if (!userLocation) return;
      try {
        const geoResponse = await fetch(
          `${WORKER_URL}/geocode?lat=${userLocation.lat}&lon=${userLocation.lng}`
        );
        let cityName = '';
        if (geoResponse.ok) {
          const geoData = await geoResponse.json();
          cityName = geoData.features[0]?.properties?.city || 
                     geoData.features[0]?.properties?.state || 
                     geoData.features[0]?.properties?.name || '';
        }

        const weatherResponse = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${userLocation.lat}&longitude=${userLocation.lng}&current=temperature_2m,weather_code&timezone=auto`
        );

        if (weatherResponse.ok) {
          const data = await weatherResponse.json();
          setWeather({
            temp: Math.round(data.current.temperature_2m),
            weatherCode: data.current.weather_code,
            city: cityName
          });
        }
      } catch (error) {
        console.error('Error fetching weather:', error);
      }
    };

    fetchWeather();
  }, [userLocation]);

  const getWeatherIcon = (code: number | null) => {
    if (code === null) return null;
    if (code === 0) {
      return <Sun className="w-9 h-9 text-amber-400" strokeWidth={1.5} />;
    }
    if (code >= 1 && code <= 3) {
      return <CloudSun className="w-9 h-9 text-amber-300" strokeWidth={1.5} />;
    }
    if (code === 45 || code === 48) {
      return <Cloud className="w-9 h-9 text-gray-400" strokeWidth={1.5} />;
    }
    if (code >= 51 && code <= 55) {
      return <CloudDrizzle className="w-9 h-9 text-sky-400" strokeWidth={1.5} />;
    }
    if (code >= 61 && code <= 65) {
      return <CloudRain className="w-9 h-9 text-sky-500" strokeWidth={1.5} />;
    }
    if (code >= 71 && code <= 77) {
      return <CloudSnow className="w-9 h-9 text-sky-300" strokeWidth={1.5} />;
    }
    if (code >= 80 && code <= 99) {
      return <CloudRain className="w-9 h-9 text-sky-500" strokeWidth={1.5} />;
    }
    return <Cloud className="w-9 h-9 text-gray-300" strokeWidth={1.5} />;
  };

  const categories = [
    { id: 'hotels', name: t.hotels, image: hotelsImg, color: 'from-violet-700/80 via-violet-600/30 to-transparent', onClick: onNavigateToHotels },
    { id: 'beaches', name: t.beaches, image: beachesImg, color: 'from-cyan-600/80 via-cyan-600/40 to-transparent', onClick: onNavigateToBeaches },
    { id: 'nature', name: t.nature, image: natureImg, color: 'from-emerald-600/80 via-emerald-600/40 to-transparent', onClick: onNavigateToNature },
    { id: 'historical', name: t.historical, image: historicalImg, color: 'from-amber-600/80 via-amber-600/40 to-transparent', onClick: onNavigateToHistorical },
    { id: 'restaurants', name: t.restaurants, image: restaurantsImg, color: 'from-rose-600/80 via-rose-600/40 to-transparent', onClick: onNavigateToEat },
    { id: 'shopping', name: t.shopping, image: shoppingImg, color: 'from-pink-600/80 via-pink-600/40 to-transparent', onClick: onNavigateToShopping },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f1419] pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-teal-500 to-emerald-600 px-6 pt-14 pb-28 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: `radial-gradient(circle at 20px 20px, white 1.5px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-center relative z-10"
        >
          <img 
            src={rihlatyLogo} 
            alt="Rihlaty" 
            className="h-14 object-contain"
          />
        </motion.div>
      </div>

      <div className="px-4 -mt-20 relative z-10">
        {/* Location & Weather Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white dark:bg-dark-card rounded-3xl shadow-elevation-2 p-5 mb-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="bg-teal-50 dark:bg-teal-900/30 p-2.5 rounded-2xl flex-shrink-0">
                {locationLoading ? (
                  <Loader2 className="w-5 h-5 text-teal-600 dark:text-teal-400 animate-spin" />
                ) : (
                  <MapPin className="w-5 h-5 text-teal-600 dark:text-teal-400" strokeWidth={2} />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wider mb-0.5">{t.yourLocation}</p>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                  {locationLoading ? (
                    <span className="text-teal-600 dark:text-teal-400">جاري التحديد...</span>
                  ) : userLocation?.address ? (
                    userLocation.address
                  ) : weather.city ? (
                    weather.city
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500">غير محدد</span>
                  )}
                </p>
              </div>
            </div>
            {weather.temp !== null && weather.weatherCode !== null && (
              <div className="flex items-center gap-2 flex-shrink-0 bg-slate-50 dark:bg-dark-card-high rounded-2xl px-3 py-2">
                {getWeatherIcon(weather.weatherCode)}
                <span className="text-2xl font-light text-gray-800 dark:text-gray-100 tabular-nums">
                  {weather.temp}°
                </span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Categories Grid - 2 per row */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {categories.map((category, index) => (
            <motion.button
              key={category.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + index * 0.05 }}
              whileTap={{ scale: 0.97 }}
              onClick={category.onClick}
              className="relative rounded-3xl overflow-hidden h-[110px] shadow-elevation-1"
            >
              <img 
                src={category.image} 
                alt={category.name}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className={`absolute inset-0 bg-gradient-to-t ${category.color}`} />
              <div className="relative z-10 h-full flex items-end justify-center pb-3.5">
                <span className="text-white text-sm font-bold drop-shadow-lg text-center px-1">{category.name}</span>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Ask Assistant CTA */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          whileTap={{ scale: 0.98 }}
          onClick={onNavigateToAI}
          className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-3xl p-4 shadow-elevation-2"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl overflow-hidden">
                <img src={aiLogoImg} alt={t.askAssistant} className="w-full h-full object-cover" />
              </div>
              <div className="text-left">
                <p className="text-white font-bold text-[15px] mb-0.5">{t.askAssistant}</p>
                <p className="text-white/75 text-sm">"{t.askQuestion}"</p>
              </div>
            </div>
            <div className="bg-white/20 rounded-full p-2">
              <ChevronRight className="w-5 h-5 text-white" />
            </div>
          </div>
        </motion.button>
      </div>
    </div>
  );
}

export function HomePage(props: HomePageProps) {
  return <HomePageContent {...props} />;
}
