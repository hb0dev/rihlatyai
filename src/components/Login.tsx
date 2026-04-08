import { useState } from 'react';
import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';
import logo from '../logo/rihlaty logo.png';
import { useAuth } from '../context/AuthContext';
interface LoginProps {
  language: string;
  onLoginSuccess: () => void;
}
export function Login({ language, onLoginSuccess }: LoginProps) {
  const { signInWithGoogle } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const translations = {
    ar: {
      title: 'مرحباً بك',
      subtitle: 'سجل دخولك لاستكشاف الجزائر',
      continueWithGoogle: 'المتابعة باستخدام Google',
      logging: 'جاري تسجيل الدخول...',
      error: 'حدث خطأ، حاول مرة أخرى',
      cancelled: 'تم إلغاء تسجيل الدخول',
      privacyText: 'بتسجيل الدخول، أنت توافق على',
      privacyLink: 'سياسة الخصوصية'
    },
    fr: {
      title: 'Bienvenue',
      subtitle: 'Connectez-vous pour explorer l\'Algérie',
      continueWithGoogle: 'Continuer avec Google',
      logging: 'Connexion en cours...',
      error: 'Une erreur est survenue, réessayez',
      cancelled: 'Connexion annulée',
      privacyText: 'En vous connectant, vous acceptez',
      privacyLink: 'la politique de confidentialité'
    },
    en: {
      title: 'Welcome',
      subtitle: 'Login to explore Algeria',
      continueWithGoogle: 'Continue with Google',
      logging: 'Signing in...',
      error: 'An error occurred, please try again',
      cancelled: 'Sign in cancelled',
      privacyText: 'By signing in, you agree to',
      privacyLink: 'the Privacy Policy'
    }
  };
  const t = translations[language as keyof typeof translations] || translations.en;
  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
      onLoginSuccess();
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      if (err.message?.includes('canceled') || err.message?.includes('cancelled')) {
        setError(t.cancelled);
      } else {
        setError(t.error);
      }
    } finally {
      setLoading(false);
    }
  };
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
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, type: 'spring' }}
        className="mb-8 relative z-10"
      >
        <div className="w-28 h-28 bg-white/10 backdrop-blur-sm rounded-full p-2 shadow-elevation-3">
          <img src={logo} alt="Logo" className="w-full h-full drop-shadow-2xl" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-sm bg-white/95 dark:bg-dark-card/95 backdrop-blur-xl rounded-3xl shadow-elevation-3 p-8 relative z-10"
      >
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2 text-center">{t.title}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-center mb-10 text-sm">{t.subtitle}</p>
        
        {error && (
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-red-500 dark:text-red-400 text-sm text-center mb-6 bg-red-50 dark:bg-red-900/20 py-3 px-4 rounded-2xl"
          >
            {error}
          </motion.p>
        )}

        <motion.button
          whileHover={{ scale: loading ? 1 : 1.01 }}
          whileTap={{ scale: loading ? 1 : 0.98 }}
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full bg-white dark:bg-dark-card-high border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 py-4 rounded-2xl font-semibold shadow-elevation-1 hover:shadow-elevation-2 transition-shadow disabled:opacity-70 flex items-center justify-center gap-3"
        >
          {loading ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              {t.logging}
            </>
          ) : (
            <>
              {/* Google Icon */}
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {t.continueWithGoogle}
            </>
          )}
        </motion.button>
        
        {/* Privacy Policy Link */}
        <p className="text-center text-gray-400 dark:text-gray-500 text-xs mt-5">
          {t.privacyText}{' '}
          <a 
            href="/privacy"
            className="text-teal-600 dark:text-teal-400 underline hover:text-teal-700 dark:hover:text-teal-300"
          >
            {t.privacyLink}
          </a>
        </p>
      </motion.div>
    </div>
  );
}
