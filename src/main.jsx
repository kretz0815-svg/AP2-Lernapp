import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { KLRGameProvider } from './features/klr'

import { AppProvider } from './contexts/AppContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AppProvider>
        <KLRGameProvider>
          <App />
        </KLRGameProvider>
      </AppProvider>
    </BrowserRouter>
  </StrictMode>,
)
