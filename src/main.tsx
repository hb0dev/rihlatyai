import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { LocationProvider } from './context/LocationContext'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import { SubscriptionProvider } from './context/SubscriptionContext'
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <SubscriptionProvider>
        <ThemeProvider>
          <LocationProvider>
            <App />
          </LocationProvider>
        </ThemeProvider>
      </SubscriptionProvider>
    </AuthProvider>
  </React.StrictMode>,
)
