const ALLOWED_ORIGINS = [
  'https://rihlaty.ai',
  'https://www.rihlaty.ai',
  'https://rihlaty-app.web.app',
  'https://rihlaty-app.firebaseapp.com',
  'https://rihlatyai.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:4173',
  'capacitor://localhost',
  'http://localhost',
  'https://localhost',
];
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000;
const RATE_LIMITS = {
  '/create-checkout': 5,
  '/verify-payment': 10,
  '/ai': 20,
  '/places': 60,
  '/geocode': 30,
  '/autocomplete': 30,
  '/directions': 20,
  '/place-details': 40,
  '/place-photo': 80,
};
const AI_MODELS = {
  kimi: {
    slug: 'moonshotai/kimi-k2.5',
    bucket: 'kimi',
    supportsThinking: false,
  },
  'kimi-thinking': {
    slug: 'moonshotai/kimi-k2-thinking',
    bucket: 'thinking',
    supportsThinking: true,
    proOnly: true,
  },
};
const QUOTAS = {
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
};
function checkRateLimit(ip, path) {
  const key = `${ip}:${path}`;
  const now = Date.now();
  const limit = RATE_LIMITS[path] || 30;
  let entry = rateLimitMap.get(key);
  if (!entry || now - entry.start > RATE_LIMIT_WINDOW) {
    entry = { start: now, count: 0 };
    rateLimitMap.set(key, entry);
  }
  entry.count++;

  if (rateLimitMap.size > 10000) {
    for (const [k, v] of rateLimitMap) {
      if (now - v.start > RATE_LIMIT_WINDOW) rateLimitMap.delete(k);
    }
  }
  return entry.count <= limit;
}
let _cachedJWKs = null;
let _jwksExpiry = 0;
async function getGoogleJWKs() {
  const now = Date.now();
  if (_cachedJWKs && now < _jwksExpiry) {
    return _cachedJWKs;
  }
  const res = await fetch(
    'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'
  );
  const data = await res.json();
  const cacheControl = res.headers.get('cache-control');
  let maxAge = 3600;
  if (cacheControl) {
    const match = cacheControl.match(/max-age=(\d+)/);
    if (match) maxAge = parseInt(match[1]);
  }
  _cachedJWKs = data.keys;
  _jwksExpiry = now + maxAge * 1000;
  return data.keys;
}
function base64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
async function verifyFirebaseToken(authHeader, projectId) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const header = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')));
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    const now = Math.floor(Date.now() / 1000);
    if (!payload.sub || typeof payload.sub !== 'string' || payload.sub.length === 0) return null;
    if (payload.exp <= now) return null;
    if (payload.iat > now + 300) return null;
    if (payload.aud !== projectId) return null;
    if (payload.iss !== `https://securetoken.google.com/${projectId}`) return null;
    if (header.alg !== 'RS256') return null;
    const keys = await getGoogleJWKs();
    const key = keys.find((k) => k.kid === header.kid);
    if (!key) return null;
    const cryptoKey = await crypto.subtle.importKey(
      'jwk',
      { ...key, ext: true },
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const data = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    const signature = base64urlDecode(parts[2]);
    const isValid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      signature,
      data
    );
    if (!isValid) return null;
    return {
      uid: payload.sub,
      email: payload.email || '',
      emailVerified: payload.email_verified || false,
    };
  } catch (e) {
    return null;
  }
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const origin = request.headers.get('Origin') || '';
    const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin);
    const corsOrigin = isAllowedOrigin ? origin : ALLOWED_ORIGINS[0];
    const corsHeaders = {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin',
    };
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    if (!isAllowedOrigin && origin) {
      return jsonRes({ error: 'Forbidden' }, corsHeaders, 403);
    }
    const clientIP = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
    if (!checkRateLimit(clientIP, path)) {
      return jsonRes({ error: 'Too many requests' }, corsHeaders, 429);
    }
    const GOOGLE_KEY = env.GOOGLE_MAPS_API_KEY;
    const OPENROUTER_KEY = env.OPENROUTER_API_KEY;
    const CHARGILY_KEY = env.CHARGILY_SECRET_KEY;
    const CHARGILY_API = env.CHARGILY_API_URL || 'https://pay.chargily.com/test/api/v2';
    const FIREBASE_PROJECT_ID = env.FIREBASE_PROJECT_ID;
    if (path === '/geocode') {
      const lat = url.searchParams.get('lat');
      const lon = url.searchParams.get('lon');
      if (!lat || !lon || isNaN(Number(lat)) || isNaN(Number(lon))) {
        return jsonRes({ error: 'Valid lat and lon required' }, corsHeaders, 400);
      }
      try {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${encodeURIComponent(lat)},${encodeURIComponent(lon)}&key=${GOOGLE_KEY}&language=ar`
        );
        const data = await res.json();
        if (data.status === 'OK' && data.results?.length > 0) {
          const r = data.results[0];
          const get = (type) => {
            const c = r.address_components?.find((c) => c.types.includes(type));
            return c ? c.long_name : '';
          };
          return jsonRes({
            features: [{
              properties: {
                name: get('locality') || get('administrative_area_level_1'),
                city: get('locality') || get('administrative_area_level_2'),
                state: get('administrative_area_level_1'),
                county: get('administrative_area_level_2'),
                formatted: r.formatted_address,
                country: get('country'),
              },
              geometry: {
                coordinates: [r.geometry.location.lng, r.geometry.location.lat]
              }
            }]
          }, corsHeaders);
        }
        return jsonRes({ features: [] }, corsHeaders);
      } catch (e) {
        return jsonRes({ error: 'Geocode failed' }, corsHeaders, 500);
      }
    }
    if (path === '/places') {
      const categories = url.searchParams.get('categories') || '';
      const filter = url.searchParams.get('filter') || '';
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '20') || 20, 60);

      let lat = 0, lng = 0, radius = 50000;
      const m = filter.match(/circle:([-\d.]+),([-\d.]+),(\d+)/);
      if (m) {
        lng = parseFloat(m[1]);
        lat = parseFloat(m[2]);
        radius = parseInt(m[3]);
      }
      const bias = url.searchParams.get('bias') || '';
      if (!m && bias) {
        const bm = bias.match(/proximity:([-\d.]+),([-\d.]+)/);
        if (bm) { lng = parseFloat(bm[1]); lat = parseFloat(bm[2]); }
      }
      if (isNaN(lat) || isNaN(lng)) {
        return jsonRes({ error: 'Invalid coordinates' }, corsHeaders, 400);
      }
      const { type, keyword, filter: categoryFilter } = mapCategories(categories);
      const r = Math.min(radius, 50000);
      const fetchLimit = categoryFilter ? Math.max(limit * 2, 40) : limit;
      try {
        let gUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${r}&key=${GOOGLE_KEY}&language=ar`;
        if (type) gUrl += `&type=${type}`;
        if (keyword) gUrl += `&keyword=${encodeURIComponent(keyword)}`;
        const res = await fetch(gUrl);
        const data = await res.json();
        let results = data.results || [];
        if (categoryFilter && POST_FILTERS[categoryFilter]) {
          results = results.filter(POST_FILTERS[categoryFilter]);
        }
        const features = results.slice(0, limit).map((p) => ({
          properties: {
            name: p.name,
            address_line1: p.name,
            address_line2: p.vicinity || '',
            formatted: p.vicinity || p.name,
            city: extractCity(p.vicinity),
            state: '',
            county: '',
            categories: p.types || [],
            rating: p.rating,
            user_ratings_total: p.user_ratings_total,
            place_id: p.place_id,
            opening_hours: p.opening_hours,
          },
          geometry: {
            type: 'Point',
            coordinates: [p.geometry.location.lng, p.geometry.location.lat]
          }
        }));

        return jsonRes({ type: 'FeatureCollection', features }, corsHeaders);
      } catch (e) {
        return jsonRes({ type: 'FeatureCollection', features: [] }, corsHeaders);
      }
    }
    if (path === '/autocomplete') {
      const text = url.searchParams.get('text');
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '5') || 5, 10);
      if (!text || text.length > 200) {
        return jsonRes({ error: 'Valid text required' }, corsHeaders, 400);
      }
      try {
        const acRes = await fetch(
          `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${GOOGLE_KEY}&language=ar`
        );
        const acData = await acRes.json();
        if (acData.status === 'OK' && acData.predictions?.length > 0) {
          const predictions = acData.predictions.slice(0, limit);
          const detailsPromises = predictions.map(async (pred) => {
            try {
              const dRes = await fetch(
                `https://maps.googleapis.com/maps/api/place/details/json?place_id=${pred.place_id}&fields=geometry,name,formatted_address&key=${GOOGLE_KEY}`
              );
              const dData = await dRes.json();
              if (dData.status === 'OK' && dData.result) {
                const r = dData.result;
                return {
                  properties: {
                    name: r.name || pred.structured_formatting?.main_text || pred.description,
                    formatted: r.formatted_address || pred.description,
                    lat: r.geometry.location.lat,
                    lon: r.geometry.location.lng,
                  }
                };
              }
            } catch (e) {}
            return null;
          });
          const features = (await Promise.all(detailsPromises)).filter(Boolean);
          return jsonRes({ features }, corsHeaders);
        }
        return jsonRes({ features: [] }, corsHeaders);
      } catch (e) {
        return jsonRes({ error: 'Autocomplete failed' }, corsHeaders, 500);
      }
    }
    if (path === '/directions') {
      const origin = url.searchParams.get('origin');
      const dest = url.searchParams.get('destination');
      if (!origin || !dest) {
        return jsonRes({ error: 'origin and destination required' }, corsHeaders, 400);
      }
      try {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}&key=${GOOGLE_KEY}`
        );
        const data = await res.json();
        return jsonRes(data, corsHeaders);
      } catch (e) {
        return jsonRes({ error: 'Directions failed' }, corsHeaders, 500);
      }
    }
    if (path === '/place-details') {
      const placeId = url.searchParams.get('place_id');
      if (!placeId || placeId.length > 300) {
        return jsonRes({ error: 'Valid place_id required' }, corsHeaders, 400);
      }
      try {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=name,formatted_address,formatted_phone_number,international_phone_number,rating,user_ratings_total,photos,opening_hours&key=${GOOGLE_KEY}&language=ar`
        );
        const data = await res.json();
        if (data.status === 'OK' && data.result) {
          const r = data.result;
          return jsonRes({
            name: r.name,
            address: r.formatted_address,
            phone: r.formatted_phone_number || r.international_phone_number || '',
            rating: r.rating,
            user_ratings_total: r.user_ratings_total,
            photos: (r.photos || []).slice(0, 5).map((p) => ({
              reference: p.photo_reference,
              width: p.width,
              height: p.height,
            })),
            opening_hours: r.opening_hours ? { open_now: r.opening_hours.open_now } : null,
          }, corsHeaders);
        }
        return jsonRes({ error: 'Place not found' }, corsHeaders, 404);
      } catch (e) {
        return jsonRes({ error: 'Request failed' }, corsHeaders, 500);
      }
    }
    if (path === '/place-photo') {
      const ref = url.searchParams.get('ref');
      const maxwidth = url.searchParams.get('maxwidth') || '400';
      if (!ref || ref.length > 500) {
        return jsonRes({ error: 'Valid ref required' }, corsHeaders, 400);
      }
      try {
        const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${encodeURIComponent(maxwidth)}&photo_reference=${encodeURIComponent(ref)}&key=${GOOGLE_KEY}`;
        const response = await fetch(photoUrl);
        const newHeaders = new Headers(response.headers);
        newHeaders.set('Access-Control-Allow-Origin', corsOrigin);
        newHeaders.set('Cache-Control', 'public, max-age=86400');
        newHeaders.set('Vary', 'Origin');
        return new Response(response.body, {
          status: response.status,
          headers: newHeaders,
        });
      } catch (e) {
        return jsonRes({ error: 'Photo fetch failed' }, corsHeaders, 500);
      }
    }
    if (path === '/ai' && request.method === 'POST') {
      const authUser = await verifyFirebaseToken(
        request.headers.get('Authorization'),
        FIREBASE_PROJECT_ID
      );
      if (!authUser) {
        return jsonRes({ error: 'Authentication required' }, corsHeaders, 401);
      }
      try {
        const body = await request.json();

        if (!body.messages || !Array.isArray(body.messages)) {
          return jsonRes({ error: 'Invalid request body' }, corsHeaders, 400);
        }

        const modelKey = body.model;
        const modelCfg = AI_MODELS[modelKey];
        if (!modelCfg) {
          return jsonRes({ error: 'Unknown model' }, corsHeaders, 400);
        }

        const useWebSearch = body.useWebSearch === true;
        let userState;
        try {
          userState = await readUserStateFromFirestore(env, authUser.uid);
        } catch (stateErr) {
          console.error('readUserStateFromFirestore failed, assuming free:', stateErr?.message || stateErr);
          userState = {
            plan: 'free',
            usage: { month: currentMonthKey(), kimiInput: 0, kimiOutput: 0, thinkingInput: 0, thinkingOutput: 0 },
          };
        }

        const plan = userState.plan;
        const tierQuotas = QUOTAS[plan] || QUOTAS.free;

        if (modelCfg.proOnly && plan !== 'pro') {
          return jsonRes(
            { error: 'pro_required', message: 'This model is available on Pro only.' },
            corsHeaders,
            403
          );
        }
        const bucket = modelCfg.bucket;
        const inputKey = bucket + 'Input';
        const outputKey = bucket + 'Output';
        const usedInput = userState.usage[inputKey] || 0;
        const usedOutput = userState.usage[outputKey] || 0;
        const maxInput = tierQuotas[inputKey] || 0;
        const maxOutput = tierQuotas[outputKey] || 0;

        if (usedInput >= maxInput || usedOutput >= maxOutput) {
          return jsonRes(
            {
              error: 'quota_exceeded',
              bucket,
              plan,
              usage: userState.usage,
              limits: tierQuotas,
            },
            corsHeaders,
            429
          );
        }
        const orBody = {
          model: modelCfg.slug,
          messages: body.messages,
          temperature: body.temperature ?? 0.7,
          max_tokens: Math.min(body.max_tokens || 4096, 8192),
        };

        if (modelCfg.supportsThinking) {
          orBody.reasoning = { effort: 'medium' };
        }

        if (useWebSearch) {
          orBody.tools = [
            {
              type: 'openrouter:web_search',
              parameters: { max_results: 3 },
            },
          ];
        }

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENROUTER_KEY}`,
            'HTTP-Referer': 'https://rihlaty.ai',
            'X-Title': 'Rihlaty Tourism App',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(orBody),
        });

        const data = await response.json();

        if (!response.ok) {
          console.error('OpenRouter error:', response.status, JSON.stringify(data).slice(0, 500));
          return jsonRes(
            {
              error: 'ai_upstream_error',
              status: response.status,
              message: data?.error?.message || data?.error || 'AI request failed',
            },
            corsHeaders,
            response.status
          );
        }
        const usage = data.usage || {};
        const promptTokens = Number(usage.prompt_tokens) || 0;
        const completionTokens = Number(usage.completion_tokens) || 0;

        if (promptTokens > 0 || completionTokens > 0) {
          try {
            await incrementMonthlyUsage(env, authUser.uid, bucket, promptTokens, completionTokens);
          } catch (wErr) {
            console.error('Usage write failed:', wErr?.message || wErr);
          }
        }

        return jsonRes(data, corsHeaders);
      } catch (e) {
        console.error('AI handler error:', e?.message || e);
        return jsonRes({ error: 'AI request failed' }, corsHeaders, 500);
      }
    }
    if (path === '/create-checkout' && request.method === 'POST') {
      const authUser = await verifyFirebaseToken(
        request.headers.get('Authorization'),
        FIREBASE_PROJECT_ID
      );
      if (!authUser) {
        return jsonRes({ error: 'Authentication required' }, corsHeaders, 401);
      }
      const PLANS = {
        monthly: { amount: 1800, label: 'Rihlaty Pro - Monthly', days: 30 },
        yearly: { amount: 19900, label: 'Rihlaty Pro - Yearly', days: 365 },
      };
      try {
        const { plan, successUrl, failureUrl } = await request.json();
        if (!plan || !PLANS[plan]) {
          return jsonRes({ error: 'Invalid plan' }, corsHeaders, 400);
        }
        const planInfo = PLANS[plan];
        const allowedSuccessUrls = ['https://rihlaty.ai/subscribe?status=success'];
        const allowedFailureUrls = ['https://rihlaty.ai/subscribe?status=failed'];
        const finalSuccessUrl = allowedSuccessUrls.includes(successUrl) ? successUrl : allowedSuccessUrls[0];
        const finalFailureUrl = allowedFailureUrls.includes(failureUrl) ? failureUrl : allowedFailureUrls[0]; 
        const res = await fetch(`${CHARGILY_API}/checkouts`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${CHARGILY_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: planInfo.amount,
            currency: 'dzd',
            success_url: finalSuccessUrl,
            failure_url: finalFailureUrl,
            description: planInfo.label,
            locale: 'ar',
            metadata: { user_id: authUser.uid, plan, user_email: authUser.email },
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          return jsonRes({ error: 'Failed to create checkout' }, corsHeaders, 500);
        }

        return jsonRes({ checkoutUrl: data.checkout_url, checkoutId: data.id }, corsHeaders);
      } catch (e) {
        return jsonRes({ error: 'Checkout creation failed' }, corsHeaders, 500);
      }
    }

    // ========== CHARGILY - VERIFY PAYMENT (AUTH REQUIRED) ==========
    if (path === '/verify-payment') {
      const authUser = await verifyFirebaseToken(
        request.headers.get('Authorization'),
        FIREBASE_PROJECT_ID
      );
      if (!authUser) {
        return jsonRes({ error: 'Authentication required' }, corsHeaders, 401);
      }

      const checkoutId = url.searchParams.get('checkout_id');
      if (!checkoutId || checkoutId.length > 100) {
        return jsonRes({ error: 'Valid checkout_id required' }, corsHeaders, 400);
      }

      const PLANS = {
        monthly: { days: 30 },
        yearly: { days: 365 },
      };

      try {
        const res = await fetch(`${CHARGILY_API}/checkouts/${encodeURIComponent(checkoutId)}`, {
          headers: { 'Authorization': `Bearer ${CHARGILY_KEY}` },
        });

        const data = await res.json();

        if (!res.ok) {
          return jsonRes({ error: 'Failed to verify payment' }, corsHeaders, 500);
        }

        const metadata = data.metadata || {};

        if (metadata.user_id !== authUser.uid) {
          return jsonRes({ error: 'Unauthorized' }, corsHeaders, 403);
        }

        const plan = metadata.plan || 'monthly';
        const planDays = PLANS[plan]?.days || 30;
        const expiresAt = new Date(Date.now() + planDays * 24 * 60 * 60 * 1000).toISOString();
        if (data.status === 'paid') {
          try {
            await writeSubscriptionToFirestore(env, authUser.uid, {
              plan: 'pro',
              billingPeriod: plan,
              chargilyCheckoutId: data.id,
              startedAt: new Date().toISOString(),
              expiresAt,
              amount: data.amount,
            });
          } catch (werr) {
            console.error('Subscription write failed:', werr?.message || werr);
            return jsonRes(
              { error: 'Payment verified but subscription activation failed. Please contact support.' },
              corsHeaders,
              500
            );
          }
        }
        return jsonRes({
          status: data.status,
          plan: metadata.plan,
          amount: data.amount,
          expiresAt,
          checkoutId: data.id,
        }, corsHeaders);
      } catch (e) {
        return jsonRes({ error: 'Verification failed' }, corsHeaders, 500);
      }
    }

    return jsonRes({ error: 'Not found' }, corsHeaders, 404);
  }
};


