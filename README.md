<p align="center">
  <img src="src/logo/rihlaty logo.png" alt="Rihlaty" width="120" />
</p>

<h1 align="center">Rihlaty - رحلتي</h1>

<p align="center">
  <strong>Your Smart Tourism Companion for Algeria</strong><br>
  مساعدك السياحي الذكي في الجزائر
</p>

<p align="center">
  <a href="https://rihlaty.ai">🌐 Website</a>
</p>

---

## About

Rihlaty is a tourism app for Algeria that helps users discover beaches, nature spots, historical sites, hotels, restaurants, and shopping destinations. It features an AI-powered assistant (Gemini) that provides personalized recommendations based on the user's location.

### Key Features

- **AI Tourism Assistant** — Chat with Gemini AI to get personalized place recommendations near you
- **Place Discovery** — Browse beaches, nature, historical sites, hotels, restaurants & shopping
- **Interactive Maps** — View places on an interactive map with directions
- **Place Details** — Photos, ratings, reviews, and opening hours for each place
- **Multi-language** — Arabic, French, and English
- **Pro Subscription** — Unlock 60 daily AI messages and full place photos via Chargily Pay
- **Cross-platform** — Web (PWA) + Android (Capacitor)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS |
| Animations | Motion (Framer Motion) |
| Maps | Leaflet + Google Maps APIs |
| AI | Google Gemini (via OpenRouter & Gemini API) |
| Auth | Firebase Authentication (Google Sign-In) |
| Database | Cloud Firestore |
| Payments | Chargily Pay V2 |
| API Gateway | Cloudflare Workers |
| Web Hosting | Vercel |
| Mobile | Capacitor (Android) |

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Android Studio (for mobile builds)

### Installation

```bash
git clone https://github.com/hb0dev/rihlatyai.git
cd rihlatyai
npm install
```

### Environment Variables

Copy the example env file and fill in your keys:

```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `VITE_FIREBASE_API_KEY` | Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps API key |
| `VITE_WORKER_URL` | Cloudflare Worker API URL |

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Android

```bash
npm run android
```

## Cloudflare Worker

The `worker.js` file contains the API gateway that proxies requests to:

- Google Maps Platform APIs (Geocode, Places, Directions, Photos)
- OpenRouter API (Gemini 2.0 Flash)
- Google Generative Language API (Gemini 3 Flash)
- Chargily Pay V2 (Checkout & Payment Verification)

### Worker Environment Variables

Set these in your Cloudflare Workers dashboard:

| Variable | Description |
|----------|-------------|
| `GOOGLE_MAPS_API_KEY` | Google Maps API key |
| `OPENROUTER_API_KEY` | OpenRouter API key |
| `GEMINI_API_KEY` | Google Gemini API key |
| `CHARGILY_SECRET_KEY` | Chargily Pay secret key |

## Project Structure

```
src/
├── components/       # React components (pages & UI)
├── config/           # Firebase & API configuration
├── context/          # React contexts (Auth, Subscription, Location, Theme, Notification)
├── services/         # AI service & business logic
├── logo/             # App logos & assets
└── main.tsx          # App entry point

android/              # Capacitor Android project
worker.js             # Cloudflare Worker (API gateway)
```

## License

All rights reserved.

---

<p align="center">Made with ❤️ in Algeria 🇩🇿</p>
