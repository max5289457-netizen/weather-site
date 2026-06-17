import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import CityPage from './CityPage.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename="/weather-site">
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/city/:slug" element={<CityPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
