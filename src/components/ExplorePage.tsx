import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Loader2, Navigation, MapPin, Clock, X, Bus, Hospital, Fuel } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useLocation } from '../context/LocationContext';
import { WORKER_URL } from '../config/apiKeys';
interface ExplorePageProps {
  language: string;
  destination?: {
    name: string;
    lat: number;
    lng: number;
  } | null;
  onClearDestination?: () => void;
}
interface SearchResult {
  name: string;
  lat: number;
  lng: number;
  address: string;
}

const userIcon = L.divIcon({
  html: '<div style="width:18px;height:18px;background:#14b8a6;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>',
  className: '',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});
const destIcon = L.divIcon({
  html: `<svg width="30" height="42" viewBox="0 0 30 42" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))">
    <path d="M15 0C6.7 0 0 6.7 0 15c0 10.5 15 27 15 27s15-16.5 15-27C30 6.7 23.3 0 15 0z" fill="#ef4444"/>
    <circle cx="15" cy="14" r="6" fill="white"/>
  </svg>`,
  className: '',
  iconSize: [30, 42],
  iconAnchor: [15, 42],
});
function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let shift = 0, result = 0, b;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);
    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);
    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

function MapController({ userLat, userLng, destLat, destLng }: {
  userLat: number;
  userLng: number;
  destLat?: number;
  destLng?: number;
}) {
  const map = useMap();
  const hasFitted = useRef(false);

  useEffect(() => {
    if (destLat !== undefined && destLng !== undefined) {
      const bounds = L.latLngBounds(
        [userLat, userLng],
        [destLat, destLng]
      );
      map.fitBounds(bounds, { padding: [80, 80] });
      hasFitted.current = true;
    } else if (!hasFitted.current) {
      map.setView([userLat, userLng], 12);
    }
  }, [destLat, destLng, userLat, userLng, map]);

  return null;
}

