import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ShoppingBag, ArrowRight, MapPin, Loader2, Star } from 'lucide-react';
import { useLocation } from '../context/LocationContext';
import { WORKER_URL } from '../config/apiKeys';
import { LocationPrompt } from './LocationPrompt';
import { PlaceDetailModal } from './PlaceDetailModal';
interface ShoppingPageProps {
  language: string;
  onNavigateBack?: () => void;
  onSelectPlace?: (place: { name: string; lat: number; lng: number }) => void;
}
interface ShoppingPlace {
  name: string;
  lat: number;
  lng: number;
  distance: number;
  address: string;
  category: string;
  rating?: number;
  user_ratings_total?: number;
  place_id?: string;
}
export function ShoppingPage({ language, onNavigateBack, onSelectPlace }: ShoppingPageProps) {
  const { userLocation, isLoading: locationLoading, requestLocationPermission } = useLocation();
  const [shops, setShops] = useState<ShoppingPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [requestingLocation, setRequestingLocation] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<ShoppingPlace | null>(null);
  const translations = {
    ar: {
      title: 'التسوق القريب',
      subtitle: 'اكتشف أماكن التسوق بالقرب منك',
      loading: 'جاري البحث...',
      noResults: 'لم يتم العثور على أماكن تسوق قريبة',
      km: 'كم',
      back: 'رجوع',
      mall: 'مركز تسوق',
      supermarket: 'سوبرماركت',
      shop: 'متجر'
    },
    fr: {
      title: 'Shopping à Proximité',
      subtitle: 'Découvrez les lieux de shopping près de vous',
      loading: 'Recherche en cours...',
      noResults: 'Aucun lieu de shopping trouvé',
      km: 'km',
      back: 'Retour',
      mall: 'Centre commercial',
      supermarket: 'Supermarché',
      shop: 'Boutique'
    },
    en: {
      title: 'Nearby Shopping',
      subtitle: 'Discover shopping places near you',
      loading: 'Searching...',
      noResults: 'No shopping places found nearby',
      km: 'km',
      back: 'Back',
      mall: 'Shopping Mall',
      supermarket: 'Supermarket',
      shop: 'Shop'
    }
  };

  const t = translations[language as keyof typeof translations] || translations.en;

  useEffect(() => {
    if (userLocation) {
      fetchShops();
    }
  }, [userLocation]);

  const fetchShops = async () => {
    if (!userLocation) return;

    setLoading(true);
    try {
      const response = await fetch(
        `${WORKER_URL}/places?categories=commercial.shopping_mall,commercial.supermarket,commercial.department_store,commercial.marketplace&filter=circle:${userLocation.lng},${userLocation.lat},50000&bias=proximity:${userLocation.lng},${userLocation.lat}&limit=30`
      );

      const data = await response.json();

      if (data.features) {
        const shopsList: ShoppingPlace[] = data.features.map((feature: any) => {
          const props = feature.properties;
          const coords = feature.geometry.coordinates;
          
          const distance = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            coords[1],
            coords[0]
          );

          let category = t.shop;
          const types = props.categories || [];
          if (types.includes('shopping_mall')) {
            category = t.mall;
          } else if (types.includes('supermarket')) {
            category = t.supermarket;
          }

          return {
            name: props.name || props.address_line1 || 'Shop',
            lat: coords[1],
            lng: coords[0],
            distance: distance,
            address: props.address_line2 || props.city || '',
            category: category,
            rating: props.rating,
            user_ratings_total: props.user_ratings_total,
            place_id: props.place_id
          };
        });

        shopsList.sort((a, b) => a.distance - b.distance);
        setShops(shopsList);
      }
    } catch (error) {
      console.error('Error fetching shopping places:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleShopClick = (shop: ShoppingPlace) => {
    setSelectedPlace(shop);
  };

  const handleNavigate = () => {
    if (selectedPlace) {
      onSelectPlace?.(selectedPlace);
      setSelectedPlace(null);
    }
  };

  const handleRequestLocation = async () => {
    setRequestingLocation(true);
    await requestLocationPermission();
    setRequestingLocation(false);
  };

  const showLocationPrompt = !locationLoading && !userLocation;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f1419] pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-pink-500 to-rose-500 px-5 pt-12 pb-8 rounded-b-3xl">
        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onNavigateBack}
          className="mb-5 flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl text-white hover:bg-white/30 transition-colors ml-auto"
        >
          <span className="font-medium text-sm">{t.back}</span>
          <ArrowRight className="w-4 h-4" />
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-3"
        >
          <div className="bg-white/20 backdrop-blur-sm p-3 rounded-2xl">
            <ShoppingBag className="w-7 h-7 text-white" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-white text-xl font-bold">{t.title}</h1>
            <p className="text-white/70 text-sm">{t.subtitle}</p>
          </div>
        </motion.div>
      </div>

      {/* Content */}
      <div className="px-4 mt-5">
        {showLocationPrompt ? (
          <LocationPrompt 
            language={language} 
            onRequestLocation={handleRequestLocation}
            isLoading={requestingLocation}
          />
        ) : locationLoading || loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="bg-white dark:bg-dark-card p-6 rounded-2xl shadow-elevation-1 border border-gray-100/80 dark:border-gray-700/30">
              <Loader2 className="w-10 h-10 text-pink-500 dark:text-pink-400 animate-spin mb-3 mx-auto" />
              <p className="text-gray-500 dark:text-gray-400">{t.loading}</p>
            </div>
          </div>
        ) : shops.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="bg-white dark:bg-dark-card p-8 rounded-2xl shadow-elevation-1 border border-gray-100/80 dark:border-gray-700/30">
              <ShoppingBag className="w-14 h-14 text-gray-200 dark:text-gray-700 mb-3 mx-auto" />
              <p className="text-gray-500 dark:text-gray-400">{t.noResults}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {shops.map((shop, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleShopClick(shop)}
                className="bg-white dark:bg-dark-card rounded-2xl p-4 border border-gray-100/80 dark:border-gray-700/30 shadow-elevation-1 active:bg-slate-50 dark:active:bg-dark-card-high transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="bg-pink-50 dark:bg-pink-900/20 p-2.5 rounded-2xl">
                    <ShoppingBag className="w-6 h-6 text-pink-500 dark:text-pink-400" strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-0.5 truncate">{shop.name}</h3>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-pink-500 dark:text-pink-400 font-medium">{shop.category}</span>
                      {shop.rating && (
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-amber-400" fill="currentColor" strokeWidth={0} />
                          <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">{shop.rating.toFixed(1)}</span>
                          <span className="text-xs text-gray-400">({shop.user_ratings_total || 0})</span>
                        </div>
                      )}
                    </div>
                    {shop.address && (
                      <p className="text-sm text-gray-400 dark:text-gray-500 mb-1.5 truncate">{shop.address}</p>
                    )}
                    <div className="flex items-center gap-1.5 text-pink-600 dark:text-pink-400">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        {shop.distance.toFixed(1)} {t.km}
                      </span>
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-dark-card-high p-2 rounded-xl">
                    <ArrowRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      {selectedPlace && (
        <PlaceDetailModal
          place={selectedPlace}
          language={language}
          onNavigate={handleNavigate}
          onClose={() => setSelectedPlace(null)}
        />
      )}
    </div>
  );
}