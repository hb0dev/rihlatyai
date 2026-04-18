import { WORKER_URL, getAuthBearerHeader } from '../config/apiKeys';
export type AIModel = 'kimi' | 'kimi-thinking';

export interface Citation {
  url: string;
  title: string;
  startIndex?: number;
  endIndex?: number;
}

export interface Place {
  id: string;
  name: string;
  nameAr?: string;
  nameFr?: string;
  province?: string;
  city?: string;
  coordinates: {
    lat: number;
    lon: number;
  };
  category?: string;
  place_id?: string;
  rating?: number;
  user_ratings_total?: number;
  price?: number;
  priceRange?: string;
  description?: string;
  openingHours?: string;
  image?: string;
  distance?: number;
}
export interface UserContext {
  coordinates: {
    lat: number;
    lon: number;
  } | null;
  locationLabel: string;
  language: string;
}
export interface AIResponse {
  text: string;
  reasoning?: string;
  citations?: Citation[];
  places?: Place[];
  error?: string;
  errorCode?: 'quota_exceeded' | 'pro_required' | 'unknown';
}

export const calculateDistance = (
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c * 10) / 10;
};

const getSystemPrompt = (language: string, userContext: UserContext, places: Place[]): string => {
  const langInstructions = {
    ar: 'أجب دائماً باللغة العربية.',
    fr: 'Répondez toujours en français.',
    en: 'Always respond in English.'
  };

  // Group places by category with distance
  const placesByCategory: { [key: string]: string[] } = {};
  
  places.forEach(p => {
    const cat = p.category || 'other';
    if (!placesByCategory[cat]) {
      placesByCategory[cat] = [];
    }
    
    let distanceStr = '';
    if (userContext.coordinates && p.coordinates) {
      const dist = calculateDistance(
        userContext.coordinates.lat,
        userContext.coordinates.lon,
        p.coordinates.lat,
        p.coordinates.lon
      );
      distanceStr = ` (${dist} كم)`;
    }
    
    const location = p.city || p.province || '';
    const ratingStr = p.rating ? ` ⭐${p.rating}` : '';
    const pidStr = p.place_id ? ` {pid:${p.place_id}}` : '';
    placesByCategory[cat].push(`${p.name}${location ? ' - ' + location : ''}${distanceStr}${ratingStr}${pidStr}`);
  });

  const categoryNames: { [key: string]: string } = {
    beach: '🏖️ الشواطئ',
    nature: '🌲 الطبيعة والحدائق',
    historical: '🏛️ المواقع التاريخية',
    hotel: '🏨 الفنادق',
    restaurant: '🍽️ المطاعم والمقاهي',
    shopping: '🛍️ التسوق'
  };

  let placesInfo = '';
  for (const [cat, items] of Object.entries(placesByCategory)) {
    if (items.length > 0) {
      const catName = categoryNames[cat] || cat;
      placesInfo += `\n${catName}:\n`;
      items.slice(0, 10).forEach(item => {
        placesInfo += `  • ${item}\n`;
      });
    }
  }

  const beachCount = placesByCategory['beach']?.length || 0;
  const natureCount = placesByCategory['nature']?.length || 0;
  const historicalCount = placesByCategory['historical']?.length || 0;
  const hotelCount = placesByCategory['hotel']?.length || 0;
  const restaurantCount = placesByCategory['restaurant']?.length || 0;

  return `أنت مساعد سياحي ذكي لتطبيق "رحلتي" المتخصص في السياحة الجزائرية.
${langInstructions[language as keyof typeof langInstructions] || langInstructions.ar}

=== معلومات المستخدم ===
📍 الموقع الحالي: ${userContext.locationLabel || 'الجزائر'}
${userContext.coordinates ? `الإحداثيات: ${userContext.coordinates.lat.toFixed(4)}, ${userContext.coordinates.lon.toFixed(4)}` : ''}
=== الأماكن المتاحة القريبة من المستخدم ===
📊 إحصائيات: ${beachCount} شاطئ، ${natureCount} موقع طبيعي، ${historicalCount} موقع تاريخي، ${hotelCount} فندق، ${restaurantCount} مطعم
${placesInfo || 'جاري تحميل البيانات...'}
=== تعليمات مهمة ===
1. عند سؤال المستخدم عن الشواطئ أو أي فئة، استخدم البيانات أعلاه مباشرة.
2. اذكر المسافة بالكيلومترات الموجودة بين الأقواس.
3. إذا وجدت أماكن في البيانات، اعرضها بشكل منظم مع المسافات.
4. كن ودوداً واستخدم الرموز التعبيرية باعتدال.
5. إذا سأل عن شيء غير متعلق بالسياحة الجزائرية، أعد توجيهه بلطف.
6. ⚠️ مهم جداً: لا تُظهر أبداً علامات {pid:...} في ردودك. هذه بيانات داخلية للنظام فقط ولا يجب أن يراها المستخدم.

=== أمثلة على الردود الجيدة ===
سؤال: "أفضل الشواطئ القريبة"
جواب جيد: "🏖️ إليك أقرب الشواطئ من موقعك:
1. شاطئ سيدي فرج (15 كم) - شاطئ رملي جميل
2. شاطئ زرالدة (25 كم) - مناسب للعائلات
..."

=== عرض صور وتفاصيل الأماكن ===
عندما يطلب المستخدم رؤية صور أو تفاصيل أو معلومات إضافية عن مكان محدد، أضف هذا الرمز في ردك:
[PLACE:place_id:اسم_المكان]
- استخدم place_id من {pid:...} الموجود في بيانات الأماكن أعلاه (لكن لا تكتب {pid:...} في ردك أبداً)
- أضف بطاقة واحدة أو اثنتين فقط حسب طلب المستخدم
- لا تستخدم هذا الرمز إلا عندما يطلب المستخدم صوراً أو تفاصيل مكان صراحة
مثال: "إليك تفاصيل وصور الفندق:
[PLACE:ChIJxxxxx:فندق الأوراسي]"`;
};

