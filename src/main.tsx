import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

declare global {
  interface Window {
    __SN_BASE__?: string
  }
}

// يدعم النشر تحت مسار فرعي (مثل S3) — يُحسب في index.html
const basename = window.__SN_BASE__ && window.__SN_BASE__ !== '/' ? window.__SN_BASE__.replace(/\/$/, '') : '/'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
