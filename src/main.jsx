import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { KLRGameProvider } from './features/klr'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <KLRGameProvider>
      <App />
    </KLRGameProvider>
  </StrictMode>,
)
