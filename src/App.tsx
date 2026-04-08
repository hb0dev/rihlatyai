import { useState, useEffect } from 'react';
import { LanguageSelection } from './components/LanguageSelection';
import { Login } from './components/Login';
import { HomePage } from './components/HomePage';
import { ExplorePage } from './components/ExplorePage';
import { ProfilePage } from './components/ProfilePage';
import { AIPage } from './components/AIPage';
import { BeachesPage } from './components/BeachesPage';
import { NaturePage } from './components/NaturePage';
import { HistoricalPage } from './components/HistoricalPage';
import { HotelsPage } from './components/HotelsPage';
import { EatPage } from './components/EatPage';
import { ShoppingPage } from './components/ShoppingPage';
import { PrivacyPolicyPage } from './components/PrivacyPolicyPage';
import { SubscribePage } from './components/SubscribePage';
import { ProUpgradeModal } from './components/ProUpgradeModal';
import { BottomNav } from './components/BottomNav';
import { useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
type Screen = 'language' | 'login' | 'home' | 'explore' | 'profile' | 'ai' | 'beaches' | 'nature' | 'historical' | 'hotels' | 'eat' | 'shopping' | 'privacy' | 'subscribe';
interface Destination {
  name: string;
  lat: number;
  lng: number;
}

function App() {
  const { user, loading } = useAuth();
  const [language, setLanguage] = useState<string>('ar');
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [initialized, setInitialized] = useState(false);
  
  const [currentScreen, setCurrentScreen] = useState<Screen>('language');
  const isLoggedIn = !!user;

  useEffect(() => {
    if (loading) return;
    
    const savedLanguage = localStorage.getItem('appLanguage');
    
    if (savedLanguage) {
      setLanguage(savedLanguage);
    }

    const path = window.location.pathname;
    
    if (path === '/privacy') {
      setCurrentScreen('privacy');
      setInitialized(true);
      return;
    }

    if (path === '/subscribe') {
      setCurrentScreen('subscribe');
      setInitialized(true);
      return;
    }

    if (user) {
      setCurrentScreen('home');
    } else if (savedLanguage) {
      setCurrentScreen('login');
    } else {
      setCurrentScreen('language');
    }
    
    setInitialized(true);
  }, [user, loading]);

  const handleLanguageSelect = (lang: string) => {
    setLanguage(lang);
    localStorage.setItem('appLanguage', lang);
    setCurrentScreen('login');
  };
  const handleLoginSuccess = () => {
    setCurrentScreen('home');
  };

  const handleLogout = () => {
    // After logout, go to login screen (language is already saved)
    setCurrentScreen('login');
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'language':
        return <LanguageSelection onLanguageSelect={handleLanguageSelect} />;
      case 'login':
        return (
          <Login
            language={language}
            onLoginSuccess={handleLoginSuccess}
          />
        );
      case 'home':
        return (
          <HomePage
            language={language}
            onNavigateToBeaches={() => setCurrentScreen('beaches')}
            onNavigateToNature={() => setCurrentScreen('nature')}
            onNavigateToHistorical={() => setCurrentScreen('historical')}
            onNavigateToHotels={() => setCurrentScreen('hotels')}
            onNavigateToEat={() => setCurrentScreen('eat')}
            onNavigateToAI={() => setCurrentScreen('ai')}
            onNavigateToShopping={() => setCurrentScreen('shopping')}
          />
        );
      case 'explore':
        return (
          <ExplorePage
            language={language}
            destination={selectedDestination}
            onClearDestination={() => setSelectedDestination(null)}
          />
        );
      case 'profile':
        return (
          <ProfilePage
            language={language}
            onLogout={handleLogout}
            onLanguageChange={(lang) => {
              setLanguage(lang);
              localStorage.setItem('appLanguage', lang);
            }}
          />
        );
      case 'ai':
        return <AIPage language={language} onNavigateBack={() => setCurrentScreen('home')} />;
      case 'beaches':
        return (
          <BeachesPage
            language={language}
            onNavigateBack={() => setCurrentScreen('home')}
            onSelectPlace={(place) => {
              setSelectedDestination(place);
              setCurrentScreen('explore');
            }}
          />
        );
      case 'nature':
        return (
          <NaturePage
            language={language}
            onNavigateBack={() => setCurrentScreen('home')}
            onSelectPlace={(place) => {
              setSelectedDestination(place);
              setCurrentScreen('explore');
            }}
          />
        );
      case 'historical':
        return (
          <HistoricalPage
            language={language}
            onNavigateBack={() => setCurrentScreen('home')}
            onSelectPlace={(place) => {
              setSelectedDestination(place);
              setCurrentScreen('explore');
            }}
          />
        );
      case 'hotels':
        return (
          <HotelsPage
            language={language}
            onNavigateBack={() => setCurrentScreen('home')}
            onSelectPlace={(place) => {
              setSelectedDestination(place);
              setCurrentScreen('explore');
            }}
          />
        );
      case 'eat':
        return (
          <EatPage
            language={language}
            onNavigateBack={() => setCurrentScreen('home')}
            onSelectPlace={(place) => {
              setSelectedDestination(place);
              setCurrentScreen('explore');
            }}
          />
        );
      case 'shopping':
        return (
          <ShoppingPage
            language={language}
            onNavigateBack={() => setCurrentScreen('home')}
            onSelectPlace={(place) => {
              setSelectedDestination(place);
              setCurrentScreen('explore');
            }}
          />
        );
      case 'privacy':
        return (
          <PrivacyPolicyPage
            language={language}
            onNavigateBack={() => {
              window.history.pushState({}, '', '/');
              setCurrentScreen('login');
            }}
          />
        );
      case 'subscribe':
        return (
          <SubscribePage
            language={language}
            onNavigateBack={() => {
              window.history.pushState({}, '', '/');
              setCurrentScreen(user ? 'home' : 'login');
            }}
          />
        );
      default:
        return <LanguageSelection onLanguageSelect={handleLanguageSelect} />;
    }
  };

  const showBottomNav = isLoggedIn && !['language', 'login', 'beaches', 'nature', 'historical', 'hotels', 'eat', 'shopping', 'privacy', 'subscribe'].includes(currentScreen);

  // Show loading screen while initializing
  if (loading || !initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <NotificationProvider language={language}>
      <div className="relative">
        {renderScreen()}
        {showBottomNav && (
          <BottomNav
            language={language}
            currentScreen={currentScreen}
            onNavigate={(screen) => setCurrentScreen(screen as Screen)}
          />
        )}
        <ProUpgradeModal language={language} />
      </div>
    </NotificationProvider>
  );
}

export default App;
