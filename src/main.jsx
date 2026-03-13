import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { KLRGameProvider } from './features/klr'
import { ProjectMGameProvider } from './features/projectM'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <KLRGameProvider>
      <ProjectMGameProvider>
        <App />
      </ProjectMGameProvider>
    </KLRGameProvider>
  </StrictMode>,
)
