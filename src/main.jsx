import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { appliquerTheme, lireTheme } from './lib/theme'

// Complète le script d'index.html (couleur de la barre d'état)
appliquerTheme(lireTheme())

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
