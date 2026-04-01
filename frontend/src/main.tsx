import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'
import App from './App.tsx'

const scanClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={scanClient}>
      <HelmetProvider>
        <div className="cyber-grid text-slate-200">
            <App />
        </div>
      </HelmetProvider>
    </QueryClientProvider>
  </StrictMode>,
)
