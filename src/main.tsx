import React from 'react'
import ReactDOM from 'react-dom/client'
import RealtimeApp from './RealtimeApp.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RealtimeApp />
  </React.StrictMode>,
)