import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Bot, User, ArrowRight, Loader2, Sparkles, Menu, X, MessageSquare, Plus, Trash2, Zap, Star, MapPin, Phone, Search, Globe, CheckCircle2, Lock } from 'lucide-react';
import aiLogo from '../logo/ailogo.png';
import { useLocation } from '../context/LocationContext';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { LocationPrompt } from './LocationPrompt';
import { sendMessageToAI, getQuickSuggestions, Place, UserContext, AIModel } from '../services/aiService';
import { collection, doc, setDoc, getDocs, query, orderBy, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { WORKER_URL } from '../config/apiKeys';
const thinkingSteps = {
  ar: [
    { icon: Search, text: 'البحث في الويب...' },
    { icon: Globe, text: 'تحليل البيانات...' },
    { icon: MapPin, text: 'البحث عن الأماكن...' },
  ],
  fr: [
    { icon: Search, text: 'Recherche sur le web...' },
    { icon: Globe, text: 'Analyse des données...' },
    { icon: MapPin, text: 'Recherche de lieux...' },
  ],
  en: [
    { icon: Search, text: 'Searching the web...' },
    { icon: Globe, text: 'Analyzing data...' },
    { icon: MapPin, text: 'Finding places...' },
  ],
};
function ThinkingSteps({ language, model }: { language: string; model: AIModel }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const steps = thinkingSteps[language as keyof typeof thinkingSteps] || thinkingSteps.en;
  useEffect(() => {
    if (model !== 'gemini') return;
    const interval = setInterval(() => {
      setCurrentStep(prev => {
        const next = prev + 1;
        if (next < steps.length) {
          setCompletedSteps(c => [...c, prev]);
          return next;
        }
        return prev;
      });
    }, 2500);
    return () => clearInterval(interval);
  }, [model, steps.length]);

  if (model !== 'gemini') {
    return (
      <div className="flex items-center gap-1.5 px-1">
        <motion.span className="w-2 h-2 bg-teal-500 rounded-full" animate={{ y: [0, -6, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} />
        <motion.span className="w-2 h-2 bg-teal-500 rounded-full" animate={{ y: [0, -6, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }} />
        <motion.span className="w-2 h-2 bg-teal-500 rounded-full" animate={{ y: [0, -6, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }} />
      </div>
    );
  }

  return (
    <div className="min-w-[180px] space-y-2.5">
      {steps.map((step, i) => {
        const isCompleted = completedSteps.includes(i);
        const isCurrent = i === currentStep;
        const isPending = i > currentStep;
        const Icon = step.icon;

        if (isPending) return null;

        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2"
          >
            {isCompleted ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" />
            ) : (
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}>
                <Icon className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
              </motion.div>
            )}
            <span className={`text-[13px] ${
              isCompleted
                ? 'text-gray-400 dark:text-gray-500'
                : 'text-gray-600 dark:text-gray-300'
            }`}>
              {step.text}
            </span>
            {isCurrent && (
              <motion.span
                animate={{ opacity: [1, 0.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="w-1 h-1 bg-teal-500 rounded-full ml-0.5"
              />
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
function parseMessageContent(text: string): { type: 'text' | 'place'; content: string; placeId?: string; placeName?: string }[] {
  // Strip raw {pid:...} tags that the AI might copy from place data
  let cleaned = text.replace(/\s*\{pid:[^}]+\}/g, '');

  const parts: { type: 'text' | 'place'; content: string; placeId?: string; placeName?: string }[] = [];
  const regex = /\[PLACE:([^:]+):([^\]]+)\]/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(cleaned)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: cleaned.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'place', content: '', placeId: match[1], placeName: match[2] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < cleaned.length) {
    parts.push({ type: 'text', content: cleaned.slice(lastIndex) });
  }
  return parts.length > 0 ? parts : [{ type: 'text', content: cleaned }];
}

function AIPlaceCard({ placeId, placeName }: { placeId: string; placeName: string; language: string }) {
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [imgErrors, setImgErrors] = useState<Set<number>>(new Set());
  const { isPro, setShowUpgradeModal } = useSubscription();

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await fetch(`${WORKER_URL}/place-details?place_id=${placeId}`);
        const data = await res.json();
        if (!data.error) setDetails(data);
      } catch (e) {
        console.error('Error fetching place for AI card:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [placeId]);

  const photoUrl = (ref: string) => `${WORKER_URL}/place-photo?ref=${ref}&maxwidth=400`;

  if (loading) {
    return (
      <div className="my-3 rounded-2xl overflow-hidden bg-slate-50 dark:bg-dark-card-high animate-pulse">
        <div className="h-36 bg-gray-200 dark:bg-gray-700" />
        <div className="p-3 space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (!details) return null;

  const photos = (details.photos || []).filter((_: any, i: number) => !imgErrors.has(i)).slice(0, 2);

  return (
    <div className="my-3 rounded-2xl overflow-hidden border border-gray-100/80 dark:border-gray-700/30 bg-white dark:bg-dark-card shadow-sm">
      {photos.length > 0 && (
        <div className={`relative grid ${photos.length > 1 ? 'grid-cols-2 gap-0.5' : 'grid-cols-1'} h-36`}>
          {photos.map((photo: any, i: number) => (
            <img
              key={i}
              src={photoUrl(photo.reference)}
              alt={placeName}
              className={`w-full h-full object-cover ${!isPro ? 'blur-lg scale-105' : ''}`}
              onError={() => setImgErrors(prev => new Set(prev).add(i))}
            />
          ))}
          {!isPro && (
            <button onClick={() => setShowUpgradeModal(true)} className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="bg-black/50 backdrop-blur-sm rounded-xl px-4 py-2.5 flex items-center gap-2">
                <Lock className="w-4 h-4 text-white" />
                <span className="text-white text-xs font-bold">PRO</span>
              </div>
            </button>
          )}
        </div>
      )}
      <div className="p-3">
        <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100 mb-1.5">{details.name || placeName}</h4>
        {details.rating && (
          <div className="flex items-center gap-1.5 mb-2">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map(s => (
                <Star
                  key={s}
                  className={`w-3.5 h-3.5 ${s <= Math.round(details.rating) ? 'text-amber-400' : 'text-gray-200 dark:text-gray-600'}`}
                  fill={s <= Math.round(details.rating) ? 'currentColor' : 'none'}
                  strokeWidth={s <= Math.round(details.rating) ? 0 : 1.5}
                />
              ))}
            </div>
            <span className="text-xs font-bold text-gray-600 dark:text-gray-400">{details.rating?.toFixed(1)}</span>
            {details.user_ratings_total && (
              <span className="text-xs text-gray-400">({details.user_ratings_total})</span>
            )}
          </div>
        )}
        {details.opening_hours && (
          <div className="flex items-center gap-1.5 mb-2">
            <div className={`w-1.5 h-1.5 rounded-full ${details.opening_hours.open_now ? 'bg-emerald-500' : 'bg-red-500'}`} />
            <span className={`text-xs font-medium ${details.opening_hours.open_now ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
              {details.opening_hours.open_now ? 'مفتوح' : 'مغلق'}
            </span>
          </div>
        )}
        {details.address && (
          <div className="flex items-start gap-1.5 mb-1.5">
            <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
            <span className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{details.address}</span>
          </div>
        )}
        {details.phone && (
          <a href={`tel:${details.phone}`} className="flex items-center gap-1.5 mt-2.5 bg-teal-50 dark:bg-teal-900/20 rounded-xl px-3 py-2 active:bg-teal-100 dark:active:bg-teal-900/40 transition-colors">
            <Phone className="w-3.5 h-3.5 text-teal-500" />
            <span className="text-xs font-semibold text-teal-600 dark:text-teal-400" dir="ltr">{details.phone}</span>
          </a>
        )}
      </div>
    </div>
  );
}

interface AIPageProps {
  language: string;
  onNavigateBack?: () => void;
}
interface Message {
  id: string;
  type: 'user' | 'ai';
  text: string;
  timestamp: Date;
  model?: AIModel;
}
interface SavedConversation {
  id: string;
  title: string;
  messages: Message[];
  history: { role: 'user' | 'model'; text: string }[];
  createdAt: string;
  updatedAt: string;
}
export function AIPage({ language, onNavigateBack }: AIPageProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
  const [placesData, setPlacesData] = useState<Place[]>([]);
  const [selectedModel, setSelectedModel] = useState<AIModel>('openrouter');
  const [requestingLocation, setRequestingLocation] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [savedConversations, setSavedConversations] = useState<SavedConversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { userLocation, isLoading: locationLoading, requestLocationPermission } = useLocation();
  const { user } = useAuth();
  const { canSendMessage, messagesRemaining, dailyMessageLimit, isPro, incrementMessageCount, setShowUpgradeModal } = useSubscription();
  useEffect(() => {
    const loadConversations = async () => {
      if (!user) {
        setSavedConversations([]);
        setLoadingConversations(false);
        return;
      }

      try {
        const conversationsRef = collection(db, 'users', user.uid, 'conversations');
        const q = query(conversationsRef, orderBy('updatedAt', 'desc'));
        const snapshot = await getDocs(q);
        
        const conversations: SavedConversation[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (!data.deletedByUser) {
            conversations.push(data as SavedConversation);
          }
        });
        
        setSavedConversations(conversations);
      } catch (error) {
        console.error('Error loading conversations:', error);
      } finally {
        setLoadingConversations(false);
      }
    };

    loadConversations();
  }, [user]);
  const saveConversation = async (conversation: SavedConversation) => {
    if (!user) return;
    try {
      const convRef = doc(db, 'users', user.uid, 'conversations', conversation.id);
      await setDoc(convRef, conversation);
    } catch (error) {
      console.error('Error saving conversation:', error);
    }
  };
  useEffect(() => {
    if (messages.length > 0 && user) {
      const title = messages[0].text.slice(0, 30) + (messages[0].text.length > 30 ? '...' : '');
      if (currentConversationId) {
        const updatedConversation: SavedConversation = {
          id: currentConversationId,
          title: savedConversations.find(c => c.id === currentConversationId)?.title || title,
          messages,
          history: conversationHistory,
          createdAt: savedConversations.find(c => c.id === currentConversationId)?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        saveConversation(updatedConversation);
        setSavedConversations(prev => 
          prev.map(conv => conv.id === currentConversationId ? updatedConversation : conv)
        );
      } else {
        // Create new conversation
        const newId = Date.now().toString();
        const newConversation: SavedConversation = {
          id: newId,
          title,
          messages,
          history: conversationHistory,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        setCurrentConversationId(newId);
        saveConversation(newConversation);
        setSavedConversations(prev => [newConversation, ...prev]);
      }
    }
  }, [messages, user]);

  // Load a saved conversation
  const loadConversation = (conv: SavedConversation) => {
    setMessages(conv.messages.map(m => ({ ...m, timestamp: new Date(m.timestamp) })));
    setConversationHistory(conv.history);
    setCurrentConversationId(conv.id);
    setSidebarOpen(false);
  };
  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    try {
      const convRef = doc(db, 'users', user.uid, 'conversations', id);
      await updateDoc(convRef, {
        deletedByUser: true,
        deletedAt: new Date().toISOString()
      });
      setSavedConversations(prev => prev.filter(conv => conv.id !== id));

      if (currentConversationId === id) {
        setMessages([]);
        setConversationHistory([]);
        setCurrentConversationId(null);
      }
    } catch (error) {
    }
  };

  // Start new conversation
  const startNewConversation = () => {
    setMessages([]);
    setConversationHistory([]);
    setCurrentConversationId(null);
    setSidebarOpen(false);
  };

  useEffect(() => {
    if (userLocation) {
      fetchAllPlaces();
    }
  }, [userLocation]);

  const fetchAllPlaces = async () => {
    if (!userLocation) return;
    
    const allPlaces: Place[] = [];
    
    try {
      const categories = [
        { cat: 'beach', label: 'beach', radius: 150000 },
        { cat: 'natural,national_park,leisure.park', label: 'nature', radius: 100000 },
        { cat: 'heritage,tourism.sights,building.historic', label: 'historical', radius: 100000 },
        { cat: 'natural.desert,tourism.attraction', label: 'desert', radius: 200000 },
        { cat: 'accommodation.hotel', label: 'hotel', radius: 50000 },
        { cat: 'catering.restaurant,catering.fast_food,catering.cafe', label: 'restaurant', radius: 30000 }
      ];
      const fetchPromises = categories.map(async ({ cat, label, radius }) => {
        try {
          const response = await fetch(
            `${WORKER_URL}/places?categories=${cat}&filter=circle:${userLocation.lng},${userLocation.lat},${radius}&bias=proximity:${userLocation.lng},${userLocation.lat}&limit=20`
          );
          if (response.ok) {
            const data = await response.json();
            if (data.features) {
              return data.features
                .filter((feature: any) => feature.properties.name)
                .map((feature: any, index: number) => {
                  const props = feature.properties;
                  const coords = feature.geometry.coordinates;
                  return {
                    id: `${label}-${index}`,
                    name: props.name,
                    province: props.state || props.county || '',
                    city: props.city || props.suburb || props.district || '',
                    category: label,
                    coordinates: { lat: coords[1], lon: coords[0] },
                    place_id: props.place_id,
                    rating: props.rating,
                    user_ratings_total: props.user_ratings_total
                  };
                });
            }
          }
          return [];
        } catch (error) {
          console.error(`Error fetching ${label}:`, error);
          return [];
        }
      });

      const results = await Promise.all(fetchPromises);
      results.forEach(places => allPlaces.push(...places));
      
      setPlacesData(allPlaces);
      console.log('Loaded places for AI:', allPlaces.length, allPlaces.filter(p => p.category === 'beach').length, 'beaches');
    } catch (error) {
      console.error('Error fetching places:', error);
    }
  };

  const translations = {
    ar: {
      title: 'RIHLATY-AI',
      subtitle: 'مساعدك السياحي الذكي',
      newChat: 'محادثة جديدة',
      placeholder: 'اكتب سؤالك هنا...',
      you: 'أنت',
      ai: 'AI',
      clearConfirm: 'هل أنت متأكد من مسح المحادثة؟',
      yes: 'نعم',
      no: 'لا',
      back: 'رجوع',
      suggestions: 'اقتراحات سريعة',
      history: 'المحادثات السابقة',
      noHistory: 'لا توجد محادثات سابقة',
      deleteChat: 'حذف',
      modelOpenRouter: 'Gemini 2.0',
      modelGemini: 'Gemini 3 Flash',
    },
    fr: {
      title: 'RIHLATY-AI',
      subtitle: 'Votre Assistant Touristique IA',
      newChat: 'Nouvelle Discussion',
      placeholder: 'Écrivez votre question ici...',
      you: 'Vous',
      ai: 'AI',
      clearConfirm: 'Êtes-vous sûr de vouloir effacer la conversation?',
      yes: 'Oui',
      no: 'Non',
      back: 'Retour',
      suggestions: 'Suggestions rapides',
      history: 'Historique des discussions',
      noHistory: 'Aucune discussion précédente',
      deleteChat: 'Supprimer',
      modelOpenRouter: 'Gemini 2.0',
      modelGemini: 'Gemini 3 Flash',
    },
    en: {
      title: 'RIHLATY-AI',
      subtitle: 'Your AI Tourism Assistant',
      newChat: 'New Chat',
      placeholder: 'Type your question here...',
      you: 'You',
      ai: 'AI',
      clearConfirm: 'Are you sure you want to clear the conversation?',
      yes: 'Yes',
      no: 'No',
      back: 'Back',
      suggestions: 'Quick suggestions',
      history: 'Chat History',
      noHistory: 'No previous chats',
      deleteChat: 'Delete',
      modelOpenRouter: 'Gemini 2.0',
      modelGemini: 'Gemini 3 Flash',
    }
  };

  const t = translations[language as keyof typeof translations] || translations.en;
  const quickSuggestions = getQuickSuggestions(language);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    if (!canSendMessage) {
      setShowUpgradeModal(true);
      return;
    }

    const userText = text.trim();
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      text: userText,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    
    const userContext: UserContext = {
      coordinates: userLocation ? { lat: userLocation.lat, lon: userLocation.lng } : null,
      locationLabel: userLocation?.address || 'غير محدد',
      language: language
    };

    try {
      const response = await sendMessageToAI(
        userText,
        userContext,
        placesData,
        conversationHistory,
        selectedModel
      );

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        text: response.text,
        timestamp: new Date(),
        model: selectedModel
      };

      setMessages(prev => [...prev, aiMessage]);
      setConversationHistory(prev => [
        ...prev,
        { role: 'user', text: userText },
        { role: 'model', text: response.text }
      ]);
      incrementMessageCount();

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        text: language === 'ar' 
          ? 'عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.' 
          : language === 'fr'
          ? 'Désolé, une erreur s\'est produite. Veuillez réessayer.'
          : 'Sorry, an error occurred. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    if (messages.length === 0) return;
    startNewConversation();
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(language === 'ar' ? 'ar-DZ' : language === 'fr' ? 'fr-FR' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleRequestLocation = async () => {
    setRequestingLocation(true);
    await requestLocationPermission();
    setRequestingLocation(false);
  };

  const showLocationPrompt = !locationLoading && !userLocation;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f1419] flex flex-col overflow-hidden relative">
      {/* Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/40 dark:bg-black/60 z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ x: language === 'ar' ? -300 : 300 }}
            animate={{ x: 0 }}
            exit={{ x: language === 'ar' ? -300 : 300 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`fixed top-0 ${language === 'ar' ? 'left-0' : 'right-0'} w-72 h-full bg-white dark:bg-dark-card z-50 shadow-elevation-3 flex flex-col`}
          >
            {/* Sidebar Header */}
            <div className="bg-gradient-to-br from-teal-500 to-emerald-600 px-5 pt-14 pb-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-bold text-lg">{t.history}</h2>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center hover:bg-white/25 transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
              
              {/* New Chat Button */}
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={startNewConversation}
                className="w-full flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 px-4 py-3 rounded-2xl text-white font-medium transition-colors"
              >
                <Plus className="w-5 h-5" />
                {t.newChat}
              </motion.button>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto p-4">
              {loadingConversations ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
                </div>
              ) : savedConversations.length === 0 ? (
                <div className="text-center py-10">
                  <MessageSquare className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-400 dark:text-gray-500 text-sm">{t.noHistory}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {savedConversations.map((conv) => (
                    <motion.div
                      key={conv.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => loadConversation(conv)}
                      className={`p-3 rounded-2xl cursor-pointer transition-all ${
                        currentConversationId === conv.id
                          ? 'bg-teal-50 dark:bg-teal-900/30 border-2 border-teal-400 dark:border-teal-600'
                          : 'bg-slate-50 dark:bg-dark-card-high hover:bg-slate-100 dark:hover:bg-dark-surface border-2 border-transparent'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <MessageSquare className="w-4 h-4 text-teal-500 dark:text-teal-400 flex-shrink-0" />
                            <p className="font-medium text-gray-800 dark:text-gray-100 text-sm truncate" dir="auto">
                              {conv.title}
                            </p>
                          </div>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            {new Date(conv.updatedAt).toLocaleDateString(
                              language === 'ar' ? 'ar-DZ' : language === 'fr' ? 'fr-FR' : 'en-US'
                            )}
                          </p>
                        </div>
                        <button
                          onClick={(e) => deleteConversation(conv.id, e)}
                          className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="bg-gradient-to-br from-teal-500 to-emerald-600 px-5 pt-14 pb-6">
        {/* Top Row: Back & Menu */}
        <div className="flex items-center justify-between mb-4">
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onNavigateBack}
            className="flex items-center gap-2 bg-white/15 px-4 py-2 rounded-xl text-white hover:bg-white/25 transition-colors"
          >
            <span className="font-medium text-sm">{t.back}</span>
            <ArrowRight className="w-4 h-4" />
          </motion.button>
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSidebarOpen(true)}
            className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center hover:bg-white/25 transition-colors"
          >
            <Menu className="w-5 h-5 text-white" />
          </motion.button>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center p-2">
              <img 
                src={aiLogo} 
                alt="AI Logo" 
                className="w-full h-full object-contain"
              />
            </div>
              <div>
              <h1 className="text-white text-xl font-bold tracking-tight">{t.title}</h1>
              <div className="flex items-center gap-2">
                <p className="text-white/65 text-sm">{t.subtitle}</p>
                {isPro && <span className="bg-teal-300/20 text-teal-200 text-[10px] font-bold px-1.5 py-0.5 rounded-md">PRO</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => !isPro && setShowUpgradeModal(true)}
              className={`px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-colors ${
                messagesRemaining <= 3 && !isPro ? 'bg-red-500/30 border border-red-300/40 text-red-100'
                : messagesRemaining <= 5 && !isPro ? 'bg-amber-500/30 border border-amber-300/40 text-amber-100'
                : 'bg-white/15 text-white/90'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{messagesRemaining}/{dailyMessageLimit}</span>
            </button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (selectedModel === 'openrouter') {
                  setSelectedModel('gemini');
                } else {
                  setSelectedModel('openrouter');
                }
              }}
              className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors ${
                selectedModel === 'gemini' 
                  ? 'bg-purple-500/30 border border-purple-300/40' 
                  : 'bg-white/15 hover:bg-white/25'
              }`}
              title={selectedModel === 'gemini' ? t.modelGemini : t.modelOpenRouter}
            >
              <Zap className={`w-4 h-4 ${selectedModel === 'gemini' ? 'text-purple-200' : 'text-white/80'}`} />
              <span className="text-white text-xs font-semibold">
                {selectedModel === 'gemini' ? '3' : '2.0'}
              </span>
            </motion.button>
            {messages.length > 0 && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleNewChat}
                className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center hover:bg-white/25 transition-colors"
              >
                <Plus className="w-5 h-5 text-white" />
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-4 py-5 pb-40"
        style={{ scrollBehavior: 'smooth' }}
      >
        {showLocationPrompt ? (
          <LocationPrompt 
            language={language} 
            onRequestLocation={handleRequestLocation}
            isLoading={requestingLocation}
          />
        ) : messages.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full"
          >
            <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-full flex items-center justify-center mb-5 shadow-elevation-2">
              <Bot className="w-10 h-10 text-white" strokeWidth={1.5} />
            </div>
            
            <p className="text-gray-400 dark:text-gray-500 text-center text-base font-medium px-4 mb-8">
              {t.subtitle}
            </p>
            <div className="w-full max-w-md px-2">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-teal-500 dark:text-teal-400" />
                <p className="text-sm text-gray-500 dark:text-gray-400 font-semibold">{t.suggestions}</p>
              </div>
              <div className="space-y-2.5">
                {quickSuggestions.slice(0, 3).map((suggestion, index) => (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * index }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSendMessage(suggestion)}
                    className="w-full bg-white dark:bg-dark-card rounded-2xl p-4 text-right text-gray-700 dark:text-gray-200 border border-gray-100/80 dark:border-gray-700/50 hover:border-teal-200 dark:hover:border-teal-700 hover:bg-teal-50/30 dark:hover:bg-teal-900/10 transition-all shadow-elevation-1 text-sm"
                    dir="auto"
                  >
                    {suggestion}
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-2.5 max-w-[85%] ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.type === 'user' 
                      ? 'bg-gradient-to-br from-teal-500 to-emerald-600' 
                      : 'bg-slate-100 dark:bg-dark-card-high'
                  }`}>
                    {message.type === 'user' ? (
                      <User className="w-4 h-4 text-white" />
                    ) : (
                      <Bot className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                    )}
                  </div>
                  <div>
                    <div className={`rounded-2xl px-4 py-3 ${
                      message.type === 'user'
                        ? 'bg-teal-500 text-white rounded-tr-md'
                        : 'bg-white dark:bg-dark-card text-gray-800 dark:text-gray-100 rounded-tl-md shadow-elevation-1'
                    }`}>
                      {message.type === 'ai' ? (
                        <div className="text-[14px] leading-relaxed" dir="auto">
                          {parseMessageContent(message.text).map((part, i) =>
                            part.type === 'place' ? (
                              <AIPlaceCard key={i} placeId={part.placeId!} placeName={part.placeName!} language={language} />
                            ) : (
                              <p key={i} className="whitespace-pre-line">{part.content}</p>
                            )
                          )}
                        </div>
                      ) : (
                        <p className="whitespace-pre-line text-[14px] leading-relaxed" dir="auto">
                          {message.text}
                        </p>
                      )}
                    </div>
                    <p className={`text-[11px] text-gray-400 dark:text-gray-500 mt-1.5 ${message.type === 'user' ? 'text-right' : 'text-left'}`}>
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
            <AnimatePresence>
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex justify-start"
                >
                  <div className="flex gap-2.5 max-w-[85%]">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-slate-100 dark:bg-dark-card-high">
                      <Bot className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                    </div>
                    <div className="bg-white dark:bg-dark-card rounded-2xl rounded-tl-md shadow-elevation-1 px-4 py-3.5">
                      <ThinkingSteps language={language} model={selectedModel} />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="fixed bottom-20 left-0 right-0 px-3 sm:px-5 pb-3 sm:pb-4 bg-gradient-to-t from-slate-50 dark:from-[#0f1419] via-slate-50/95 dark:via-[#0f1419]/95 to-transparent pt-4 sm:pt-6 safe-area-bottom">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ y: 50 }}
            animate={{ y: 0 }}
            className="bg-white dark:bg-dark-card rounded-2xl p-2 sm:p-2.5 flex items-end gap-2 border border-gray-200/80 dark:border-gray-700/50 shadow-elevation-2"
          >
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                // Auto-resize textarea
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(inputText);
                  if (inputRef.current) {
                    inputRef.current.style.height = '44px';
                  }
                }
              }}
              placeholder={t.placeholder}
              dir="auto"
              rows={1}
              className="flex-1 bg-slate-50 dark:bg-dark-card-high rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 outline-none resize-none text-sm sm:text-base text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 border border-gray-100/80 dark:border-gray-700/30 focus:border-teal-300 dark:focus:border-teal-600 transition-colors disabled:opacity-50"
              style={{ minHeight: '44px', maxHeight: '120px' }}
            />
            
            {/* Send Button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                handleSendMessage(inputText);
                if (inputRef.current) {
                  inputRef.current.style.height = '44px';
                }
              }}
              disabled={!inputText.trim() || isLoading}
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center transition-all flex-shrink-0 ${
                inputText.trim() && !isLoading
                  ? 'bg-teal-500 shadow-elevation-1'
                  : 'bg-slate-100 dark:bg-dark-card-high'
              }`}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 dark:text-gray-500 animate-spin" />
              ) : (
                <Send className={`w-4 h-4 sm:w-5 sm:h-5 ${inputText.trim() ? 'text-white' : 'text-gray-400 dark:text-gray-500'}`} />
              )}
            </motion.button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
