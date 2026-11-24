import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { SiteConfigProvider } from './context/SiteConfigContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { AppRoutes } from './routes/AppRoutes';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <SiteConfigProvider>
          <AuthProvider>
            <ToastProvider>
              <AppRoutes />
            </ToastProvider>
          </AuthProvider>
        </SiteConfigProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default App;
