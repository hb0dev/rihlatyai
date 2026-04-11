import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, MessageSquare, Image, Zap, ArrowRight, Loader2, CheckCircle2, XCircle, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { WORKER_URL } from '../config/apiKeys';
import logo from '../logo/rihlaty logo.png';
import chargilyLogo from '../logo/chargily.svg';
type BillingPeriod = 'monthly' | 'yearly';
interface SubscribePageProps {
  language: string;
  onNavigateBack?: () => void;
}
export function SubscribePage({ language, onNavigateBack }: SubscribePageProps) {
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const { isPro, expiresAt, refreshSubscription } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState<BillingPeriod>('yearly');
  const [loading, setLoading] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [pendingCheckoutId, setPendingCheckoutId] = useState<string | null>(null);
  const t = translations[language as keyof typeof translations] || translations.ar;
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const urlCheckoutId = params.get('checkout_id');
    const storedCheckoutId = localStorage.getItem('rihlaty_checkout_id');
    const checkoutId = urlCheckoutId || storedCheckoutId;

    if (status === 'failed') {
      setError(t.paymentFailed);
      localStorage.removeItem('rihlaty_checkout_id');
    } else if (checkoutId && status !== 'failed') {
      setPendingCheckoutId(checkoutId);
    }
  }, []);

  useEffect(() => {
    if (pendingCheckoutId && user && !authLoading) {
      verifyPayment(pendingCheckoutId);
      setPendingCheckoutId(null);
    }
  }, [pendingCheckoutId, user, authLoading]);

  const verifyPayment = async (checkoutId: string) => {
    if (!user) return;
    setVerifying(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${WORKER_URL}/verify-payment?checkout_id=${checkoutId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.status === 'paid') {
        try {
          await setDoc(doc(db, 'users', user.uid), {
            subscription: {
              plan: 'pro',
              billingPeriod: data.plan,
              chargilyCheckoutId: checkoutId,
              startedAt: new Date().toISOString(),
              expiresAt: data.expiresAt,
              amount: data.amount,
            },
          }, { merge: true });
        } catch (fbErr: any) {
          setError(`Firestore: ${fbErr?.message || 'update failed'}`);
          return;
        }
        setPaymentSuccess(true);
        refreshSubscription();
        localStorage.removeItem('rihlaty_checkout_id');
        window.history.replaceState({}, '', '/subscribe');
      } else if (data.status === 'pending') {
        setError(t.paymentPending);
      } else {
        setError(data.error || t.paymentFailed);
      }
    } catch (err: any) {
      setError(err?.message || t.paymentFailed);
    } finally {
      setVerifying(false);
    }
  };
  const handleSubscribe = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${WORKER_URL}/create-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          plan: selectedPlan,
          successUrl: 'https://rihlaty.ai/subscribe?status=success',
          failureUrl: 'https://rihlaty.ai/subscribe?status=failed',
        }),
      });
      const data = await res.json();
      if (data.checkoutUrl && data.checkoutId) {
        localStorage.setItem('rihlaty_checkout_id', data.checkoutId);
        const isNative = typeof (window as any).Capacitor !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.();
        if (isNative) {
          try {
            const { Browser } = await import('@capacitor/browser');
            await Browser.open({ url: data.checkoutUrl });
          } catch {
            window.open(data.checkoutUrl, '_blank');
          }
        } else {
          window.location.href = data.checkoutUrl;
        }
      } else {
        setError(data.error || t.checkoutError);
      }
    } catch (e: any) {
      setError(e?.message || t.checkoutError);
    } finally {
      setLoading(false);
    }
  };
  const handleSignIn = async () => {
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch {
      setError(t.signInError);
    } finally {
      setSigningIn(false);
    }
  };
  if (verifying || (pendingCheckoutId && authLoading)) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center px-6">
          <Loader2 className="w-12 h-12 text-teal-400 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg font-semibold">{t.verifying}</p>
          <p className="text-gray-400 text-sm mt-2">{t.verifyingDesc}</p>
        </motion.div>
      </div>
    );
  }

  if (pendingCheckoutId && !user && !authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center px-5">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-gradient-to-b from-[#111827] to-[#0d1321] border border-gray-800/50 rounded-3xl p-8 max-w-sm w-full text-center"
        >
          <div className="w-16 h-16 bg-teal-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Shield className="w-8 h-8 text-teal-400" />
          </div>
          <h2 className="text-white text-xl font-bold mb-2">{t.signInToVerify}</h2>
          <p className="text-gray-400 text-sm mb-6">{t.signInToVerifyDesc}</p>
          <button
            onClick={handleSignIn}
            disabled={signingIn}
            className="w-full py-3.5 bg-white hover:bg-gray-100 text-gray-900 font-semibold rounded-2xl flex items-center justify-center gap-3 transition-colors disabled:opacity-60"
          >
            {signingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                {t.signInBtn}
              </>
            )}
          </button>
        </motion.div>
      </div>
    );
  }
  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center px-5">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-gradient-to-b from-[#111827] to-[#0d1321] border border-gray-800/50 rounded-3xl p-8 max-w-sm w-full text-center"
        >
          <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
          <h2 className="text-white text-2xl font-bold mb-2">{t.successTitle}</h2>
          <p className="text-gray-400 mb-6">{t.successDesc}</p>
          <p className="text-gray-500 text-xs mb-6">{t.successHint}</p>
          {onNavigateBack && (
            <button onClick={onNavigateBack} className="w-full py-3.5 bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-2xl transition-colors">
              {t.backToApp}
            </button>
          )}
        </motion.div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-[#0a0f1a] relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-teal-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="relative z-10 max-w-lg mx-auto px-5 py-10">
        {/* Header */}
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center mb-10">
          <img src={logo} alt="Rihlaty" className="w-16 h-16 mx-auto mb-4 drop-shadow-lg" />
          <h1 className="text-white text-3xl font-bold tracking-tight mb-2">{t.title}</h1>
          <p className="text-gray-400">{t.subtitle}</p>
        </motion.div>

        {!user ? (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
            className="bg-gradient-to-b from-[#111827] to-[#0d1321] border border-gray-800/50 rounded-3xl p-6 text-center"
          >
            <div className="w-16 h-16 bg-teal-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Shield className="w-8 h-8 text-teal-400" />
            </div>
            <h2 className="text-white text-xl font-bold mb-2">{t.signInTitle}</h2>
            <p className="text-gray-400 text-sm mb-6">{t.signInDesc}</p>
            <button
              onClick={handleSignIn}
              disabled={signingIn}
              className="w-full py-3.5 bg-white hover:bg-gray-100 text-gray-900 font-semibold rounded-2xl flex items-center justify-center gap-3 transition-colors disabled:opacity-60"
            >
              {signingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  {t.signInBtn}
                </>
              )}
            </button>
          </motion.div>
        ) : isPro ? (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
            className="bg-gradient-to-b from-[#111827] to-[#0d1321] border border-teal-500/30 rounded-3xl p-6 text-center"
          >
            <div className="w-20 h-20 bg-teal-500/10 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-10 h-10 text-teal-400" />
            </div>
            <h2 className="text-white text-xl font-bold mb-2">{t.alreadyPro}</h2>
            <p className="text-gray-400 text-sm mb-1">{t.alreadyProDesc}</p>
            {expiresAt && (
              <p className="text-gray-500 text-xs">{t.expires} {new Date(expiresAt).toLocaleDateString(language === 'ar' ? 'ar-DZ' : language === 'fr' ? 'fr-FR' : 'en-US')}</p>
            )}
          </motion.div>
        ) : (
          <>
            {/* Plan Comparison */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
              className="bg-gradient-to-b from-[#111827] to-[#0d1321] border border-gray-800/50 rounded-3xl p-5 mb-5"
            >
              <div className="grid grid-cols-3 gap-3 text-center mb-5">
                <div />
                <div className="text-gray-400 text-xs font-semibold uppercase tracking-wider py-2">Free</div>
                <div className="bg-teal-500/10 text-teal-400 text-xs font-bold uppercase tracking-wider py-2 rounded-xl">Pro</div>
              </div>
              {[
                { icon: MessageSquare, label: t.featureMessages, free: `10/${t.day}`, pro: `60/${t.day}` },
                { icon: Image, label: t.featurePhotos, free: false, pro: true },
                { icon: Zap, label: t.featureGemini, free: true, pro: true },
              ].map((feat, i) => (
                <div key={i} className="grid grid-cols-3 gap-3 items-center py-3 border-t border-gray-800/40">
                  <div className="flex items-center gap-2.5">
                    <feat.icon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <span className="text-gray-300 text-sm">{feat.label}</span>
                  </div>
                  <div className="text-center">
                    {typeof feat.free === 'boolean' ? (
                      feat.free ? <Check className="w-4.5 h-4.5 text-gray-500 mx-auto" /> : <X className="w-4.5 h-4.5 text-gray-600 mx-auto" />
                    ) : <span className="text-gray-400 text-sm">{feat.free}</span>}
                  </div>
                  <div className="text-center">
                    {typeof feat.pro === 'boolean' ? (
                      <Check className="w-4.5 h-4.5 text-teal-400 mx-auto" />
                    ) : <span className="text-teal-400 text-sm font-semibold">{feat.pro}</span>}
                  </div>
                </div>
              ))}
            </motion.div>
            {/* Pricing Toggle */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
              className="flex gap-3 mb-5"
            >
              {(['monthly', 'yearly'] as BillingPeriod[]).map((period) => {
                const active = selectedPlan === period;
                return (
                  <button
                    key={period}
                    onClick={() => setSelectedPlan(period)}
                    className={`flex-1 relative rounded-2xl p-4 border-2 transition-all ${
                      active
                        ? 'border-teal-500 bg-teal-500/5'
                        : 'border-gray-800 bg-[#111827]/50 hover:border-gray-700'
                    }`}
                  >
                    {period === 'yearly' && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-teal-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                        {t.save}
                      </span>
                    )}
                    <p className={`text-sm font-semibold mb-1 ${active ? 'text-white' : 'text-gray-400'}`}>
                      {period === 'monthly' ? t.monthly : t.yearly}
                    </p>
                    <p className={`text-2xl font-bold ${active ? 'text-white' : 'text-gray-300'}`}>
                      {period === 'monthly' ? '$3.99' : '$39.99'}
                    </p>
                    <p className={`text-xs mt-0.5 ${active ? 'text-gray-400' : 'text-gray-500'}`}>
                      {period === 'monthly' ? `≈ 550 ${t.dzd}` : `≈ 5,500 ${t.dzd}`}
                    </p>
                    {period === 'yearly' && (
                      <p className={`text-xs mt-1 ${active ? 'text-teal-400' : 'text-gray-500'}`}>
                        ≈ $3.33/{t.monthShort}
                      </p>
                    )}
                  </button>
                );
              })}
            </motion.div>

            {/* Subscribe Button */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="bg-red-500/10 border border-red-500/20 rounded-2xl p-3 mb-4 flex items-center gap-2"
                  >
                    <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <p className="text-red-400 text-sm">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                onClick={handleSubscribe}
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-bold text-lg rounded-2xl flex items-center justify-center gap-2.5 transition-all disabled:opacity-60 shadow-lg shadow-teal-500/20"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {t.subscribeBtn}
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
              <div className="flex items-center justify-center gap-3 mt-5">
                <span className="text-gray-500 text-xs">{t.poweredBy}</span>
                <img src={chargilyLogo} alt="Chargily" className="h-5 opacity-60" />
              </div>
              <p className="text-gray-600 text-[11px] text-center mt-3 leading-relaxed">{t.terms}</p>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
const translations = {
  ar: {
    title: 'Rihlaty Pro',
    subtitle: 'افتح كامل إمكانيات التطبيق',
    signInTitle: 'سجّل الدخول أولاً',
    signInDesc: 'سجّل دخولك بحساب Google لتتمكن من الاشتراك',
    signInBtn: 'المتابعة بحساب Google',
    signInError: 'فشل تسجيل الدخول',
    alreadyPro: 'أنت مشترك في Pro',
    alreadyProDesc: 'استمتع بجميع المميزات بلا حدود',
    expires: 'ينتهي في',
    featureMessages: 'رسائل AI',
    featurePhotos: 'صور الأماكن',
    featureGemini: 'Gemini AI',
    day: 'يوم',
    monthly: 'شهري',
    yearly: 'سنوي',
    save: 'وفّر 17%',
    dzd: 'د.ج',
    monthShort: 'شهر',
    subscribeBtn: 'اشترك الآن',
    poweredBy: 'الدفع عبر',
    terms: 'بالاشتراك، أنت توافق على شروط الاستخدام. يمكنك إلغاء الاشتراك في أي وقت.',
    verifying: 'جاري التحقق من الدفع...',
    verifyingDesc: 'يرجى الانتظار لحظات',
    successTitle: 'تم الاشتراك بنجاح!',
    successDesc: 'مرحباً بك في Rihlaty Pro. استمتع بجميع المميزات.',
    successHint: 'ارجع للتطبيق لبدء الاستخدام',
    backToApp: 'العودة للتطبيق',
    paymentFailed: 'فشلت عملية الدفع. حاول مرة أخرى.',
    paymentPending: 'الدفع قيد المعالجة. سيتم تفعيل اشتراكك قريباً.',
    checkoutError: 'حدث خطأ. حاول مرة أخرى.',
    signInToVerify: 'سجّل الدخول لتفعيل اشتراكك',
    signInToVerifyDesc: 'تم الدفع بنجاح! سجّل دخولك بنفس حساب Google لتفعيل اشتراك Pro.',
  },
  fr: {
    title: 'Rihlaty Pro',
    subtitle: "Débloquez toutes les fonctionnalités",
    signInTitle: 'Connectez-vous d\'abord',
    signInDesc: 'Connectez-vous avec Google pour vous abonner',
    signInBtn: 'Continuer avec Google',
    signInError: 'Échec de la connexion',
    alreadyPro: 'Vous êtes abonné Pro',
    alreadyProDesc: 'Profitez de toutes les fonctionnalités sans limites',
    expires: 'Expire le',
    featureMessages: 'Messages AI',
    featurePhotos: 'Photos des lieux',
    featureGemini: 'Gemini AI',
    day: 'jour',
    monthly: 'Mensuel',
    yearly: 'Annuel',
    save: 'Économisez 17%',
    dzd: 'DA',
    monthShort: 'mois',
    subscribeBtn: "S'abonner maintenant",
    poweredBy: 'Paiement via',
    terms: "En vous abonnant, vous acceptez les conditions d'utilisation. Annulation possible à tout moment.",
    verifying: 'Vérification du paiement...',
    verifyingDesc: 'Veuillez patienter',
    successTitle: 'Abonnement réussi !',
    successDesc: 'Bienvenue sur Rihlaty Pro. Profitez de toutes les fonctionnalités.',
    successHint: "Retournez à l'application pour commencer",
    backToApp: "Retour à l'application",
    paymentFailed: 'Le paiement a échoué. Veuillez réessayer.',
    paymentPending: 'Paiement en cours de traitement. Votre abonnement sera activé bientôt.',
    checkoutError: 'Une erreur est survenue. Veuillez réessayer.',
    signInToVerify: 'Connectez-vous pour activer votre abonnement',
    signInToVerifyDesc: 'Paiement réussi ! Connectez-vous avec le même compte Google pour activer Pro.',
  },
  en: {
    title: 'Rihlaty Pro',
    subtitle: 'Unlock the full experience',
    signInTitle: 'Sign in first',
    signInDesc: 'Sign in with Google to subscribe',
    signInBtn: 'Continue with Google',
    signInError: 'Sign in failed',
    alreadyPro: "You're subscribed to Pro",
    alreadyProDesc: 'Enjoy all features without limits',
    expires: 'Expires on',
    featureMessages: 'AI Messages',
    featurePhotos: 'Place Photos',
    featureGemini: 'Gemini AI',
    day: 'day',
    monthly: 'Monthly',
    yearly: 'Yearly',
    save: 'Save 17%',
    dzd: 'DZD',
    monthShort: 'mo',
    subscribeBtn: 'Subscribe Now',
    poweredBy: 'Powered by',
    terms: 'By subscribing, you agree to the terms of service. You can cancel anytime.',
    verifying: 'Verifying payment...',
    verifyingDesc: 'Please wait a moment',
    successTitle: 'Subscription Successful!',
    successDesc: 'Welcome to Rihlaty Pro. Enjoy all features.',
    successHint: 'Go back to the app to start using it',
    backToApp: 'Back to App',
    paymentFailed: 'Payment failed. Please try again.',
    paymentPending: 'Payment is being processed. Your subscription will be activated soon.',
    checkoutError: 'An error occurred. Please try again.',
    signInToVerify: 'Sign in to activate your subscription',
    signInToVerifyDesc: 'Payment successful! Sign in with the same Google account to activate Pro.',
  },
};
