export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-KEY',
    };
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const GOOGLE_KEY = env.GOOGLE_MAPS_API_KEY;
    const OPENROUTER_KEY = env.OPENROUTER_API_KEY;
    const GEMINI_KEY = env.GEMINI_API_KEY;
    const CHARGILY_KEY = env.CHARGILY_SECRET_KEY;
    const CHARGILY_API = 'https://pay.chargily.com/test/api/v2';

    // ========== GEOCODE ==========
    if (path === '/geocode') {
      const lat = url.searchParams.get('lat');
      const lon = url.searchParams.get('lon');
      if (!lat || !lon) {
        return jsonRes({ error: 'lat and lon required' }, corsHeaders, 400);
      }
      try {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${GOOGLE_KEY}&language=ar`
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

    // ========== PLACES ==========
    if (path === '/places') {
      const categories = url.searchParams.get('categories') || '';
      const filter = url.searchParams.get('filter') || '';
      const limit = parseInt(url.searchParams.get('limit') || '20');

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

    // ========== AUTOCOMPLETE ==========
    if (path === '/autocomplete') {
      const text = url.searchParams.get('text');
      const limit = parseInt(url.searchParams.get('limit') || '5');
      if (!text) {
        return jsonRes({ error: 'text required' }, corsHeaders, 400);
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

    // ========== DIRECTIONS ==========
    if (path === '/directions') {
      const origin = url.searchParams.get('origin');
      const dest = url.searchParams.get('destination');
      if (!origin || !dest) {
        return jsonRes({ error: 'origin and destination required' }, corsHeaders, 400);
      }
      try {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${dest}&key=${GOOGLE_KEY}`
        );
        const data = await res.json();
        return jsonRes(data, corsHeaders);
      } catch (e) {
        return jsonRes({ error: 'Directions failed' }, corsHeaders, 500);
      }
    }

    // ========== PLACE DETAILS ==========
    if (path === '/place-details') {
      const placeId = url.searchParams.get('place_id');
      if (!placeId) {
        return jsonRes({ error: 'place_id required' }, corsHeaders, 400);
      }
      try {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,formatted_phone_number,international_phone_number,rating,user_ratings_total,photos,opening_hours&key=${GOOGLE_KEY}&language=ar`
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
        return jsonRes({ error: e.message }, corsHeaders, 500);
      }
    }

    // ========== PLACE PHOTO PROXY ==========
    if (path === '/place-photo') {
      const ref = url.searchParams.get('ref');
      const maxwidth = url.searchParams.get('maxwidth') || '400';
      if (!ref) {
        return jsonRes({ error: 'ref required' }, corsHeaders, 400);
      }
      try {
        const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxwidth}&photo_reference=${ref}&key=${GOOGLE_KEY}`;
        const response = await fetch(photoUrl);
        const newHeaders = new Headers(response.headers);
        newHeaders.set('Access-Control-Allow-Origin', '*');
        newHeaders.set('Cache-Control', 'public, max-age=86400');
        return new Response(response.body, {
          status: response.status,
          headers: newHeaders,
        });
      } catch (e) {
        return jsonRes({ error: e.message }, corsHeaders, 500);
      }
    }

    // ========== CONFIG ==========
    if (path === '/config') {
      return jsonRes({ googleMapsKey: GOOGLE_KEY }, corsHeaders);
    }

    // ========== AI - OpenRouter ==========
    if (path === '/ai' && request.method === 'POST') {
      try {
        const body = await request.json();
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENROUTER_KEY}`,
            'HTTP-Referer': 'https://rihlaty.app',
            'X-Title': 'Rihlaty Tourism App',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });
        const data = await response.json();
        return jsonRes(data, corsHeaders);
      } catch (e) {
        return jsonRes({ error: 'AI request failed' }, corsHeaders, 500);
      }
    }

    // ========== GEMINI ==========
    if (path === '/gemini' && request.method === 'POST') {
      try {
        const body = await request.json();
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }
        );
        const data = await response.json();
        return jsonRes(data, corsHeaders);
      } catch (e) {
        return jsonRes({ error: 'Gemini request failed' }, corsHeaders, 500);
      }
    }

    // ========== CHARGILY - CREATE CHECKOUT ==========
    if (path === '/create-checkout' && request.method === 'POST') {
      const PLANS = {
        monthly: { amount: 550, label: 'Rihlaty Pro - Monthly', days: 30 },
        yearly: { amount: 5500, label: 'Rihlaty Pro - Yearly', days: 365 },
      };

      try {
        const { plan, userId, userEmail, successUrl, failureUrl } = await request.json();

        if (!plan || !PLANS[plan] || !userId) {
          return jsonRes({ error: 'Invalid plan or userId' }, corsHeaders, 400);
        }

        const planInfo = PLANS[plan];

        const res = await fetch(`${CHARGILY_API}/checkouts`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${CHARGILY_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: planInfo.amount,
            currency: 'dzd',
            success_url: successUrl || 'https://rihlaty.ai/subscribe?status=success',
            failure_url: failureUrl || 'https://rihlaty.ai/subscribe?status=failed',
            description: planInfo.label,
            locale: 'ar',
            metadata: { user_id: userId, plan, user_email: userEmail || '' },
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          return jsonRes({ error: 'Failed to create checkout', details: data }, corsHeaders, 500);
        }

        return jsonRes({ checkoutUrl: data.checkout_url, checkoutId: data.id }, corsHeaders);
      } catch (e) {
        return jsonRes({ error: e.message }, corsHeaders, 500);
      }
    }

    // ========== CHARGILY - VERIFY PAYMENT ==========
    if (path === '/verify-payment') {
      const checkoutId = url.searchParams.get('checkout_id');

      if (!checkoutId) {
        return jsonRes({ error: 'Missing checkout_id' }, corsHeaders, 400);
      }

      const PLANS = {
        monthly: { days: 30 },
        yearly: { days: 365 },
      };

      try {
        const res = await fetch(`${CHARGILY_API}/checkouts/${checkoutId}`, {
          headers: { 'Authorization': `Bearer ${CHARGILY_KEY}` },
        });

        const data = await res.json();

        if (!res.ok) {
          return jsonRes({ error: 'Failed to verify payment' }, corsHeaders, 500);
        }

        const metadata = data.metadata || {};
        const plan = metadata.plan || 'monthly';
        const planDays = PLANS[plan]?.days || 30;
        const expiresAt = new Date(Date.now() + planDays * 24 * 60 * 60 * 1000).toISOString();

        return jsonRes({
          status: data.status,
          plan: metadata.plan,
          userId: metadata.user_id,
          amount: data.amount,
          expiresAt,
          checkoutId: data.id,
        }, corsHeaders);
      } catch (e) {
        return jsonRes({ error: e.message }, corsHeaders, 500);
      }
    }

    return jsonRes({
      error: 'Invalid endpoint',
      endpoints: ['/geocode', '/places', '/autocomplete', '/directions', '/place-details', '/place-photo', '/ai', '/gemini', '/config', '/create-checkout', '/verify-payment']
    }, corsHeaders, 404);
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