// ==================== HELPER FUNCTIONS ====================
function jsonRes(data, corsHeaders, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

function mapCategories(categories) {
  const c = categories.toLowerCase();
  if (c.includes('beach'))
    return { type: 'natural_feature', keyword: 'beach plage شاطئ', filter: 'beach' };
  if (c.includes('natural') || c.includes('national_park') || c.includes('leisure.park'))
    return { type: 'park', keyword: 'nature national park forest حديقة غابة', filter: 'nature' };
  if (c.includes('heritage') || c.includes('tourism.sights') || c.includes('building.historic'))
    return { type: 'tourist_attraction', keyword: 'historical monument museum heritage قصبة أثري', filter: 'historical' };
  if (c.includes('accommodation') || c.includes('hotel'))
    return { type: 'lodging', keyword: 'hotel فندق', filter: 'hotel' };
  if (c.includes('catering') || c.includes('restaurant') || c.includes('fast_food') || c.includes('cafe'))
    return { type: 'restaurant', keyword: 'restaurant مطعم', filter: 'restaurant' };
  if (c.includes('commercial') || c.includes('shopping'))
    return { type: 'shopping_mall', keyword: 'shopping mall market سوق مركز تجاري', filter: 'shopping' };
  if (c.includes('public_transport'))
    return { type: 'transit_station', keyword: 'bus station', filter: null };
  if (c.includes('healthcare') || c.includes('hospital'))
    return { type: 'hospital', keyword: '', filter: null };
  if (c.includes('fuel') || c.includes('service.vehicle'))
    return { type: 'gas_station', keyword: '', filter: null };
  if (c.includes('desert'))
    return { type: 'tourist_attraction', keyword: 'desert صحراء', filter: null };
  return { type: 'point_of_interest', keyword: categories, filter: null };
}

const POST_FILTERS = {
  beach: (p) => {
    const types = p.types || [];
    const name = (p.name || '').toLowerCase();
    const validTypes = ['natural_feature', 'beach'];
    const beachWords = ['beach', 'plage', 'شاطئ', 'شاطيء', 'بحر', 'corniche', 'كورنيش'];
    return types.some(t => validTypes.includes(t)) || beachWords.some(w => name.includes(w));
  },
  nature: (p) => {
    const types = p.types || [];
    const name = (p.name || '').toLowerCase();
    const validTypes = ['park', 'natural_feature', 'campground'];
    const blocked = ['restaurant', 'cafe', 'lodging', 'store', 'shopping_mall', 'hospital', 'pharmacy', 'gas_station'];
    if (types.some(t => blocked.includes(t))) return false;
    const natureWords = ['park', 'parc', 'forest', 'forêt', 'garden', 'jardin', 'حديقة', 'غابة', 'منتزه', 'طبيعة', 'nature', 'national'];
    return types.some(t => validTypes.includes(t)) || natureWords.some(w => name.includes(w));
  },
  historical: (p) => {
    const types = p.types || [];
    const name = (p.name || '').toLowerCase();
    const validTypes = ['museum', 'tourist_attraction', 'church', 'mosque', 'hindu_temple', 'synagogue'];
    const blocked = ['restaurant', 'cafe', 'lodging', 'store', 'shopping_mall', 'hospital', 'pharmacy', 'gas_station', 'park'];
    if (types.some(t => blocked.includes(t)) && !types.includes('tourist_attraction')) return false;
    const histWords = ['museum', 'musée', 'متحف', 'monument', 'castle', 'fort', 'قلعة', 'قصبة', 'أثري', 'historic', 'palace', 'قصر', 'ruins', 'mosque', 'مسجد', 'جامع', 'church', 'basilica', 'roman', 'ottoman'];
    return types.some(t => validTypes.includes(t)) || histWords.some(w => name.includes(w));
  },
  hotel: (p) => {
    const types = p.types || [];
    const validTypes = ['lodging', 'hotel'];
    const blocked = ['restaurant', 'cafe', 'store', 'shopping_mall', 'hospital', 'park'];
    if (types.some(t => blocked.includes(t)) && !types.some(t => validTypes.includes(t))) return false;
    return types.some(t => validTypes.includes(t));
  },
  restaurant: (p) => {
    const types = p.types || [];
    const validTypes = ['restaurant', 'food', 'meal_delivery', 'meal_takeaway', 'bakery', 'cafe'];
    const blocked = ['lodging', 'shopping_mall', 'hospital', 'gas_station'];
    if (types.some(t => blocked.includes(t)) && !types.some(t => validTypes.includes(t))) return false;
    return types.some(t => validTypes.includes(t));
  },
  shopping: (p) => {
    const types = p.types || [];
    const validTypes = ['shopping_mall', 'store', 'clothing_store', 'department_store', 'supermarket', 'home_goods_store', 'electronics_store', 'shoe_store', 'book_store', 'jewelry_store'];
    const blocked = ['restaurant', 'cafe', 'lodging', 'hospital', 'park'];
    if (types.some(t => blocked.includes(t)) && !types.some(t => validTypes.includes(t))) return false;
    return types.some(t => validTypes.includes(t));
  },
};

function extractCity(vicinity) {
  if (!vicinity) return '';
  const parts = vicinity.split(',');
  return parts.length > 1 ? parts[parts.length - 1].trim() : vicinity.trim();
}

let _googleAccessTokenCache = null;

function b64urlEncode(input) {
  let bytes;
  if (typeof input === 'string') {
    bytes = new TextEncoder().encode(input);
  } else {
    bytes = input;
  }
  let str = '';
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function importServiceAccountKey(pem) {
  const cleaned = pem
    .replace(/\\n/g, '\n')
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  const binary = Uint8Array.from(atob(cleaned), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    'pkcs8',
    binary,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

async function getGoogleAccessToken(env) {
  const now = Date.now();
  if (_googleAccessTokenCache && _googleAccessTokenCache.expiresAt > now + 60_000) {
    return _googleAccessTokenCache.token;
  }

  const clientEmail = env.FIREBASE_CLIENT_EMAIL;
  const privateKeyPem = env.FIREBASE_PRIVATE_KEY;
  if (!clientEmail || !privateKeyPem) {
    throw new Error('Firebase service account not configured (FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY)');
  }

  const iat = Math.floor(now / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat,
    exp: iat + 3600,
  };

  const signingInput = `${b64urlEncode(JSON.stringify(header))}.${b64urlEncode(JSON.stringify(payload))}`;
  const key = await importServiceAccountKey(privateKeyPem);
  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(signingInput)
  );
  const jwt = `${signingInput}.${b64urlEncode(new Uint8Array(sig))}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${jwt}`,
  });

  if (!tokenRes.ok) {
    const txt = await tokenRes.text();
    throw new Error(`Token exchange failed (${tokenRes.status}): ${txt.slice(0, 200)}`);
  }

  const tokenData = await tokenRes.json();
  _googleAccessTokenCache = {
    token: tokenData.access_token,
    expiresAt: now + (tokenData.expires_in || 3600) * 1000,
  };
  return tokenData.access_token;
}
function toFirestoreValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') {
    return Number.isInteger(v)
      ? { integerValue: v.toString() }
      : { doubleValue: v };
  }
  if (typeof v === 'object') {
    const fields = {};
    for (const k of Object.keys(v)) fields[k] = toFirestoreValue(v[k]);
    return { mapValue: { fields } };
  }
  return { stringValue: String(v) };
}

