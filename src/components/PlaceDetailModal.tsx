import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MapPin, Phone, Star, Navigation, Loader2 } from 'lucide-react';
import { WORKER_URL } from '../config/apiKeys';
export interface PlaceInfo {
  name: string;
  lat: number;
  lng: number;
  address?: string;
  rating?: number;
  user_ratings_total?: number;
  place_id?: string;
}
interface PlaceDetails {
  name: string;
  address: string;
  phone: string;
  rating: number;
  user_ratings_total: number;
  photos: { reference: string; width: number; height: number }[];
  opening_hours?: { open_now?: boolean };
}
interface PlaceDetailModalProps {
  place: PlaceInfo;
  language: string;
  onNavigate: () => void;
  onClose: () => void;
}
export function PlaceDetailModal({ place, language, onNavigate, onClose }: PlaceDetailModalProps) {
  const [details, setDetails] = useState<PlaceDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPhoto, setCurrentPhoto] = useState(0);
  const [imgError, setImgError] = useState(false);
  const touchStartX = useRef(0);
  const translations = {
    ar: { navigate: 'اذهب للخريطة', noPhotos: 'لا توجد صور', open: 'مفتوح الآن', closed: 'مغلق', reviews: 'تقييم' },
    fr: { navigate: 'Voir sur la carte', noPhotos: 'Pas de photos', open: 'Ouvert', closed: 'Fermé', reviews: 'avis' },
    en: { navigate: 'View on Map', noPhotos: 'No photos', open: 'Open now', closed: 'Closed', reviews: 'reviews' },
  };
  const t = translations[language as keyof typeof translations] || translations.en;
  useEffect(() => {
    if (place.place_id) {
      fetchDetails();
    } else {
      setLoading(false);
    }
  }, []);
  const fetchDetails = async () => {
    try {
      const res = await fetch(`${WORKER_URL}/place-details?place_id=${place.place_id}`);
      const data = await res.json();
      if (!data.error) setDetails(data);
    } catch (e) {
      console.error('Error fetching place details:', e);
    } finally {
      setLoading(false);
    }
  };
  const photoUrl = (ref: string) => `${WORKER_URL}/place-photo?ref=${ref}&maxwidth=600`;
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!details?.photos?.length) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 50 && currentPhoto < details.photos.length - 1) {
      setCurrentPhoto(p => p + 1);
      setImgError(false);
    } else if (diff < -50 && currentPhoto > 0) {
      setCurrentPhoto(p => p - 1);
      setImgError(false);
    }
  };

  const rating = details?.rating || place.rating;
  const totalRatings = details?.user_ratings_total || place.user_ratings_total;
  const photos = details?.photos || [];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-5"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 30 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-sm bg-white dark:bg-dark-card rounded-3xl overflow-hidden shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Photo Area */}
          <div
            className="relative h-52 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-gray-800 dark:to-gray-900"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
              </div>
            ) : photos.length > 0 && !imgError ? (
              <div className="relative w-full h-full">
                <img
                  src={photoUrl(photos[currentPhoto].reference)}
                  alt={place.name}
                  className="w-full h-full object-cover"
                  onError={() => setImgError(true)}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full">
                <MapPin className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-2" />
                <span className="text-sm text-gray-400 dark:text-gray-500">{t.noPhotos}</span>
              </div>
            )}

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-9 h-9 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center active:bg-black/60 transition-colors"
            >
              <X className="w-4.5 h-4.5 text-white" />
            </button>

            {/* Photo dots */}
            {photos.length > 1 && !imgError && (
              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                {photos.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { setCurrentPhoto(i); setImgError(false); }}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === currentPhoto ? 'bg-white w-5' : 'bg-white/50 w-1.5'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Photo gradient overlay */}
            {photos.length > 0 && !imgError && !loading && (
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/30 to-transparent" />
            )}
          </div>

          {/* Info */}
          <div className="p-5">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2 leading-tight">
              {details?.name || place.name}
            </h3>

            {/* Rating */}
            {rating && (
              <div className="flex items-center gap-1.5 mb-3">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star
                      key={s}
                      className={`w-4 h-4 ${s <= Math.round(rating) ? 'text-amber-400' : 'text-gray-200 dark:text-gray-700'}`}
                      fill={s <= Math.round(rating) ? 'currentColor' : 'none'}
                      strokeWidth={s <= Math.round(rating) ? 0 : 1.5}
                    />
                  ))}
                </div>
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{rating.toFixed(1)}</span>
                {totalRatings && (
                  <span className="text-xs text-gray-400">({totalRatings} {t.reviews})</span>
                )}
              </div>
            )}

            {/* Open/Closed */}
            {details?.opening_hours && (
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-2 h-2 rounded-full ${details.opening_hours.open_now ? 'bg-emerald-500' : 'bg-red-500'}`} />
                <span className={`text-sm font-medium ${
                  details.opening_hours.open_now ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
                }`}>
                  {details.opening_hours.open_now ? t.open : t.closed}
                </span>
              </div>
            )}

            {/* Address */}
            {(details?.address || place.address) && (
              <div className="flex items-start gap-2.5 mb-3">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  {details?.address || place.address}
                </p>
              </div>
            )}

            {/* Phone */}
            {details?.phone && (
              <a
                href={`tel:${details.phone}`}
                className="flex items-center gap-2.5 mb-5 bg-slate-50 dark:bg-dark-card-high rounded-2xl px-4 py-3 active:bg-slate-100 dark:active:bg-gray-700 transition-colors"
              >
                <div className="bg-teal-50 dark:bg-teal-900/30 p-1.5 rounded-lg">
                  <Phone className="w-4 h-4 text-teal-500" />
                </div>
                <span className="text-sm font-semibold text-teal-600 dark:text-teal-400" dir="ltr">
                  {details.phone}
                </span>
              </a>
            )}

            {/* Navigate button */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={onNavigate}
              className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-2xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20 active:shadow-md transition-shadow"
            >
              <Navigation className="w-5 h-5" />
              {t.navigate}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
