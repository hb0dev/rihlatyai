import { motion } from 'motion/react';
import { Home, Compass, MessageCircle, User } from 'lucide-react';
interface BottomNavProps {
  language: string;
  currentScreen: string;
  onNavigate: (screen: string) => void;
}
export function BottomNav({ language, currentScreen, onNavigate }: BottomNavProps) {
  const translations = {
    ar: {
      home: 'الرئيسية',
      explore: 'استكشف',
      ai: 'AI',
      profile: 'حسابي'
    },
    fr: {
      home: 'Accueil',
      explore: 'Explorer',
      ai: 'AI',
      profile: 'Profil'
    },
    en: {
      home: 'Home',
      explore: 'Explore',
      ai: 'AI',
      profile: 'Profile'
    }
  };
  const t = translations[language as keyof typeof translations] || translations.en;
  const navItems = [
    { id: 'home', label: t.home, icon: Home },
    { id: 'explore', label: t.explore, icon: Compass },
    { id: 'ai', label: t.ai, icon: MessageCircle },
    { id: 'profile', label: t.profile, icon: User }
  ];
  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      className="fixed bottom-0 left-0 right-0 z-50"
    >
      <div className="bg-white/95 dark:bg-dark-card/95 backdrop-blur-xl border-t border-gray-100/80 dark:border-gray-800/50 shadow-elevation-3">
        <div className="flex items-center justify-around px-2 pt-3 pb-2 max-w-lg mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentScreen === item.id;
            return (
              <motion.button
                key={item.id}
                whileTap={{ scale: 0.9 }}
                onClick={() => onNavigate(item.id)}
                className="relative flex flex-col items-center justify-center gap-0.5 w-16 min-h-[52px]"
              >
                {/* Material 3 pill indicator */}
                <div className="relative flex items-center justify-center w-16 h-8">
                  {isActive && (
                    <motion.div
                      layoutId="navPill"
                      className="absolute inset-0 mx-1 bg-teal-100 dark:bg-teal-900/40 rounded-full"
                      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    />
                  )}
                  <Icon 
                    className={`w-[22px] h-[22px] relative z-10 transition-colors duration-150 ${
                      isActive ? 'text-teal-600 dark:text-teal-300' : 'text-gray-500 dark:text-gray-400'
                    }`} 
                    strokeWidth={isActive ? 2.5 : 1.8} 
                  />
                </div>
                
                {/* Label */}
                <span 
                  className={`text-[11px] leading-tight transition-colors duration-150 ${
                    isActive 
                      ? 'text-teal-600 dark:text-teal-300 font-bold' 
                      : 'text-gray-500 dark:text-gray-400 font-medium'
                  }`}
                >
                  {item.label}
                </span>
              </motion.button>
            );
          })}
        </div>
        
        {/* Safe area padding for devices with home indicator */}
        <div className="h-safe-area-inset-bottom" />
      </div>
    </motion.div>
  );
}
