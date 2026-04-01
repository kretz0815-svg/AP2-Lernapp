import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { polyfill } from "mobile-drag-drop"
import { scrollBehaviourDragImageTranslateOverride } from "mobile-drag-drop/scroll-behaviour"
import "mobile-drag-drop/default.css"
import './index.css'
import App from './App.jsx'
import AppErrorBoundary from './components/AppErrorBoundary'
import { KLRGameProvider } from './features/klr'
import { ProjectMProvider } from './features/project-m'
import { JourneyArchitectProvider } from './features/journey-architect'

// Enable drag and drop for touch devices globally
polyfill({
    dragImageTranslateOverride: scrollBehaviourDragImageTranslateOverride
});

// Polyfill fix for iOS scrolling conflicts during drag
window.addEventListener('touchmove', function() {}, { passive: false });

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <KLRGameProvider>
      <ProjectMProvider>
        <JourneyArchitectProvider>
          <AppErrorBoundary>
            <App />
          </AppErrorBoundary>
        </JourneyArchitectProvider>
      </ProjectMProvider>
    </KLRGameProvider>
  </StrictMode>,
)
