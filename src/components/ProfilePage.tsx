import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Edit3, Globe, LogOut, ChevronRight, X, Check, Moon, Sun, Shield, Trash2, AlertTriangle, Bell, Cloud, MapPin, Bot, Mail, Info, Crown } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useSubscription } from '../context/SubscriptionContext';

interface ProfilePageProps {
  language: string;
  onLogout: () => void;
  onLanguageChange?: (lang: string) => void;
}

export function ProfilePage({ language, onLogout, onLanguageChange }: ProfilePageProps) {
  const { isDark, toggleTheme } = useTheme();
  const { user, userData, logout, updateUserProfile, deleteAccount } = useAuth();
  const { isSupported: notificationsSupported, settings: notificationSettings, updateSettings: updateNotificationSettings } = useNotifications();
  const { isPro, expiresAt, setShowUpgradeModal } = useSubscription();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [fullName, setFullName] = useState('');
  const [tempName, setTempName] = useState('');

  useEffect(() => {
    if (userData) {
      setFullName(userData.fullName);
      setTempName(userData.fullName);
    } else if (user?.displayName) {
      setFullName(user.displayName);
      setTempName(user.displayName);
    }
  }, [userData, user]);

  const translations = {
    ar: {
      profile: 'الملف الشخصي',
      editInfo: 'تعديل المعلومات',
      language: 'اللغة',
      darkMode: 'الوضع المظلم',
      logout: 'تسجيل الخروج',
      fullName: 'الاسم الكامل',
      save: 'حفظ',
      cancel: 'إلغاء',
      selectLanguage: 'اختر اللغة',
      arabic: 'العربية',
      french: 'الفرنسية',
      english: 'الإنجليزية',
      privacyPolicy: 'سياسة الخصوصية',
      aboutUs: 'من نحن',
      aboutTitle: 'من نحن',
      aboutContent: `🌍 رحلتي - رفيقك في استكشاف الجزائر

رحلتي هو تطبيق سياحي ذكي مصمم خصيصاً لمساعدتك في اكتشاف أجمل الوجهات السياحية في الجزائر.

✨ مميزاتنا:
• اكتشاف الشواطئ والمواقع الطبيعية الخلابة
• استكشاف المعالم التاريخية والثقافية
• البحث عن الفنادق والمطاعم القريبة
• مساعد ذكي Kimi K2.5 مع وضع التفكير العميق للمشتركين في Pro
• البحث في الويب مباشرة داخل المحادثة
• ملاحة مباشرة لأي وجهة
• صور وتقييمات وتفاصيل الأماكن (أرقام هاتف، حالة مفتوح/مغلق)

🎯 مهمتنا:
تسهيل السياحة الداخلية وتشجيع الجزائريين على اكتشاف جمال بلادهم.

📧 للتواصل والدعم:
contact@rihlaty.ai

🌐 الموقع:
www.rihlaty.ai

الإصدار 2.1.0`,
      contactSupport: 'تواصل مع الدعم',
      deleteAccount: 'حذف الحساب',
      deleteTitle: 'حذف الحساب',
      deleteWarning: 'هل أنت متأكد من حذف حسابك؟ سيتم حذف جميع بياناتك ومحادثاتك بشكل نهائي ولا يمكن استرجاعها.',
      deleteConfirm: 'نعم، احذف حسابي',
      deleting: 'جاري الحذف...',
      deleteError: 'فشل حذف الحساب. يرجى تسجيل الخروج وإعادة تسجيل الدخول ثم المحاولة مرة أخرى.',
      privacyTitle: 'سياسة الخصوصية',
      privacyContent: `نحن في تطبيق رحلتي نحترم خصوصيتك ونلتزم بحماية بياناتك الشخصية.

📍 الموقع الجغرافي:
- نستخدم موقعك لعرض الأماكن السياحية القريبة منك
- لا نشارك موقعك مع أي طرف ثالث
- يمكنك إيقاف الوصول للموقع في أي وقت

🤖 المساعد الذكي (Kimi K2.5):
- ردود المساعد تأتي من نماذج Moonshot AI (Kimi K2.5 و K2.5 Thinking) عبر وسيط OpenRouter
- رسالتك + موقعك التقريبي + قائمة مختصرة بالأماكن القريبة تُرسَل لمعالجة الرد فقط، ولا تُخزَّن لدى هذه الأطراف للاستخدام التدريبي
- عند تفعيل "البحث في الويب" يتم استعلام محرك بحث خارجي (Exa عبر OpenRouter) لإحضار مصادر محدّثة
- محادثاتك تُحفظ في حسابك على Firestore، وتظل مرتبطة بحسابك وحده
- عند حذف محادثة، تختفي من واجهتك وتُحذَف نهائياً بعد فترة مؤرشفة قصيرة
- لا نستخدم محادثاتك لتدريب نماذج ذكاء اصطناعي، ولا نبيع بياناتك لأطراف ثالثة

📊 استخدام التوكنز:
- لإدارة حصص الخطة (Free/Pro) نسجّل عدد التوكنز الشهرية لكل مستخدم في وثيقة محميّة على Firestore
- هذه الأرقام مجمّعة شهرياً ولا تحتوي على نص محادثاتك

🔐 البيانات الشخصية:
- نحفظ فقط: اسمك، بريدك الإلكتروني، صورتك من Google، وحالة اشتراكك
- بياناتك محمية بقواعد أمان Firebase، والاشتراك يُكتَب عبر خادم آمن فقط
- يمكنك حذف حسابك في أي وقت من صفحة حسابي`,
      notifications: 'الإشعارات',
      notificationsTitle: 'إعدادات الإشعارات',
      weatherNotifications: 'إشعارات الطقس',
      weatherDesc: 'تنبيهات عند تغير الطقس',
      nearbyNotifications: 'الأماكن القريبة',
      nearbyDesc: 'اكتشف أماكن سياحية جديدة',
      aiNotifications: 'اقتراحات ذكية',
      aiDesc: 'اقتراحات يومية من المساعد الذكي',
      notificationsDisabled: 'الإشعارات غير متاحة على هذا الجهاز',
      upgradeToPro: 'ترقية إلى Pro',
      proActive: 'اشتراك Pro فعّال',
      proExpires: 'ينتهي في',
      messagesUsed: 'رسالة متبقية اليوم',
      unlockFeatures: 'افتح 60 رسالة AI + صور الأماكن',
    },
    fr: {
      profile: 'Profil',
      editInfo: 'Modifier les informations',
      language: 'Langue',
      darkMode: 'Mode sombre',
      logout: 'Se déconnecter',
      fullName: 'Nom complet',
      save: 'Enregistrer',
      cancel: 'Annuler',
      selectLanguage: 'Choisir la langue',
      arabic: 'Arabe',
      french: 'Français',
      english: 'Anglais',
      privacyPolicy: 'Politique de confidentialité',
      aboutUs: 'À propos',
      aboutTitle: 'À propos de nous',
      aboutContent: `🌍 Rihlaty - Votre compagnon pour explorer l'Algérie

Rihlaty est une application touristique intelligente conçue pour vous aider à découvrir les plus belles destinations d'Algérie.

✨ Nos fonctionnalités:
• Découvrir des plages et sites naturels magnifiques
• Explorer les monuments historiques et culturels
• Trouver des hôtels et restaurants à proximité
• Assistant IA Kimi K2.5 avec mode « Thinking » exclusif aux abonnés Pro
• Recherche web intégrée directement dans la discussion
• Navigation directe vers toute destination
• Photos, notes et détails des lieux (téléphone, statut ouvert/fermé)

🎯 Notre mission:
Faciliter le tourisme intérieur et encourager les Algériens à découvrir la beauté de leur pays.

📧 Contact et support:
contact@rihlaty.ai

🌐 Site web:
www.rihlaty.ai

Version 2.1.0`,
      contactSupport: 'Contacter le support',
      deleteAccount: 'Supprimer le compte',
      deleteTitle: 'Supprimer le compte',
      deleteWarning: 'Êtes-vous sûr de vouloir supprimer votre compte ? Toutes vos données et conversations seront définitivement supprimées et ne pourront pas être récupérées.',
      deleteConfirm: 'Oui, supprimer mon compte',
      deleting: 'Suppression en cours...',
      deleteError: 'Échec de la suppression. Veuillez vous déconnecter, vous reconnecter et réessayer.',
      privacyTitle: 'Politique de confidentialité',
      privacyContent: `Chez Rihlaty, nous respectons votre vie privée et nous engageons à protéger vos données personnelles.

📍 Localisation:
- Nous utilisons votre position pour afficher les lieux touristiques proches
- Nous ne partageons pas votre position avec des tiers
- Vous pouvez désactiver l'accès à la localisation à tout moment

🤖 Assistant IA (Kimi K2.5):
- Les réponses proviennent des modèles Moonshot AI (Kimi K2.5 et K2.5 Thinking) via l'intermédiaire OpenRouter
- Votre message, votre position approximative et une courte liste de lieux proches sont transmis uniquement pour générer la réponse, sans stockage à des fins d'entraînement
- Lorsque la « recherche web » est activée, une requête est envoyée à un moteur externe (Exa via OpenRouter) pour récupérer des sources à jour
- Vos conversations sont sauvegardées dans votre compte sur Firestore et restent privées
- Lorsque vous supprimez une conversation, elle disparaît immédiatement puis est définitivement supprimée après une courte période d'archivage
- Nous n'utilisons pas vos conversations pour entraîner des modèles d'IA et nous ne vendons pas vos données

📊 Usage des tokens:
- Pour gérer les quotas Free/Pro, nous enregistrons le nombre mensuel de tokens utilisés dans un document sécurisé sur Firestore
- Ces chiffres sont agrégés mensuellement et ne contiennent pas le texte de vos conversations

🔐 Données personnelles:
- Nous conservons uniquement: nom, email, photo Google et statut d'abonnement
- Vos données sont protégées par les règles de sécurité Firebase, et l'abonnement est écrit exclusivement côté serveur
- Vous pouvez supprimer votre compte à tout moment depuis la page Profil`,
      notifications: 'Notifications',
      notificationsTitle: 'Paramètres de notifications',
      weatherNotifications: 'Alertes météo',
      weatherDesc: 'Alertes lors de changements météo',
      nearbyNotifications: 'Lieux proches',
      nearbyDesc: 'Découvrez de nouveaux lieux touristiques',
      aiNotifications: 'Suggestions IA',
      aiDesc: 'Suggestions quotidiennes de l\'assistant',
      notificationsDisabled: 'Les notifications ne sont pas disponibles sur cet appareil',
      upgradeToPro: 'Passer à Pro',
      proActive: 'Abonnement Pro actif',
      proExpires: 'Expire le',
      messagesUsed: 'messages restants aujourd\'hui',
      unlockFeatures: 'Débloquez 60 messages IA + photos des lieux',
    },
    en: {
      profile: 'Profile',
      editInfo: 'Edit Information',
      language: 'Language',
      darkMode: 'Dark Mode',
      logout: 'Logout',
      fullName: 'Full Name',
      save: 'Save',
      cancel: 'Cancel',
      selectLanguage: 'Select Language',
      arabic: 'Arabic',
      french: 'French',
      english: 'English',
      privacyPolicy: 'Privacy Policy',
      aboutUs: 'About Us',
      aboutTitle: 'About Us',
      aboutContent: `🌍 Rihlaty - Your companion for exploring Algeria

Rihlaty is an intelligent tourism app designed to help you discover the most beautiful destinations in Algeria.

✨ Our features:
• Discover stunning beaches and natural sites
• Explore historical and cultural landmarks
• Find nearby hotels and restaurants
• Kimi K2.5 AI assistant with Pro-exclusive Thinking mode
• Built-in web search directly inside the chat
• Direct navigation to any destination
• Place photos, ratings, and details (phone, open/closed status)

🎯 Our mission:
Facilitate domestic tourism and encourage Algerians to discover the beauty of their country.

📧 Contact and support:
contact@rihlaty.ai

🌐 Website:
www.rihlaty.ai

Version 2.1.0`,
      contactSupport: 'Contact Support',
      deleteAccount: 'Delete Account',
      deleteTitle: 'Delete Account',
      deleteWarning: 'Are you sure you want to delete your account? All your data and conversations will be permanently deleted and cannot be recovered.',
      deleteConfirm: 'Yes, delete my account',
      deleting: 'Deleting...',
      deleteError: 'Failed to delete account. Please logout, login again, and try again.',
      privacyTitle: 'Privacy Policy',
      privacyContent: `At Rihlaty, we respect your privacy and are committed to protecting your personal data.

📍 Location:
- We use your location to show nearby tourist places
- We do not share your location with third parties
- You can disable location access at any time

🤖 AI Assistant (Kimi K2.5):
- Replies come from Moonshot AI models (Kimi K2.5 and K2.5 Thinking) through the OpenRouter broker
- Your message, your approximate location, and a short list of nearby places are sent solely to generate the reply — they are not stored for training
- When you enable "Web search", a query is sent to an external search engine (Exa via OpenRouter) to fetch up-to-date sources
- Your conversations are saved in your account on Firestore and remain private to you
- When you delete a conversation it disappears from your view and is permanently deleted after a short archival window
- We do not use your conversations to train AI models and we do not sell your data to third parties

📊 Token usage:
- To enforce Free/Pro quotas we store your monthly token counts in a protected Firestore document
- These are aggregate numbers only and do not contain the text of your conversations

🔐 Personal Data:
- We only store: name, email, Google photo, and subscription status
- Your data is protected by Firebase security rules; subscriptions are written server-side only
- You can delete your account at any time from the Profile page`,
      notifications: 'Notifications',
      notificationsTitle: 'Notification Settings',
      weatherNotifications: 'Weather Alerts',
      weatherDesc: 'Alerts when weather changes',
      nearbyNotifications: 'Nearby Places',
      nearbyDesc: 'Discover new tourist places',
      aiNotifications: 'AI Suggestions',
      aiDesc: 'Daily suggestions from AI assistant',
      notificationsDisabled: 'Notifications are not available on this device',
      upgradeToPro: 'Upgrade to Pro',
      proActive: 'Pro Subscription Active',
      proExpires: 'Expires on',
      messagesUsed: 'messages left today',
      unlockFeatures: 'Unlock 60 AI messages + place photos',
    }
  };

  const t = translations[language as keyof typeof translations] || translations.en;

  const menuItems = [
    { id: 'edit', icon: Edit3, label: t.editInfo, iconBg: 'bg-cyan-500', action: () => { setTempName(fullName); setShowEditModal(true); } },
    { id: 'language', icon: Globe, label: t.language, iconBg: 'bg-violet-500', action: () => setShowLanguageModal(true) },
    { id: 'notifications', icon: Bell, label: t.notifications, iconBg: 'bg-orange-500', action: () => setShowNotificationsModal(true) }
  ];

  const handleSaveName = async () => {
    const sanitizedName = tempName
      .trim()
      .replace(/<[^>]*>/g, '')
      .replace(/[<>\"'&]/g, '')
      .slice(0, 50);
    
    if (!sanitizedName) return;
    
    try {
      await updateUserProfile({ fullName: sanitizedName });
      setFullName(sanitizedName);
      setShowEditModal(false);
    } catch (error) {
    }
  };

  const handleLanguageSelect = (lang: string) => {
    onLanguageChange?.(lang);
    setShowLanguageModal(false);
  };

  const languages = [
    { code: 'ar', label: t.arabic, flag: '🇩🇿' },
    { code: 'fr', label: t.french, flag: '🇫🇷' },
    { code: 'en', label: t.english, flag: '🇬🇧' }
  ];

  // Get profile photo URL
  const profilePhotoURL = userData?.photoURL || user?.photoURL;

  // Reusable modal component
  const ModalWrapper = ({ show, onClose, children }: { show: boolean; onClose: () => void; children: React.ReactNode }) => (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-5"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-dark-card rounded-3xl w-full max-w-sm overflow-hidden shadow-elevation-3"
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
  // Modal header
  const ModalHeader = ({ title, gradient, onClose, disabled }: { title: string; gradient: string; onClose: () => void; disabled?: boolean }) => (
    <div className={`bg-gradient-to-r ${gradient} px-5 py-4 flex items-center justify-between`}>
      <h3 className="text-white font-bold text-[15px]">{title}</h3>
      <button onClick={onClose} disabled={disabled} className="p-2 hover:bg-white/15 rounded-xl transition-colors">
        <X className="w-5 h-5 text-white" />
      </button>
    </div>
  );
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f1419] pb-28">
      {/* Header */}
      <div className="bg-gradient-to-br from-teal-500 to-emerald-600 px-5 pt-14 pb-24 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: `radial-gradient(circle at 20px 20px, white 1.5px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
        <h1 className="text-white text-xl font-bold mb-6 relative z-10">{t.profile}</h1>
        
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center relative z-10"
        >
          <div className="relative">
            <div className="w-24 h-24 bg-white dark:bg-dark-card rounded-full flex items-center justify-center mb-3 shadow-elevation-3 overflow-hidden ring-4 ring-white/20">
              {profilePhotoURL ? (
                <img 
                  src={profilePhotoURL} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <User className="w-12 h-12 text-teal-500 dark:text-teal-400" strokeWidth={1.5} />
              )}
            </div>
          </div>
          <h2 className="text-white text-lg font-bold">{fullName || 'مستخدم رحلتي'}</h2>
          <p className="text-white/60 text-sm mt-1">{user?.email || 'user@rihlaty.com'}</p>
        </motion.div>
      </div>
      <div className="px-4 -mt-12 relative z-10">
        {/* Dark Mode Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="w-full bg-white dark:bg-dark-card rounded-2xl p-4 shadow-elevation-1 flex items-center justify-between mb-3"
        >
          <div className="flex items-center gap-3">
            <div className={`${isDark ? 'bg-amber-500' : 'bg-slate-700'} p-2.5 rounded-2xl`}>
              {isDark ? (
                <Sun className="w-5 h-5 text-white" strokeWidth={2} />
              ) : (
                <Moon className="w-5 h-5 text-white" strokeWidth={2} />
              )}
            </div>
            <span className="text-gray-800 dark:text-gray-100 font-medium">{t.darkMode}</span>
          </div>
          
          {/* Toggle Switch */}
          <button
            onClick={toggleTheme}
            className={`relative w-[52px] h-8 rounded-full transition-colors duration-300 ${
              isDark ? 'bg-teal-500' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <motion.div
              className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-md"
              animate={{
                left: isDark ? '24px' : '4px'
              }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </button>
        </motion.div>

        {/* Pro Subscription Card */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-3">
          {isPro ? (
            <div className="bg-gradient-to-r from-teal-600 to-emerald-600 rounded-2xl p-4 shadow-elevation-2">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2.5 rounded-2xl">
                  <Crown className="w-5 h-5 text-white" strokeWidth={2} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold">{t.proActive}</span>
                    <span className="bg-white/25 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">PRO</span>
                  </div>
                  {expiresAt && (
                    <p className="text-white/70 text-xs mt-0.5">
                      {t.proExpires} {new Date(expiresAt).toLocaleDateString(language === 'ar' ? 'ar-DZ' : language === 'fr' ? 'fr-FR' : 'en-US')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowUpgradeModal(true)}
              className="w-full bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-600 rounded-2xl p-4 shadow-elevation-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2.5 rounded-2xl">
                    <Crown className="w-5 h-5 text-white" strokeWidth={2} />
                  </div>
                  <div className="text-left">
                    <p className="text-white font-bold">{t.upgradeToPro}</p>
                    <p className="text-white/70 text-xs">{t.unlockFeatures}</p>
                  </div>
                </div>
                <div className="bg-white/20 rounded-full p-2">
                  <ChevronRight className="w-5 h-5 text-white" />
                </div>
              </div>
            </motion.button>
          )}
        </motion.div>

        {/* Menu Items */}
        <div className="space-y-2 mb-3">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 + index * 0.06 }}
                whileTap={{ scale: 0.98 }}
                onClick={item.action}
                className="w-full bg-white dark:bg-dark-card rounded-2xl p-4 shadow-elevation-1 flex items-center justify-between active:bg-slate-50 dark:active:bg-dark-card-high transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`${item.iconBg} p-2.5 rounded-2xl`}>
                    <Icon className="w-5 h-5 text-white" strokeWidth={2} />
                  </div>
                  <span className="text-gray-800 dark:text-gray-100 font-medium">{item.label}</span>
                </div>
                <div className="bg-slate-50 dark:bg-dark-card-high p-2 rounded-xl">
                  <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                </div>
              </motion.button>
            );
          })}
        </div>
        {/* About Us / Privacy / Contact / Delete grouped */}
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-elevation-1 overflow-hidden mb-3">
          {[
            { icon: Info, label: t.aboutUs, iconBg: 'bg-indigo-500', action: () => setShowAboutModal(true) },
            { icon: Shield, label: t.privacyPolicy, iconBg: 'bg-emerald-500', action: () => setShowPrivacyModal(true) },
            { icon: Mail, label: t.contactSupport, iconBg: 'bg-blue-500', action: () => window.open('mailto:contact@rihlaty.ai', '_blank'), subtitle: 'contact@rihlaty.ai' },
          ].map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.button
                key={index}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.28 + index * 0.04 }}
                whileTap={{ scale: 0.99 }}
                onClick={item.action}
                className={`w-full p-4 flex items-center justify-between active:bg-slate-50 dark:active:bg-dark-card-high transition-colors ${
                  index < 2 ? 'border-b border-gray-100/80 dark:border-gray-700/30' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`${item.iconBg} p-2.5 rounded-2xl`}>
                    <Icon className="w-5 h-5 text-white" strokeWidth={2} />
                  </div>
                  <div>
                    <span className="text-gray-800 dark:text-gray-100 font-medium block">{item.label}</span>
                    {item.subtitle && (
                      <span className="text-gray-400 dark:text-gray-500 text-xs">{item.subtitle}</span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 dark:text-gray-600" />
              </motion.button>
            );
          })}
        </div>

        {/* Delete Account Button */}
        <motion.button
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { setDeleteError(''); setShowDeleteModal(true); }}
          className="w-full bg-white dark:bg-dark-card rounded-2xl p-4 shadow-elevation-1 flex items-center justify-between active:bg-red-50 dark:active:bg-red-900/10 transition-colors mb-4"
        >
          <div className="flex items-center gap-3">
            <div className="bg-red-500 p-2.5 rounded-2xl">
              <Trash2 className="w-5 h-5 text-white" strokeWidth={2} />
            </div>
            <span className="text-red-600 dark:text-red-400 font-medium">{t.deleteAccount}</span>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-300 dark:text-gray-600" />
        </motion.button>

        {/* Logout Button */}
        <motion.button
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.44 }}
          whileTap={{ scale: 0.98 }}
          onClick={async () => {
            try {
              await logout();
              onLogout();
            } catch (error) {
            }
          }}
          className="w-full bg-red-500 dark:bg-red-600 rounded-2xl py-4 shadow-elevation-1 flex items-center justify-center gap-2 text-white font-bold"
        >
          <LogOut className="w-5 h-5" />
          {t.logout}
        </motion.button>
      </div>

      {/* Edit Info Modal */}
      <ModalWrapper show={showEditModal} onClose={() => setShowEditModal(false)}>
        <ModalHeader title={t.editInfo} gradient="from-cyan-500 to-blue-500" onClose={() => setShowEditModal(false)} />
        <div className="p-5">
          <label className="block text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">{t.fullName}</label>
          <input
            type="text"
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-dark-card-high border border-gray-200/80 dark:border-gray-700/50 rounded-2xl focus:outline-none focus:border-cyan-400 dark:focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 dark:focus:ring-cyan-900/30 text-gray-800 dark:text-gray-100 mb-4 transition-all"
          />
          <div className="flex gap-3">
            <button
              onClick={() => setShowEditModal(false)}
              className="flex-1 py-3 bg-slate-100 dark:bg-dark-card-high rounded-2xl text-gray-600 dark:text-gray-300 font-medium hover:bg-slate-200 dark:hover:bg-dark-surface transition-colors"
            >
              {t.cancel}
            </button>
            <button
              onClick={handleSaveName}
              className="flex-1 py-3 bg-teal-500 rounded-2xl text-white font-bold"
            >
              {t.save}
            </button>
          </div>
        </div>
      </ModalWrapper>

      {/* Language Modal */}
      <ModalWrapper show={showLanguageModal} onClose={() => setShowLanguageModal(false)}>
        <ModalHeader title={t.selectLanguage} gradient="from-violet-500 to-purple-500" onClose={() => setShowLanguageModal(false)} />
        <div className="p-3">
          {languages.map((lang) => (
            <motion.button
              key={lang.code}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleLanguageSelect(lang.code)}
              className={`w-full px-4 py-3.5 flex items-center justify-between rounded-2xl transition-colors mb-1 ${
                language === lang.code 
                  ? 'bg-teal-50 dark:bg-teal-900/30 border-2 border-teal-300 dark:border-teal-700' 
                  : 'border-2 border-transparent hover:bg-slate-50 dark:hover:bg-dark-card-high'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{lang.flag}</span>
                <span className="text-gray-800 dark:text-gray-100 font-medium">{lang.label}</span>
              </div>
              {language === lang.code && (
                <Check className="w-5 h-5 text-teal-500 dark:text-teal-400" />
              )}
            </motion.button>
          ))}
        </div>
      </ModalWrapper>

      {/* Privacy Policy Modal */}
      <ModalWrapper show={showPrivacyModal} onClose={() => setShowPrivacyModal(false)}>
        <div className="max-h-[80vh] flex flex-col">
          <ModalHeader title={t.privacyTitle} gradient="from-emerald-500 to-teal-500" onClose={() => setShowPrivacyModal(false)} />
          <div className="p-5 overflow-y-auto">
            <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-line leading-relaxed">
              {t.privacyContent}
            </p>
          </div>
        </div>
      </ModalWrapper>

      {/* About Us Modal */}
      <ModalWrapper show={showAboutModal} onClose={() => setShowAboutModal(false)}>
        <div className="max-h-[80vh] flex flex-col">
          <ModalHeader title={t.aboutTitle} gradient="from-indigo-500 to-purple-500" onClose={() => setShowAboutModal(false)} />
          <div className="p-5 overflow-y-auto">
            <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-line leading-relaxed">
              {t.aboutContent}
            </p>
          </div>
        </div>
      </ModalWrapper>

      {/* Delete Account Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-5"
            onClick={() => !deleting && setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-dark-card rounded-3xl w-full max-w-sm overflow-hidden shadow-elevation-3"
            >
              <ModalHeader title={t.deleteTitle} gradient="from-red-500 to-rose-500" onClose={() => !deleting && setShowDeleteModal(false)} disabled={deleting} />
              <div className="p-5">
                <div className="flex justify-center mb-4">
                  <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-full">
                    <AlertTriangle className="w-10 h-10 text-red-500" />
                  </div>
                </div>
                <p className="text-gray-700 dark:text-gray-300 text-sm text-center mb-6 leading-relaxed">
                  {t.deleteWarning}
                </p>
                {deleteError && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-2xl p-3 mb-4">
                    <p className="text-red-600 dark:text-red-400 text-sm text-center">{deleteError}</p>
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    disabled={deleting}
                    className="flex-1 py-3 bg-slate-100 dark:bg-dark-card-high rounded-2xl text-gray-600 dark:text-gray-300 font-medium hover:bg-slate-200 dark:hover:bg-dark-surface transition-colors disabled:opacity-50"
                  >
                    {t.cancel}
                  </button>
                  <button
                    onClick={async () => {
                      setDeleting(true);
                      setDeleteError('');
                      try {
                        await deleteAccount();
                        onLogout();
                      } catch (error) {
                        console.error('Delete failed:', error);
                        setDeleteError(t.deleteError);
                        setDeleting(false);
                      }
                    }}
                    disabled={deleting}
                    className="flex-1 py-3 bg-red-500 hover:bg-red-600 rounded-2xl text-white font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {deleting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {t.deleting}
                      </>
                    ) : (
                      t.deleteConfirm
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notifications Settings Modal */}
      <ModalWrapper show={showNotificationsModal} onClose={() => setShowNotificationsModal(false)}>
        <ModalHeader title={t.notificationsTitle} gradient="from-orange-500 to-amber-500" onClose={() => setShowNotificationsModal(false)} />
        <div className="p-4">
          {!notificationsSupported ? (
            <div className="text-center py-6">
              <Bell className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
              <p className="text-gray-400 dark:text-gray-500 text-sm">{t.notificationsDisabled}</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {/* Weather Notifications */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-dark-card-high rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="bg-sky-500 p-2 rounded-xl">
                    <Cloud className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-gray-800 dark:text-gray-100 font-medium text-sm">{t.weatherNotifications}</p>
                    <p className="text-gray-400 dark:text-gray-500 text-xs">{t.weatherDesc}</p>
                  </div>
                </div>
                <button
                  onClick={() => updateNotificationSettings({ weatherEnabled: !notificationSettings.weatherEnabled })}
                  className={`relative w-[52px] h-8 rounded-full transition-colors duration-300 flex-shrink-0 ${
                    notificationSettings.weatherEnabled ? 'bg-teal-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <motion.div
                    className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-md"
                    animate={{ left: notificationSettings.weatherEnabled ? '24px' : '2px' }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                </button>
              </div>

              {/* Nearby Places */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-dark-card-high rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-500 p-2 rounded-xl">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-gray-800 dark:text-gray-100 font-medium text-sm">{t.nearbyNotifications}</p>
                    <p className="text-gray-400 dark:text-gray-500 text-xs">{t.nearbyDesc}</p>
                  </div>
                </div>
                <button
                  onClick={() => updateNotificationSettings({ nearbyPlacesEnabled: !notificationSettings.nearbyPlacesEnabled })}
                  className={`relative w-[52px] h-8 rounded-full transition-colors duration-300 flex-shrink-0 ${
                    notificationSettings.nearbyPlacesEnabled ? 'bg-teal-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <motion.div
                    className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-md"
                    animate={{ left: notificationSettings.nearbyPlacesEnabled ? '24px' : '2px' }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                </button>
              </div>

              {/* AI Suggestions */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-dark-card-high rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="bg-violet-500 p-2 rounded-xl">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-gray-800 dark:text-gray-100 font-medium text-sm">{t.aiNotifications}</p>
                    <p className="text-gray-400 dark:text-gray-500 text-xs">{t.aiDesc}</p>
                  </div>
                </div>
                <button
                  onClick={() => updateNotificationSettings({ aiSuggestionsEnabled: !notificationSettings.aiSuggestionsEnabled })}
                  className={`relative w-[52px] h-8 rounded-full transition-colors duration-300 flex-shrink-0 ${
                    notificationSettings.aiSuggestionsEnabled ? 'bg-teal-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <motion.div
                    className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-md"
                    animate={{ left: notificationSettings.aiSuggestionsEnabled ? '24px' : '2px' }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                </button>
              </div>
            </div>
          )}
        </div>
      </ModalWrapper>
    </div>
  );
}