async function writeSubscriptionToFirestore(env, uid, subscription) {
  const projectId = env.FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error('FIREBASE_PROJECT_ID missing');

  const accessToken = await getGoogleAccessToken(env);
  const url =
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}` +
    `/databases/(default)/documents/users/${encodeURIComponent(uid)}` +
    `?updateMask.fieldPaths=subscription&currentDocument.exists=true`;

  const body = {
    fields: {
      subscription: toFirestoreValue(subscription),
    },
  };

  let res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (res.status === 404) {
    const createUrl =
      `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}` +
      `/databases/(default)/documents/users/${encodeURIComponent(uid)}` +
      `?updateMask.fieldPaths=subscription`;
    res = await fetch(createUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  }

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Firestore write failed (${res.status}): ${txt.slice(0, 200)}`);
  }
}
function currentMonthKey() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}
function fromFirestoreValue(v) {
  if (!v || typeof v !== 'object') return undefined;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('mapValue' in v) {
    const out = {};
    const fields = v.mapValue?.fields || {};
    for (const k of Object.keys(fields)) out[k] = fromFirestoreValue(fields[k]);
    return out;
  }
  return undefined;
}
async function readUserStateFromFirestore(env, uid) {
  const projectId = env.FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error('FIREBASE_PROJECT_ID missing');
  const accessToken = await getGoogleAccessToken(env);

  const month = currentMonthKey();
  const userUrl =
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}` +
    `/databases/(default)/documents/users/${encodeURIComponent(uid)}`;
  const usageUrl =
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}` +
    `/databases/(default)/documents/users/${encodeURIComponent(uid)}/usage/${encodeURIComponent(month)}`;

  const [userRes, usageRes] = await Promise.all([
    fetch(userUrl, { headers: { Authorization: `Bearer ${accessToken}` } }),
    fetch(usageUrl, { headers: { Authorization: `Bearer ${accessToken}` } }),
  ]);

  let plan = 'free';
  if (userRes.ok) {
    const data = await userRes.json();
    const sub = fromFirestoreValue(data.fields?.subscription);
    if (sub && sub.plan === 'pro') {
      const expiresAt = sub.expiresAt ? Date.parse(sub.expiresAt) : NaN;
      if (!Number.isFinite(expiresAt) || expiresAt > Date.now()) {
        plan = 'pro';
      }
    }
  }
  let usage = {
    month,
    kimiInput: 0,
    kimiOutput: 0,
    thinkingInput: 0,
    thinkingOutput: 0,
  };
  if (usageRes.ok) {
    const data = await usageRes.json();
    const parsed = {};
    for (const k of Object.keys(data.fields || {})) {
      parsed[k] = fromFirestoreValue(data.fields[k]);
    }
    if (parsed.month === month) {
      usage = {
        month,
        kimiInput: Number(parsed.kimiInput) || 0,
        kimiOutput: Number(parsed.kimiOutput) || 0,
        thinkingInput: Number(parsed.thinkingInput) || 0,
        thinkingOutput: Number(parsed.thinkingOutput) || 0,
      };
    }
  }
  return { plan, usage };
}
async function incrementMonthlyUsage(env, uid, bucket, inputTokens, outputTokens) {
  const projectId = env.FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error('FIREBASE_PROJECT_ID missing');
  const accessToken = await getGoogleAccessToken(env);
  const month = currentMonthKey();
  const docPath =
    `projects/${projectId}/databases/(default)/documents/users/${uid}/usage/${month}`;
  const inputField = bucket + 'Input';
  const outputField = bucket + 'Output';
  const commitBody = {
    writes: [
      {
        transform: {
          document: docPath,
          fieldTransforms: [
            { fieldPath: inputField, increment: { integerValue: String(inputTokens) } },
            { fieldPath: outputField, increment: { integerValue: String(outputTokens) } },
          ],
        },
      },
      {
        update: {
          name: docPath,
          fields: { month: { stringValue: month } },
        },
        updateMask: { fieldPaths: ['month'] },
      },
    ],
  };

  const commitUrl =
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}` +
    `/databases/(default)/documents:commit`;

  const res = await fetch(commitUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commitBody),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Usage commit failed (${res.status}): ${txt.slice(0, 200)}`);
  }
}
