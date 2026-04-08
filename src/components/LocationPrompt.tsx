import { motion } from 'motion/react';
import { MapPin, Navigation } from 'lucide-react';

interface LocationPromptProps {
  language: string;
  onRequestLocation: () => void;
  isLoading?: boolean;
}

export function LocationPrompt({ language, onRequestLocation, isLoading }: LocationPromptProps) {
  const translations = {
    ar: {
      title: 'تفعيل الموقع',
      description: 'نحتاج إلى الوصول لموقعك لعرض الأماكن القريبة منك',
      enableButton: 'تفعيل الموقع',
      loading: 'جاري تحديد الموقع...'
    },
    fr: {
      title: 'Activer la localisation',
      description: 'Nous avons besoin d\'accéder à votre position pour afficher les lieux à proximité',
      enableButton: 'Activer la localisation',
      loading: 'Localisation en cours...'
    },
    en: {
      title: 'Enable Location',
      description: 'We need access to your location to show nearby places',
      enableButton: 'Enable Location',
      loading: 'Getting location...'
    }
  };

  const t = translations[language as keyof typeof translations] || translations.en;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center p-8 text-center"
    >
      <motion.div
        animate={{ 
          scale: [1, 1.1, 1],
          rotate: [0, 5, -5, 0]
        }}
        transition={{ 
          duration: 2,
          repeat: Infinity,
          repeatType: "reverse"
        }}
        className="w-20 h-20 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-teal-500/20"
      >
        <MapPin className="w-10 h-10 text-white" />
      </motion.div>
      
      <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-2">
        {t.title}
      </h2>
      
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 max-w-xs leading-relaxed">
        {t.description}
      </p>
      
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onRequestLocation}
        disabled={isLoading}
        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-medium rounded-2xl shadow-lg shadow-teal-500/20 disabled:opacity-70 transition-all"
      >
        {isLoading ? (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Navigation className="w-5 h-5" />
            </motion.div>
            {t.loading}
          </>
        ) : (
          <>
            <Navigation className="w-5 h-5" />
            {t.enableButton}
          </>
        )}
      </motion.button>
    </motion.div>
  );
}
