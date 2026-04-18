import { motion, AnimatePresence } from 'motion/react';
import { X, MessageSquare, Image, Zap, ExternalLink } from 'lucide-react';
import { useSubscription } from '../context/SubscriptionContext';
import { Browser } from '@capacitor/browser';
import chargilyLogo from '../logo/chargily.svg';

const SUBSCRIBE_URL = 'https://rihlaty.ai/subscribe';

interface ProUpgradeModalProps {
  language: string;
}

async function openSubscribePage() {
  const isNative = typeof (window as any).Capacitor !== 'undefined' && (window as any).Capacitor.isNativePlatform();

  if (isNative) {
    try {
      await Browser.open({ url: SUBSCRIBE_URL });
    } catch {
      window.open(SUBSCRIBE_URL, '_blank');
    }
  } else {
    window.location.href = '/subscribe';
  }
}

export function ProUpgradeModal({ language }: ProUpgradeModalProps) {
  const { showUpgradeModal, setShowUpgradeModal } = useSubscription();
  const t = translations[language as keyof typeof translations] || translations.ar;

  return (
    <AnimatePresence>
      {showUpgradeModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50"
          onClick={() => setShowUpgradeModal(false)}
        >
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-[#111827] rounded-t-3xl sm:rounded-3xl overflow-hidden safe-area-bottom"
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 bg-gray-700 rounded-full" />
            </div>

            {/* Header gradient */}
            <div className="relative px-5 pt-5 pb-6 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-teal-600/20 via-transparent to-purple-600/10" />
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="absolute top-4 right-4 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center z-10"
              >
                <X className="w-4 h-4 text-gray-300" />
              </button>

              <div className="relative z-10">
                <div className="inline-flex items-center gap-1.5 bg-teal-500/15 border border-teal-500/20 text-teal-400 text-xs font-bold px-3 py-1 rounded-full mb-3">
                  <Zap className="w-3 h-3" />
                  PRO
                </div>
                <h2 className="text-white text-xl font-bold mb-1">{t.title}</h2>
                <p className="text-gray-400 text-sm">{t.subtitle}</p>
              </div>
            </div>

            {/* Features */}
            <div className="px-5 space-y-3 mb-5">
              {[
                { icon: MessageSquare, text: t.feature1, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                { icon: Image, text: t.feature2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                { icon: Zap, text: t.feature3, color: 'text-amber-400', bg: 'bg-amber-500/10' },
              ].map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  className="flex items-center gap-3"
                >
                  <div className={`${f.bg} p-2 rounded-xl`}>
                    <f.icon className={`w-4 h-4 ${f.color}`} />
                  </div>
                  <span className="text-gray-200 text-sm">{f.text}</span>
                </motion.div>
              ))}
            </div>

            {/* Pricing hint */}
            <div className="px-5 mb-4">
              <div className="bg-[#0d1321] rounded-2xl p-3.5 flex items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm font-medium">{t.startingAt}</p>
                  <p className="text-white text-lg font-bold">$6.66<span className="text-gray-500 text-xs font-normal">/{t.month}</span></p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-xs">{t.paidVia}</span>
                  <img src={chargilyLogo} alt="Chargily" className="h-4 opacity-50" />
                </div>
              </div>
            </div>

            {/* Web redirect notice */}
            <div className="px-5 mb-3">
              <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl px-3.5 py-2.5">
                <p className="text-amber-200/70 text-xs leading-relaxed">{t.redirectNotice}</p>
              </div>
            </div>

            {/* CTA */}
            <div className="px-5 pb-6">
              <button
                onClick={() => {
                  setShowUpgradeModal(false);
                  openSubscribePage();
                }}
                className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20"
              >
                {t.cta}
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const translations = {
  ar: {
    title: 'ترقية إلى Pro',
    subtitle: 'افتح كامل إمكانيات رحلتي',
    feature1: 'حوالي 1,000 رسالة Kimi K2.5 شهرياً',
    feature2: 'تفكير عميق حصري (Kimi Thinking)',
    feature3: 'صور كاملة وبحث في الويب',
    startingAt: 'يبدأ من',
    month: 'شهر',
    paidVia: 'الدفع عبر',
    redirectNotice: 'سيتم نقلك إلى موقع rihlaty.ai لإتمام عملية الدفع. سجّل دخولك بنفس حساب Google الخاص بك.',
    cta: 'اشترك الآن',
  },
  fr: {
    title: 'Passer à Pro',
    subtitle: 'Débloquez toutes les fonctionnalités',
    feature1: '~1 000 messages Kimi K2.5 / mois',
    feature2: 'Raisonnement profond exclusif',
    feature3: 'Photos complètes et recherche web',
    startingAt: 'À partir de',
    month: 'mois',
    paidVia: 'Paiement via',
    redirectNotice: "Vous serez redirigé vers rihlaty.ai pour compléter le paiement. Connectez-vous avec le même compte Google.",
    cta: "S'abonner maintenant",
  },
  en: {
    title: 'Upgrade to Pro',
    subtitle: 'Unlock the full Rihlaty experience',
    feature1: '~1,000 Kimi K2.5 messages / month',
    feature2: 'Exclusive deep thinking mode',
    feature3: 'Full photos and web search',
    startingAt: 'Starting at',
    month: 'mo',
    paidVia: 'Paid via',
    redirectNotice: "You'll be redirected to rihlaty.ai to complete the payment. Sign in with the same Google account.",
    cta: 'Subscribe Now',
  },
};
