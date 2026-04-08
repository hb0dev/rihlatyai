import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { LocationProvider } from './context/LocationContext'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <ThemeProvider>
        <LocationProvider>
          <App />
        </LocationProvider>
      </ThemeProvider>
    </AuthProvider>
  </React.StrictMode>,
)
