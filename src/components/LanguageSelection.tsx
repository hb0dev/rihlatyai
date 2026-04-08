import { motion } from 'motion/react';
import logo from '../logo/rihlaty logo.png';
interface LanguageSelectionProps {
  onLanguageSelect: (language: string) => void;
}
export function LanguageSelection({ onLanguageSelect }: LanguageSelectionProps) {
  const languages = [
    { code: 'ar', name: 'العربية', flag: '🇩🇿' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'en', name: 'English', flag: '🇬🇧' }
  ];
  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center p-6">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-emerald-900 to-teal-900">
        {/* Mesh gradient overlay */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 -left-40 w-80 h-80 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" />
          <div className="absolute top-0 -right-40 w-80 h-80 bg-teal-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
          <div className="absolute -bottom-40 left-20 w-80 h-80 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{ animationDelay: '4s' }} />
        </div>
        {/* Decorative pattern */}
        <div className="absolute inset-0 opacity-[0.06]" style={{
          backgroundImage: `radial-gradient(circle at 25px 25px, rgba(255,255,255,0.3) 1.5px, transparent 0)`,
          backgroundSize: '50px 50px'
        }} />
      </div>

      {/* Content */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ duration: 0.6, type: 'spring' }}
        className="mb-8 relative z-10"
      >
        <div className="w-32 h-32 bg-white/10 backdrop-blur-sm rounded-full p-3 shadow-elevation-3">
          <img src={logo} alt="Rihlaty Logo" className="w-full h-full drop-shadow-2xl" />
        </div>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-white text-3xl font-bold mb-2 relative z-10"
      >
        رحلتي - Rihlaty
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-emerald-200/80 text-center mb-12 relative z-10 text-sm"
      >
        اختر لغتك المفضلة / Choisissez votre langue
      </motion.p>

      <div className="w-full max-w-sm space-y-3 relative z-10">
        {languages.map((lang, index) => (
          <motion.button
            key={lang.code}
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 + index * 0.1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onLanguageSelect(lang.code)}
            className="w-full bg-white/95 dark:bg-dark-card/95 backdrop-blur-xl rounded-2xl px-5 py-4 flex items-center justify-between shadow-elevation-2 hover:shadow-elevation-3 transition-shadow"
          >
            <div className="flex items-center gap-4">
              <span className="text-3xl">{lang.flag}</span>
              <span className="text-gray-800 dark:text-gray-100 font-semibold text-lg">{lang.name}</span>
            </div>
            <div className="bg-teal-50 dark:bg-teal-900/30 rounded-full p-2">
              <svg
                className="w-5 h-5 text-teal-600 dark:text-teal-400"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
