import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './AuthContext';
import { SubscriptionData } from './AuthContext';

// Monthly token quotas. Must stay in sync with the QUOTAS table in worker.js.
export const QUOTAS = {
  free: {
    kimiInput: 60_000,
    kimiOutput: 40_000,
    thinkingInput: 0,
    thinkingOutput: 0,
  },
  pro: {
    kimiInput: 800_000,
    kimiOutput: 700_000,
    thinkingInput: 150_000,
    thinkingOutput: 150_000,
  },
} as const;

export interface TokenUsage {
  kimiInput: number;
  kimiOutput: number;
  thinkingInput: number;
  thinkingOutput: number;
}

interface SubscriptionContextType {
  plan: 'free' | 'pro';
  isPro: boolean;
  expiresAt: string | null;

  usage: TokenUsage;
  limits: TokenUsage;

  /** `true` if the user still has quota on at least one direction of the Kimi bucket. */
  canSendKimi: boolean;
  /** `true` if the user is Pro AND still has quota on the Thinking bucket. */
  canSendThinking: boolean;

  showUpgradeModal: boolean;
  setShowUpgradeModal: (show: boolean) => void;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

function getMonthKey() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function sanitizeTokenCount(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  // Soft ceiling so a corrupt Firestore document can't crash the UI.
  if (n > 10_000_000) return 10_000_000;
  return Math.floor(n);
}

const EMPTY_USAGE: TokenUsage = {
  kimiInput: 0,
  kimiOutput: 0,
  thinkingInput: 0,
  thinkingOutput: 0,
};

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData>({ plan: 'free' });
  const [usage, setUsage] = useState<TokenUsage>(EMPTY_USAGE);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Subscribe to the user document to track plan status.
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

  // Subscribe to the current month's usage document (written by the Worker).
  useEffect(() => {
    if (!user) {
      setUsage(EMPTY_USAGE);
      return;
    }

    const month = getMonthKey();
    const usageRef = doc(db, 'users', user.uid, 'usage', month);

    const unsub = onSnapshot(
      usageRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() || {};
          // Defend against a stale document lingering from a previous month.
          if (data.month && data.month !== month) {
            setUsage(EMPTY_USAGE);
            return;
          }
          setUsage({
            kimiInput: sanitizeTokenCount(data.kimiInput),
            kimiOutput: sanitizeTokenCount(data.kimiOutput),
            thinkingInput: sanitizeTokenCount(data.thinkingInput),
            thinkingOutput: sanitizeTokenCount(data.thinkingOutput),
          });
        } else {
          setUsage(EMPTY_USAGE);
        }
      },
      (err) => {
        console.error('Usage snapshot error:', err);
        setUsage(EMPTY_USAGE);
      }
    );

    return () => unsub();
  }, [user]);

  const isPro = subscription.plan === 'pro';
  const limits: TokenUsage = isPro ? { ...QUOTAS.pro } : { ...QUOTAS.free };

  const canSendKimi =
    usage.kimiInput < limits.kimiInput && usage.kimiOutput < limits.kimiOutput;
  const canSendThinking =
    isPro &&
    usage.thinkingInput < limits.thinkingInput &&
    usage.thinkingOutput < limits.thinkingOutput;

  // No-op kept for API compatibility with older callers.
  const noop = useCallback(() => {}, []);
  void noop;

  return (
    <SubscriptionContext.Provider
      value={{
        plan: subscription.plan,
        isPro,
        expiresAt: subscription.expiresAt || null,
        usage,
        limits,
        canSendKimi,
        canSendThinking,
        showUpgradeModal,
        setShowUpgradeModal,
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
