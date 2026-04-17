import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { doc, onSnapshot, setDoc, increment, serverTimestamp } from 'firebase/firestore';
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
  incrementMessageCount: () => Promise<void>;
  showUpgradeModal: boolean;
  setShowUpgradeModal: (show: boolean) => void;
  refreshSubscription: () => void;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

function getTodayKey() {
  return new Date().toISOString().split('T')[0];
}

function sanitizeCount(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return 0;
  if (n < 0) return 0;
  if (n > 10000) return 10000;
  return n;
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData>({ plan: 'free' });
  const [dailyMessageCount, setDailyMessageCount] = useState(0);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

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

  useEffect(() => {
    if (!user) {
      setDailyMessageCount(0);
      return;
    }

    const today = getTodayKey();
    const usageRef = doc(db, 'users', user.uid, 'usage', today);

    const unsub = onSnapshot(
      usageRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setDailyMessageCount(sanitizeCount(data?.count));
        } else {
          setDailyMessageCount(0);
        }
      },
      (err) => {
        console.error('Usage snapshot error:', err);
        setDailyMessageCount(0);
      }
    );

    return () => unsub();
  }, [user]);

  const isPro = subscription.plan === 'pro';
  const dailyMessageLimit = isPro ? PRO_DAILY_LIMIT : FREE_DAILY_LIMIT;
  const messagesRemaining = Math.max(0, dailyMessageLimit - dailyMessageCount);
  const canSendMessage = dailyMessageCount < dailyMessageLimit;

  const incrementMessageCount = useCallback(async () => {
    if (!user) return;
    const today = getTodayKey();
    const usageRef = doc(db, 'users', user.uid, 'usage', today);
    try {
      await setDoc(
        usageRef,
        {
          date: today,
          count: increment(1),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.error('Failed to increment message count:', err);
    }
  }, [user]);

  const refreshSubscription = useCallback(() => {
    // onSnapshot handles refreshes automatically
  }, []);

  return (
    <SubscriptionContext.Provider
      value={{
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
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) throw new Error('useSubscription must be used within SubscriptionProvider');
  return context;
}
