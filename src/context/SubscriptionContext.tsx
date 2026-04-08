import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './AuthContext';
import { SubscriptionData } from './AuthContext';

const FREE_DAILY_LIMIT = 10;
const PRO_DAILY_LIMIT = 60;

interface SubscriptionContextType {
  plan: 'free' | 'pro';
  isPro: boolean;
  expiresAt: string | null;
  dailyMessageCount: number;
  dailyMessageLimit: number;
  canSendMessage: boolean;
  messagesRemaining: number;
  incrementMessageCount: () => void;
  showUpgradeModal: boolean;
  setShowUpgradeModal: (show: boolean) => void;
  refreshSubscription: () => void;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

function getTodayKey() {
  return new Date().toISOString().split('T')[0];
}

function getStoredCount(): { date: string; count: number } {
  try {
    const stored = localStorage.getItem('rihlaty_msg_count');
    if (stored) return JSON.parse(stored);
  } catch {}
  return { date: getTodayKey(), count: 0 };
}

function storeCount(count: number) {
  localStorage.setItem('rihlaty_msg_count', JSON.stringify({ date: getTodayKey(), count }));
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData>({ plan: 'free' });
  const [dailyMessageCount, setDailyMessageCount] = useState(0);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    const stored = getStoredCount();
    if (stored.date === getTodayKey()) {
      setDailyMessageCount(stored.count);
    } else {
      storeCount(0);
      setDailyMessageCount(0);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setSubscription({ plan: 'free' });
      return;
    }

    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.subscription) {
          const sub = data.subscription as SubscriptionData;
          if (sub.expiresAt && new Date(sub.expiresAt) < new Date()) {
            setSubscription({ plan: 'free' });
          } else {
            setSubscription(sub);
          }
        } else {
          setSubscription({ plan: 'free' });
        }
      }
    });

    return () => unsubscribe();
  }, [user]);

  const isPro = subscription.plan === 'pro';
  const dailyMessageLimit = isPro ? PRO_DAILY_LIMIT : FREE_DAILY_LIMIT;
  const messagesRemaining = Math.max(0, dailyMessageLimit - dailyMessageCount);
  const canSendMessage = dailyMessageCount < dailyMessageLimit;

  const incrementMessageCount = useCallback(() => {
    setDailyMessageCount(prev => {
      const newCount = prev + 1;
      storeCount(newCount);
      return newCount;
    });
  }, []);

  const refreshSubscription = useCallback(() => {
    // Triggers re-read via onSnapshot
  }, []);

  return (
    <SubscriptionContext.Provider value={{
      plan: subscription.plan,
      isPro,
      expiresAt: subscription.expiresAt || null,
      dailyMessageCount,
      dailyMessageLimit,
      canSendMessage,
      messagesRemaining,
      incrementMessageCount,
      showUpgradeModal,
      setShowUpgradeModal,
      refreshSubscription,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) throw new Error('useSubscription must be used within SubscriptionProvider');
  return context;
}
