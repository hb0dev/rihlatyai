import { motion } from 'motion/react';
import { ArrowRight, Shield, MapPin, Bot, Lock, Trash2, Mail, CreditCard, BarChart3 } from 'lucide-react';
import logo from '../logo/rihlaty logo.png';

interface PrivacyPolicyPageProps {
  language: string;
  onNavigateBack: () => void;
}

export function PrivacyPolicyPage({ language, onNavigateBack }: PrivacyPolicyPageProps) {
  const translations = {
    ar: {
      title: 'سياسة الخصوصية',
      subtitle: 'تطبيق رحلتي - Rihlaty',
      lastUpdated: 'آخر تحديث: أبريل 2026 · الإصدار 2.1.0',
      back: 'رجوع',
      intro: 'نحن في تطبيق رحلتي نحترم خصوصيتك ونلتزم بحماية بياناتك الشخصية. توضح هذه السياسة كيفية جمع واستخدام وحماية معلوماتك.',
      sections: [
        {
          icon: 'location',
          title: 'الموقع الجغرافي',
          content: [
            'نستخدم موقعك لعرض الأماكن السياحية القريبة منك',
            'نحسب المسافات بينك وبين الوجهات المختلفة',
            'نقدم لك اقتراحات مخصصة بناءً على موقعك الحالي',
            'لا نشارك موقعك مع أي طرف ثالث',
            'يمكنك إيقاف الوصول للموقع في أي وقت من إعدادات جهازك'
          ]
        },
        {
          icon: 'ai',
          title: 'المساعد الذكي (Kimi K2.5)',
          content: [
            'نستخدم نماذج Moonshot AI — Kimi K2.5 (للجميع) و Kimi K2.5 Thinking (لمشتركي Pro) — عبر خدمة الوساطة OpenRouter',
            'عند إرسال رسالة: تُنقَل رسالتك، موقعك التقريبي، وقائمة مختصرة بالأماكن القريبة إلى OpenRouter ثم إلى Moonshot AI لتوليد الرد فقط، دون حفظها لدى هذه الأطراف لأغراض التدريب',
            'عند تفعيل خاصية "البحث في الويب" يتم استعلام محرك بحث خارجي (Exa عبر OpenRouter) لإحضار مصادر محدّثة، وتُعرَض لك روابطها ضمن الرد',
            'محادثاتك مع المساعد الذكي تُحفظ في حسابك على Firestore وتبقى خاصة بك وحدك',
            'عند حذف محادثة يتم إخفاؤها فوراً من واجهتك، ثم تُحذف نهائياً بعد فترة أرشفة قصيرة',
            'لا نستخدم محادثاتك لتدريب نماذج ذكاء اصطناعي مخصصة، ولا نبيع بياناتك أو محادثاتك لأطراف ثالثة'
          ]
        },
        {
          icon: 'tokens',
          title: 'حصص التوكنز الشهرية',
          content: [
            'خطة Free: 60 ألف توكن إدخال + 40 ألف توكن إخراج شهرياً لنموذج Kimi K2.5 (تقريباً 80 رسالة)',
            'خطة Pro: 800 ألف توكن إدخال + 700 ألف توكن إخراج شهرياً لـ Kimi K2.5، بالإضافة إلى 150 ألف + 150 ألف لنموذج K2.5 Thinking',
            'تُسجَّل هذه الأرقام فقط كمجاميع شهرية في وثيقة محميّة على Firestore ولا تحتوي على نص محادثاتك',
            'يُعاد ضبط العدّاد تلقائياً في أول كل شهر ميلادي (UTC)',
            'الكتابة إلى عدّاد التوكنز تتم حصراً عبر خادمنا الآمن (Cloudflare Worker) حتى لا يتمكن أي طرف من التلاعب بها'
          ]
        },
        {
          icon: 'payment',
          title: 'الدفع والاشتراكات',
          content: [
            'نقدم خطة مجانية وخطة Pro مدفوعة: 6.99$ / 1,800 د.ج شهرياً، أو 79.99$ / 19,900 د.ج سنوياً',
            'يتم الدفع عبر بوابة Chargily Pay الآمنة (تدعم بطاقات CIB و EDAHABIA)',
            'لا نخزّن بيانات بطاقتك البنكية في خوادمنا - تتم المعالجة بالكامل عبر Chargily',
            'التحقق من الدفع وتفعيل الاشتراك يتمّان حصرياً عبر خادم آمن (Server-side) باستخدام حساب خدمة Firebase، لحماية حسابك',
            'يمكنك إلغاء اشتراكك في أي وقت، ويبقى فعالاً حتى انتهاء الفترة المدفوعة',
            'نحفظ فقط: نوع الاشتراك وتاريخ الانتهاء في حسابك'
          ]
        },
        {
          icon: 'data',
          title: 'البيانات الشخصية',
          content: [
            'نحفظ فقط: اسمك الكامل، بريدك الإلكتروني، صورتك من Google، وحالة اشتراكك',
            'بياناتك محمية بقواعد أمان Firebase من Google وبتشفير SSL/TLS لجميع الاتصالات',
            'لا نخزّن معلومات بنكية حساسة مثل أرقام البطاقات أو كلمات المرور',
            'جميع طلبات API (الخرائط، المساعد الذكي، الدفع) تمر عبر خادم وسيط آمن (Cloudflare Worker)',
            'مفاتيح مزوّدي الخدمات الخارجية (Google Maps، OpenRouter، Chargily، Firebase Admin) محفوظة لدى الخادم فقط ولا تصل إلى تطبيقك أو جهازك'
          ]
        },
        {
          icon: 'delete',
          title: 'حقوقك',
          content: [
            'يمكنك حذف حسابك في أي وقت من صفحة الملف الشخصي',
            'عند حذف الحساب، يتم حذف جميع بياناتك ومحادثاتك واشتراكاتك نهائياً',
            'يمكنك طلب نسخة من بياناتك عبر التواصل معنا',
            'يمكنك إيقاف الإشعارات من إعدادات التطبيق',
            'يمكنك تغيير اللغة والمظهر حسب تفضيلاتك'
          ]
        },
        {
          icon: 'contact',
          title: 'التواصل معنا',
          content: [
            'للاستفسارات حول الخصوصية: contact@rihlaty.ai',
            'الموقع الإلكتروني: www.rihlaty.ai'
          ]
        }
      ]
    },
    fr: {
      title: 'Politique de Confidentialité',
      subtitle: 'Application Rihlaty',
      lastUpdated: 'Dernière mise à jour: Avril 2026 · Version 2.1.0',
      back: 'Retour',
      intro: 'Chez Rihlaty, nous respectons votre vie privée et nous engageons à protéger vos données personnelles. Cette politique explique comment nous collectons, utilisons et protégeons vos informations.',
      sections: [
        {
          icon: 'location',
          title: 'Géolocalisation',
          content: [
            'Nous utilisons votre position pour afficher les lieux touristiques proches',
            'Nous calculons les distances entre vous et différentes destinations',
            'Nous fournissons des suggestions personnalisées basées sur votre position',
            'Nous ne partageons pas votre position avec des tiers',
            'Vous pouvez désactiver l\'accès à la localisation à tout moment'
          ]
        },
        {
          icon: 'ai',
          title: 'Assistant IA (Kimi K2.5)',
          content: [
            'Nous utilisons les modèles de Moonshot AI — Kimi K2.5 (pour tous) et Kimi K2.5 Thinking (abonnés Pro) — via le service intermédiaire OpenRouter',
            'Lors de l\'envoi d\'un message, votre requête, votre position approximative et une courte liste de lieux proches sont transmises à OpenRouter puis à Moonshot AI uniquement pour générer la réponse — elles ne sont pas stockées à des fins d\'entraînement',
            'Lorsque la « recherche web » est activée, une requête est envoyée à un moteur externe (Exa via OpenRouter) pour récupérer des sources à jour dont les liens apparaissent dans la réponse',
            'Vos conversations avec l\'assistant sont sauvegardées dans votre compte sur Firestore et restent privées',
            'Lorsque vous supprimez une conversation, elle disparaît immédiatement de votre interface puis est définitivement supprimée après une courte période d\'archivage',
            'Nous n\'utilisons pas vos conversations pour entraîner des modèles d\'IA personnalisés et nous ne les vendons pas à des tiers'
          ]
        },
        {
          icon: 'tokens',
          title: 'Quotas mensuels de tokens',
          content: [
            'Plan Free : 60 000 tokens d\'entrée + 40 000 tokens de sortie par mois pour Kimi K2.5 (environ 80 messages)',
            'Plan Pro : 800 000 + 700 000 tokens par mois pour Kimi K2.5, plus 150 000 + 150 000 tokens pour Kimi K2.5 Thinking',
            'Ces chiffres sont stockés uniquement sous forme de totaux mensuels dans un document sécurisé sur Firestore, et ne contiennent pas le texte de vos conversations',
            'Le compteur est remis à zéro automatiquement le premier jour de chaque mois calendaire (UTC)',
            'L\'écriture du compteur est réservée à notre serveur sécurisé (Cloudflare Worker) pour empêcher toute manipulation côté client'
          ]
        },
        {
          icon: 'payment',
          title: 'Paiement et Abonnements',
          content: [
            'Nous proposons un plan gratuit et un plan Pro payant : 6,99 $ / 1 800 DA par mois, ou 79,99 $ / 19 900 DA par an',
            'Le paiement est traité via la passerelle sécurisée Chargily Pay (cartes CIB et EDAHABIA)',
            'Nous ne stockons pas vos données bancaires sur nos serveurs - le traitement est entièrement géré par Chargily',
            'La vérification du paiement et l\'activation de l\'abonnement sont effectuées exclusivement côté serveur à l\'aide d\'un compte de service Firebase, afin de protéger votre compte',
            'Vous pouvez annuler votre abonnement à tout moment, il reste actif jusqu\'à la fin de la période payée',
            'Nous conservons uniquement: le type d\'abonnement et la date d\'expiration dans votre compte'
          ]
        },
        {
          icon: 'data',
          title: 'Données Personnelles',
          content: [
            'Nous conservons uniquement: nom, email, photo Google et statut d\'abonnement',
            'Vos données sont protégées par les règles de sécurité Firebase et chiffrées en SSL/TLS pour toutes les communications',
            'Nous ne stockons pas d\'informations bancaires sensibles comme les numéros de carte ou mots de passe',
            'Toutes les requêtes API (cartes, IA, paiement) passent par un serveur intermédiaire sécurisé (Cloudflare Worker)',
            'Les clés des services externes (Google Maps, OpenRouter, Chargily, Firebase Admin) sont uniquement stockées côté serveur et ne sont jamais exposées à votre appareil'
          ]
        },
        {
          icon: 'delete',
          title: 'Vos Droits',
          content: [
            'Vous pouvez supprimer votre compte à tout moment',
            'La suppression du compte efface définitivement toutes vos données, conversations et abonnements',
            'Vous pouvez demander une copie de vos données',
            'Vous pouvez désactiver les notifications',
            'Vous pouvez changer la langue et le thème'
          ]
        },
        {
          icon: 'contact',
          title: 'Nous Contacter',
          content: [
            'Questions de confidentialité: contact@rihlaty.ai',
            'Site web: www.rihlaty.ai'
          ]
        }
      ]
    },
    en: {
      title: 'Privacy Policy',
      subtitle: 'Rihlaty Application',
      lastUpdated: 'Last updated: April 2026 · Version 2.1.0',
      back: 'Back',
      intro: 'At Rihlaty, we respect your privacy and are committed to protecting your personal data. This policy explains how we collect, use, and protect your information.',
      sections: [
        {
          icon: 'location',
          title: 'Location Data',
          content: [
            'We use your location to show nearby tourist places',
            'We calculate distances between you and various destinations',
            'We provide personalized suggestions based on your current location',
            'We do not share your location with third parties',
            'You can disable location access at any time from device settings'
          ]
        },
        {
          icon: 'ai',
          title: 'AI Assistant (Kimi K2.5)',
          content: [
            'We use Moonshot AI\'s models — Kimi K2.5 (for everyone) and Kimi K2.5 Thinking (for Pro subscribers) — through the OpenRouter broker',
            'When you send a message, your request, your approximate location, and a short list of nearby places are forwarded to OpenRouter and then to Moonshot AI solely to generate the reply — they are not retained by those parties for training',
            'When you enable "Web search", a query is sent to an external search engine (Exa via OpenRouter) to fetch up-to-date sources whose links are shown with the reply',
            'Your conversations with the assistant are saved in your account on Firestore and remain private to you',
            'When you delete a conversation it is hidden from your view immediately and permanently deleted after a short archival window',
            'We do not use your conversations to train custom AI models and we do not sell your data or conversations to third parties'
          ]
        },
        {
          icon: 'tokens',
          title: 'Monthly Token Quotas',
          content: [
            'Free plan: 60K input + 40K output tokens per month for Kimi K2.5 (roughly 80 messages)',
            'Pro plan: 800K + 700K tokens per month for Kimi K2.5, plus 150K + 150K tokens for Kimi K2.5 Thinking',
            'These numbers are stored only as monthly aggregates in a protected Firestore document — they do not contain the text of your conversations',
            'Counters reset automatically on the first day of every calendar month (UTC)',
            'Writing to the token counter is restricted to our secure server (Cloudflare Worker) so clients cannot tamper with it'
          ]
        },
        {
          icon: 'payment',
          title: 'Payment & Subscriptions',
          content: [
            'We offer a free plan and a paid Pro plan: $6.99 / 1,800 DZD per month, or $79.99 / 19,900 DZD per year',
            'Payments are processed via the secure Chargily Pay gateway (supports CIB and EDAHABIA cards)',
            'We do not store your bank card details on our servers - processing is handled entirely by Chargily',
            'Payment verification and subscription activation are performed exclusively server-side using a Firebase service account to protect your account',
            'You can cancel your subscription at any time, it remains active until the end of the paid period',
            'We only store: subscription type and expiry date in your account'
          ]
        },
        {
          icon: 'data',
          title: 'Personal Data',
          content: [
            'We only store: full name, email, Google photo, and subscription status',
            'Your data is protected by Firebase security rules and encrypted via SSL/TLS for all communications',
            'We do not store sensitive banking information like card numbers or passwords',
            'All API requests (maps, AI, payments) pass through a secure intermediary server (Cloudflare Worker)',
            'Third-party service keys (Google Maps, OpenRouter, Chargily, Firebase Admin) are kept server-side only and never reach your device'
          ]
        },
        {
          icon: 'delete',
          title: 'Your Rights',
          content: [
            'You can delete your account at any time from the profile page',
            'Deleting your account permanently removes all your data, conversations, and subscriptions',
            'You can request a copy of your data by contacting us',
            'You can disable notifications from app settings',
            'You can change language and theme according to your preferences'
          ]
        },
        {
          icon: 'contact',
          title: 'Contact Us',
          content: [
            'Privacy inquiries: contact@rihlaty.ai',
            'Website: www.rihlaty.ai'
          ]
        }
      ]
    }
  };

  const t = translations[language as keyof typeof translations] || translations.en;

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'location':
        return <MapPin className="w-5 h-5 text-white" />;
      case 'ai':
        return <Bot className="w-5 h-5 text-white" />;
      case 'tokens':
        return <BarChart3 className="w-5 h-5 text-white" />;
      case 'payment':
        return <CreditCard className="w-5 h-5 text-white" />;
      case 'data':
        return <Lock className="w-5 h-5 text-white" />;
      case 'delete':
        return <Trash2 className="w-5 h-5 text-white" />;
      case 'contact':
        return <Mail className="w-5 h-5 text-white" />;
      default:
        return <Shield className="w-5 h-5 text-white" />;
    }
  };

  const getIconColor = (iconName: string) => {
    switch (iconName) {
      case 'location':
        return 'from-blue-500 to-cyan-500';
      case 'ai':
        return 'from-purple-500 to-pink-500';
      case 'tokens':
        return 'from-teal-500 to-cyan-500';
      case 'payment':
        return 'from-amber-500 to-orange-500';
      case 'data':
        return 'from-emerald-500 to-teal-500';
      case 'delete':
        return 'from-orange-500 to-red-500';
      case 'contact':
        return 'from-indigo-500 to-blue-500';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f1419]">
      {/* Header */}
      <div className="bg-gradient-to-br from-teal-500 to-emerald-500 px-5 pt-12 pb-8 rounded-b-3xl">
        <div className="flex items-center justify-between mb-6">
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            whileTap={{ scale: 0.95 }}
            onClick={onNavigateBack}
            className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl text-white hover:bg-white/30 transition-colors"
          >
            <span className="font-medium text-sm">{t.back}</span>
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl p-2 flex items-center justify-center">
            <img src={logo} alt="Rihlaty" className="w-10 h-10 object-contain" />
          </div>
          <div>
            <h1 className="text-white text-xl font-bold">{t.title}</h1>
            <p className="text-white/70 text-sm">{t.subtitle}</p>
          </div>
        </motion.div>
      </div>

      {/* Content */}
      <div className="px-4 py-5 pb-10">
        {/* Last Updated */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-gray-400 dark:text-gray-500 text-xs mb-4 text-center"
        >
          {t.lastUpdated}
        </motion.p>

        {/* Introduction */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-dark-card rounded-2xl p-4 mb-4 shadow-elevation-1 border border-gray-100/80 dark:border-gray-700/30"
        >
          <div className="flex items-start gap-3">
            <div className="bg-gradient-to-br from-teal-500 to-emerald-500 p-2.5 rounded-xl flex-shrink-0">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
              {t.intro}
            </p>
          </div>
        </motion.div>

        {/* Sections */}
        {t.sections.map((section, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + index * 0.08 }}
            className="bg-white dark:bg-dark-card rounded-2xl p-4 mb-3 shadow-elevation-1 border border-gray-100/80 dark:border-gray-700/30"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`bg-gradient-to-br ${getIconColor(section.icon)} p-2.5 rounded-xl`}>
                {getIcon(section.icon)}
              </div>
              <h2 className="text-gray-800 dark:text-gray-100 font-semibold text-base">
                {section.title}
              </h2>
            </div>
            <ul className="space-y-2.5">
              {section.content.map((item, itemIndex) => (
                <li key={itemIndex} className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-2 flex-shrink-0" />
                  <span className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        ))}

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="text-center mt-8"
        >
          <p className="text-gray-400 dark:text-gray-600 text-xs">
            © 2026 Rihlaty. All rights reserved.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
