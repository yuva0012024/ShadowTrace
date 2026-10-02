import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// Core Stylesheet cascade
import './styles/theme.css';
import './styles/global.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/cinematic-auth.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