export function ExplorePage({ language, destination, onClearDestination }: ExplorePageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searching, setSearching] = useState(false);
  const { userLocation, isLoading } = useLocation();
  const [routeStarted, setRouteStarted] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number } | null>(null);
  const [localDestination, setLocalDestination] = useState<{ name: string; lat: number; lng: number } | null>(null);
  const [quickSearching, setQuickSearching] = useState<string | null>(null);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);

  const translations = {
    ar: {
      explore: 'استكشف',
      search: 'ابحث عن وجهة...',
      loading: 'جاري التحميل...',
      startRoute: 'ابدأ الرحلة',
      cancelRoute: 'إلغاء الرحلة',
      distance: 'المسافة',
      duration: 'المدة',
      km: 'كم',
      min: 'دقيقة',
      busStation: 'محطة حافلات',
      hospital: 'مستشفى',
      fuel: 'وقود',
      searching: 'جاري البحث...'
    },
    fr: {
      explore: 'Explorer',
      search: 'Rechercher une destination...',
      loading: 'Chargement...',
      startRoute: 'Démarrer',
      cancelRoute: 'Annuler le trajet',
      distance: 'Distance',
      duration: 'Durée',
      km: 'km',
      min: 'min',
      busStation: 'Gare routière',
      hospital: 'Hôpital',
      fuel: 'Carburant',
      searching: 'Recherche...'
    },
    en: {
      explore: 'Explore',
      search: 'Search for a destination...',
      loading: 'Loading...',
      startRoute: 'Start Route',
      cancelRoute: 'Cancel Route',
      distance: 'Distance',
      duration: 'Duration',
      km: 'km',
      min: 'min',
      busStation: 'Bus Station',
      hospital: 'Hospital',
      fuel: 'Fuel',
      searching: 'Searching...'
    }
  };

  const t = translations[language as keyof typeof translations] || translations.en;
  const currentDestination = localDestination || destination;

  // Fetch directions when destination changes
  useEffect(() => {
    if (!currentDestination || !userLocation) return;

    setRouteStarted(false);
    setRouteCoords([]);

    const fetchDirections = async () => {
      try {
        const response = await fetch(
          `${WORKER_URL}/directions?origin=${userLocation.lat},${userLocation.lng}&destination=${currentDestination.lat},${currentDestination.lng}`
        );
        const data = await response.json();

        if (data.status === 'OK' && data.routes?.length > 0) {
          const leg = data.routes[0].legs[0];
          setRouteInfo({
            distance: parseFloat((leg.distance.value / 1000).toFixed(1)),
            duration: Math.round(leg.duration.value / 60),
          });
          const points = decodePolyline(data.routes[0].overview_polyline.points);
          setRouteCoords(points);
        }
      } catch (error) {
        console.error('Error fetching directions:', error);
      }
    };

    fetchDirections();
  }, [currentDestination, userLocation]);

  // Search autocomplete
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(
          `${WORKER_URL}/autocomplete?text=${encodeURIComponent(searchQuery)}&limit=5`
        );
        const data = await response.json();

        if (data.features) {
          const results: SearchResult[] = data.features.map((feature: any) => ({
            name: feature.properties.name || feature.properties.formatted,
            lat: feature.properties.lat,
            lng: feature.properties.lon,
            address: feature.properties.formatted
          }));
          setSearchResults(results);
          setShowResults(true);
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setSearching(false);
      }
    }, 500);

    return () => clearTimeout(searchTimeout);
  }, [searchQuery]);

  const handleSearchResultClick = (result: SearchResult) => {
    setLocalDestination(result);
    setSearchQuery('');
    setShowResults(false);
    setSearchResults([]);
  };

  const handleQuickSearch = async (category: 'bus' | 'hospital' | 'fuel') => {
    if (!userLocation) return;

    setQuickSearching(category);
    setShowResults(false);
    setSearchQuery('');

    const categoryMap = {
      bus: 'public_transport',
      hospital: 'healthcare.hospital',
      fuel: 'service.vehicle.fuel'
    };

    try {
      const response = await fetch(
        `${WORKER_URL}/places?categories=${categoryMap[category]}&filter=circle:${userLocation.lng},${userLocation.lat},15000&bias=proximity:${userLocation.lng},${userLocation.lat}&limit=10`
      );
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        let closest = data.features[0];
        let minDist = Infinity;

        for (const f of data.features) {
          const plat = f.geometry.coordinates[1];
          const plng = f.geometry.coordinates[0];
          const d = Math.pow(plat - userLocation.lat, 2) + Math.pow(plng - userLocation.lng, 2);
          if (d < minDist) {
            minDist = d;
            closest = f;
          }
        }

        setLocalDestination({
          name: closest.properties.name || closest.properties.address_line1 || category,
          lat: closest.geometry.coordinates[1],
          lng: closest.geometry.coordinates[0]
        });
      }
    } catch (error) {
      console.error('Quick search error:', error);
    } finally {
      setQuickSearching(null);
    }
  };

  const handleStartRoute = () => {
    setRouteStarted(true);
  };

  const handleClearDestination = () => {
    setRouteStarted(false);
    setRouteInfo(null);
    setRouteCoords([]);
    setLocalDestination(null);
    onClearDestination?.();
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-slate-50 dark:bg-[#0f1419]">
      {/* Map - Full Screen */}
      <div className="absolute inset-0">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-50 dark:bg-[#0f1419] z-10">
            <div className="text-center bg-white dark:bg-dark-card p-6 rounded-2xl shadow-elevation-1 border border-gray-100/80 dark:border-gray-700/30">
              <Loader2 className="w-10 h-10 text-teal-500 dark:text-teal-400 animate-spin mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">{t.loading}</p>
            </div>
          </div>
        ) : userLocation ? (
          <MapContainer
            center={[userLocation.lat, userLocation.lng]}
            zoom={12}
            style={{ width: '100%', height: '100%' }}
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapController
              userLat={userLocation.lat}
              userLng={userLocation.lng}
              destLat={currentDestination?.lat}
              destLng={currentDestination?.lng}
            />

            {/* User location marker */}
            <Marker
              position={[userLocation.lat, userLocation.lng]}
              icon={userIcon}
            />

            {/* Destination marker */}
            {currentDestination && (
              <Marker
                position={[currentDestination.lat, currentDestination.lng]}
                icon={destIcon}
              />
            )}

            {/* Route polyline */}
            {routeStarted && routeCoords.length > 0 && (
              <Polyline
                positions={routeCoords}
                pathOptions={{
                  color: '#14b8a6',
                  weight: 5,
                  opacity: 0.9,
                }}
              />
            )}
          </MapContainer>
        ) : null}
      </div>

      {/* Floating Search Bar */}
      <div className="absolute top-5 left-4 right-4 z-[1000]">
        <div className="relative">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setShowResults(true)}
            placeholder={t.search}
            className="w-full pl-4 pr-12 py-3.5 bg-white dark:bg-dark-card rounded-2xl shadow-elevation-2 border border-gray-100/80 dark:border-gray-700/30 focus:outline-none focus:border-teal-400 dark:focus:border-teal-500 focus:ring-2 focus:ring-teal-100 dark:focus:ring-teal-900/30 text-gray-800 dark:text-gray-100 transition-all placeholder-gray-400 dark:placeholder-gray-500"
          />

          {/* Search Results Dropdown */}
          <AnimatePresence>
            {showResults && searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full mt-2 left-0 right-0 bg-white dark:bg-dark-card rounded-2xl shadow-elevation-2 border border-gray-100/80 dark:border-gray-700/30 overflow-hidden max-h-64 overflow-y-auto"
              >
                {searchResults.map((result, index) => (
                  <motion.button
                    key={index}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSearchResultClick(result)}
                    className="w-full px-4 py-3 text-left border-b border-gray-50 dark:border-gray-700/20 last:border-b-0 active:bg-teal-50 dark:active:bg-teal-900/20 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="bg-teal-50 dark:bg-teal-900/20 p-2 rounded-xl flex-shrink-0 mt-0.5">
                        <MapPin className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 dark:text-gray-100 truncate">{result.name}</p>
                        <p className="text-sm text-gray-400 dark:text-gray-500 truncate">{result.address}</p>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading indicator for search */}
          {searching && (
            <div className="absolute top-full mt-2 left-0 right-0 bg-white dark:bg-dark-card rounded-2xl shadow-elevation-2 border border-gray-100/80 dark:border-gray-700/30 p-4 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-teal-500 dark:text-teal-400 animate-spin" />
            </div>
          )}
        </div>

        {/* Quick Action Buttons */}
        <AnimatePresence>
          {!routeStarted && !showResults && !currentDestination && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex gap-2 mt-3"
            >
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => handleQuickSearch('bus')}
                disabled={quickSearching !== null}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white dark:bg-dark-card rounded-2xl shadow-elevation-1 border border-gray-100/80 dark:border-gray-700/30 text-gray-700 dark:text-gray-200 text-sm font-medium disabled:opacity-70 transition-all active:bg-slate-50 dark:active:bg-dark-card-high"
              >
                {quickSearching === 'bus' ? (
                  <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                ) : (
                  <Bus className="w-4 h-4 text-blue-500" />
                )}
                <span className="truncate">{t.busStation}</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => handleQuickSearch('hospital')}
                disabled={quickSearching !== null}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white dark:bg-dark-card rounded-2xl shadow-elevation-1 border border-gray-100/80 dark:border-gray-700/30 text-gray-700 dark:text-gray-200 text-sm font-medium disabled:opacity-70 transition-all active:bg-slate-50 dark:active:bg-dark-card-high"
              >
                {quickSearching === 'hospital' ? (
                  <Loader2 className="w-4 h-4 text-red-500 animate-spin" />
                ) : (
                  <Hospital className="w-4 h-4 text-red-500" />
                )}
                <span className="truncate">{t.hospital}</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => handleQuickSearch('fuel')}
                disabled={quickSearching !== null}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white dark:bg-dark-card rounded-2xl shadow-elevation-1 border border-gray-100/80 dark:border-gray-700/30 text-gray-700 dark:text-gray-200 text-sm font-medium disabled:opacity-70 transition-all active:bg-slate-50 dark:active:bg-dark-card-high"
              >
                {quickSearching === 'fuel' ? (
                  <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
                ) : (
                  <Fuel className="w-4 h-4 text-amber-500" />
                )}
                <span className="truncate">{t.fuel}</span>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Cancel Route Button */}
      <AnimatePresence>
        {routeStarted && (
          <motion.button
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            transition={{ type: 'spring', damping: 20 }}
            onClick={handleClearDestination}
            className="absolute top-24 left-1/2 -translate-x-1/2 z-[1000] bg-red-500 text-white px-5 py-2.5 rounded-2xl shadow-lg shadow-red-500/20 font-medium flex items-center gap-2 active:bg-red-600 transition-colors"
          >
            <X className="w-4 h-4" />
            {t.cancelRoute}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Destination Info Card */}
      <AnimatePresence>
        {currentDestination && routeInfo && !routeStarted && (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed inset-0 flex items-center justify-center pointer-events-none"
            style={{ zIndex: 9999 }}
          >
            <div
              className="bg-white dark:bg-dark-card rounded-3xl shadow-elevation-3 border border-gray-100/80 dark:border-gray-700/30 overflow-hidden pointer-events-auto"
              style={{
                width: 'calc(100% - 40px)',
                maxWidth: '380px',
                marginBottom: '80px'
              }}
            >
              <div className="bg-gradient-to-br from-teal-500 to-emerald-500 px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <MapPin className="w-5 h-5 text-white flex-shrink-0" />
                  <h3 className="text-white font-semibold truncate">{currentDestination.name}</h3>
                </div>
                <button
                  onClick={handleClearDestination}
                  className="p-2 hover:bg-white/20 rounded-xl transition-colors flex-shrink-0"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              <div className="p-5">
                <div className="flex items-center justify-around mb-5 bg-slate-50 dark:bg-dark-card-high rounded-2xl p-4">
                  <div className="flex items-center gap-2">
                    <div className="bg-teal-50 dark:bg-teal-900/20 p-2 rounded-xl">
                      <Navigation className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{t.distance}</p>
                      <p className="text-lg font-bold text-teal-600 dark:text-teal-400">{routeInfo.distance} {t.km}</p>
                    </div>
                  </div>
                  <div className="w-px h-10 bg-gray-200 dark:bg-gray-700" />
                  <div className="flex items-center gap-2">
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded-xl">
                      <Clock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{t.duration}</p>
                      <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{routeInfo.duration} {t.min}</p>
                    </div>
                  </div>
                </div>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleStartRoute}
                  className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-2xl font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20"
                >
                  <Navigation className="w-5 h-5" />
                  {t.startRoute}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
