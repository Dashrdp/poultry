import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './auth.tsx'
import { ThemeProvider } from './theme.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <div className="isolate min-h-screen bg-kumo-canvas text-kumo-contrast">
          <App />
        </div>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
)
