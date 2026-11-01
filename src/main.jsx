import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { AppProvider } from './context/AppContext';
import App from './App';
import './index.css';

// One-time cleanup of obsolete mock localStorage keys from prior versions
try {
  localStorage.removeItem('civicfix_users_v1');
  localStorage.removeItem('civicfix_audit_v1');
  localStorage.removeItem('civicfix_complaints_v2');
} catch (e) {
  // Ignore storage access errors in restricted contexts
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <AppProvider>
          <App />
        </AppProvider>
      </LanguageProvider>
    </BrowserRouter>
  </React.StrictMode>
);