interface SendMessageOptions {
  model: AIModel;
  useWebSearch?: boolean;
}

const MODELS_WITH_VISIBLE_REASONING: AIModel[] = ['kimi-thinking'];

export const sendMessageToAI = async (
  message: string,
  userContext: UserContext,
  homePageData: Place[],
  conversationHistory: { role: 'user' | 'model'; text: string }[] = [],
  options: SendMessageOptions = { model: 'kimi' }
): Promise<AIResponse> => {
  try {
    let placesWithDistance = homePageData;
    if (userContext.coordinates) {
      placesWithDistance = homePageData.map(p => ({
        ...p,
        distance: p.coordinates ? calculateDistance(
          userContext.coordinates!.lat,
          userContext.coordinates!.lon,
          p.coordinates.lat,
          p.coordinates.lon
        ) : undefined
      })).sort((a, b) => (a.distance || 999) - (b.distance || 999));
    }

    const systemPrompt = getSystemPrompt(userContext.language, userContext, placesWithDistance);

    const messages = [
      {
        role: 'system',
        content: systemPrompt
      },
      ...conversationHistory.map(msg => ({
        role: msg.role === 'model' ? 'assistant' : 'user',
        content: msg.text
      })),
      {
        role: 'user',
        content: message
      }
    ];

    const authHeaders = await getAuthBearerHeader();
    const response = await fetch(`${WORKER_URL}/ai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({
        model: options.model,
        useWebSearch: options.useWebSearch === true,
        messages,
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Worker /ai non-OK response:', response.status, errorData);

      const errCode: AIResponse['errorCode'] =
        errorData?.error === 'quota_exceeded' ? 'quota_exceeded'
        : errorData?.error === 'pro_required' ? 'pro_required'
        : 'unknown';

      const quotaMessages = {
        ar: 'تجاوزت الحد الشهري لهذا النموذج. جدّد الاشتراك أو انتظر بداية الشهر القادم.',
        fr: 'Vous avez atteint la limite mensuelle pour ce modèle.',
        en: 'You have reached the monthly limit for this model.'
      };
      const proMessages = {
        ar: 'هذا النموذج حصري لمشتركي Pro.',
        fr: 'Ce modèle est réservé aux abonnés Pro.',
        en: 'This model is available on Pro only.'
      };
      const genericMessages = {
        ar: 'عذراً، حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.',
        fr: 'Désolé, une erreur de connexion s\'est produite. Veuillez réessayer.',
        en: 'Sorry, a connection error occurred. Please try again.'
      };

      const lang = userContext.language as keyof typeof quotaMessages;
      let text =
        errCode === 'quota_exceeded' ? (quotaMessages[lang] || quotaMessages.ar)
        : errCode === 'pro_required' ? (proMessages[lang] || proMessages.ar)
        : (genericMessages[lang] || genericMessages.ar);

      // Surface the upstream error message inline so the user (and you, when
      // debugging) can see exactly what went wrong instead of a generic line.
      const upstreamMsg = errorData?.message || (typeof errorData?.error === 'string' ? errorData.error : '');
      if (errCode === 'unknown' && upstreamMsg) {
        text = `${text}\n\n[${response.status}] ${upstreamMsg}`;
      }

      return {
        text,
        error: upstreamMsg || `API Error: ${response.status}`,
        errorCode: errCode,
      };
    }

    const data = await response.json();

    if (!data.choices || data.choices.length === 0) {
      throw new Error('No response from AI');
    }

    const choice = data.choices[0];
    const msg = choice?.message || {};
    const aiText: string = msg.content || '';
    let reasoning: string | undefined;
    if (MODELS_WITH_VISIBLE_REASONING.includes(options.model)) {
      if (typeof msg.reasoning === 'string' && msg.reasoning.trim()) {
        reasoning = msg.reasoning;
      } else if (Array.isArray(msg.reasoning_details)) {
        const joined = msg.reasoning_details
          .map((p: any) => (typeof p?.text === 'string' ? p.text : ''))
          .filter(Boolean)
          .join('\n');
        if (joined.trim()) reasoning = joined;
      }
    }

    // Extract web-search citations (standardized url_citation annotations).
    let citations: Citation[] | undefined;
    if (Array.isArray(msg.annotations)) {
      const list: Citation[] = [];
      for (const ann of msg.annotations) {
        if (ann?.type === 'url_citation' && ann.url_citation?.url) {
          list.push({
            url: ann.url_citation.url,
            title: ann.url_citation.title || ann.url_citation.url,
            startIndex: ann.url_citation.start_index,
            endIndex: ann.url_citation.end_index,
          });
        }
      }
      if (list.length > 0) citations = list;
    }

    return {
      text: aiText,
      reasoning,
      citations,
    };
  } catch (error: any) {
    console.error('AI Service Error:', error);

    const errorMessages = {
      ar: 'عذراً، حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.',
      fr: 'Désolé, une erreur de connexion s\'est produite. Veuillez réessayer.',
      en: 'Sorry, a connection error occurred. Please try again.'
    };

    return {
      text: errorMessages[userContext.language as keyof typeof errorMessages] || errorMessages.ar,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorCode: 'unknown',
    };
  }
};

// Quick suggestion queries
export const getQuickSuggestions = (language: string): string[] => {
  const suggestions = {
    ar: [
      'ما هي أقرب الشواطئ من موقعي؟',
      'أريد زيارة مكان تاريخي',
      'أين أجد فنادق قريبة؟',
      'اقترح لي رحلة ليوم واحد',
      'أماكن طبيعية للتنزه'
    ],
    fr: [
      'Quelles sont les plages les plus proches?',
      'Je veux visiter un site historique',
      'Où trouver des hôtels proches?',
      'Suggérez-moi une excursion d\'une journée',
      'Endroits naturels pour se promener'
    ],
    en: [
      'What are the nearest beaches?',
      'I want to visit a historical site',
      'Where to find nearby hotels?',
      'Suggest a day trip for me',
      'Natural places for hiking'
    ]
  };
  
  return suggestions[language as keyof typeof suggestions] || suggestions.ar;
};

