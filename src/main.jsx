import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { KLRGameProvider } from './features/klr'
import { ProjectMProvider } from './features/project-m'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <KLRGameProvider>
      <ProjectMProvider>
        <App />
      </ProjectMProvider>
    </KLRGameProvider>
  </StrictMode>,
)
