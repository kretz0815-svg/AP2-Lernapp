import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { KLRGameProvider } from './features/klr'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <KLRGameProvider>
        <App />
      </KLRGameProvider>
    </BrowserRouter>
  </StrictMode>,
)
