import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { SiteConfigProvider } from './context/SiteConfigContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { AppRoutes } from './routes/AppRoutes';
import { HomeworkStorageService } from './services/homeworkStorage';

export const App: React.FC = () => {
  useEffect(() => {
    HomeworkStorageService.initializeAsync();

    const syncNow = () => {
      HomeworkStorageService.syncFromBackend(false).catch(() => {});
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') syncNow();
    };

    window.addEventListener('focus', syncNow);
    document.addEventListener('visibilitychange', onVisibility);
    const timer = window.setInterval(syncNow, 10000);

    return () => {
      window.removeEventListener('focus', syncNow);
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(timer);
    };
  }, []);

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
