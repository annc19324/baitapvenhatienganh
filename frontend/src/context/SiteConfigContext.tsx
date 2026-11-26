import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiGet, apiPut } from '../services/apiClient';

const SYNC_TS_KEY = 'engwork_sync_ts';

export type LogoMode = 'icon' | 'image' | 'none';
export type BackgroundMode = 'default' | 'solid' | 'gradient' | 'image';

export interface SiteConfig {
  brandName: string;
  brandSubtitle: string;
  logoMode: LogoMode;
  logoImageUrl: string;
  heroBadge: string;
  heroTitle: string;
  heroHighlight: string;
  heroDescription: string;
  primaryColor: string;
  secondaryColor: string;
  heroFrom: string;
  heroVia: string;
  heroTo: string;
  heroPattern: boolean;
  backgroundMode: BackgroundMode;
  backgroundColorLight: string;
  backgroundColorDark: string;
  backgroundGradient: string;
  backgroundImageUrl: string;
  backgroundOverlayOpacity: number; // 0 to 0.85
}

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  brandName: 'EngWork A–Z',
  brandSubtitle: 'Mầm non → Đại học',
  logoMode: 'icon',
  logoImageUrl: '',
  heroBadge: 'Lộ trình Tiếng Anh A–Z • Mầm non đến Đại học',
  heroTitle: 'Học Lý Thuyết Ngắn Gọn &',
  heroHighlight: 'Luyện Bài Tập Ngay',
  heroDescription:
    'Đầy đủ kiến thức trọng tâm kèm ví dụ dễ hiểu và bài tập thực hành từ cơ bản đến nâng cao. Chỉ cần nhập tên 1 lần để bắt đầu.',
  primaryColor: '#2563eb',
  secondaryColor: '#14b8a6',
  heroFrom: '#0f172a',
  heroVia: '#0f2557',
  heroTo: '#0f172a',
  heroPattern: true,
  backgroundMode: 'default',
  backgroundColorLight: '#F6F8FB',
  backgroundColorDark: '#0B1120',
  backgroundGradient: 'linear-gradient(135deg, #eff6ff 0%, #f0fdfa 50%, #f8fafc 100%)',
  backgroundImageUrl: '',
  backgroundOverlayOpacity: 0.45,
};

export const COLOR_PRESETS = [
  { name: 'Xanh Đại Dương', primary: '#2563eb', secondary: '#14b8a6', heroFrom: '#0f172a', heroVia: '#0f2557', heroTo: '#0f172a' },
  { name: 'Ngọc Lục Bảo', primary: '#059669', secondary: '#06b6d4', heroFrom: '#022c22', heroVia: '#065f46', heroTo: '#0f172a' },
  { name: 'Tím Học Thuật', primary: '#7c3aed', secondary: '#ec4899', heroFrom: '#1e1b4b', heroVia: '#4c1d95', heroTo: '#0f172a' },
  { name: 'Đỏ San Hô', primary: '#e11d48', secondary: '#f59e0b', heroFrom: '#1f1020', heroVia: '#881337', heroTo: '#0f172a' },
  { name: 'Cam Năng Động', primary: '#ea580c', secondary: '#eab308', heroFrom: '#1c1917', heroVia: '#7c2d12', heroTo: '#0f172a' },
  { name: 'Xám Tối Giản', primary: '#334155', secondary: '#0ea5e9', heroFrom: '#0f172a', heroVia: '#1e293b', heroTo: '#020617' },
];

export const GRADIENT_PRESETS = [
  { name: 'Xanh Băng Dịu', value: 'linear-gradient(135deg, #eff6ff 0%, #f0fdfa 50%, #f8fafc 100%)' },
  { name: 'Hoàng Hôn Ấm', value: 'linear-gradient(135deg, #fff7ed 0%, #fdf2f8 50%, #fefce8 100%)' },
  { name: 'Oải Hương Nhẹ', value: 'linear-gradient(135deg, #f5f3ff 0%, #eff6ff 55%, #ecfeff 100%)' },
  { name: 'Bạc Hà Tươi', value: 'linear-gradient(135deg, #ecfdf5 0%, #f0f9ff 50%, #f8fafc 100%)' },
  { name: 'Đêm Sao (Tối)', value: 'linear-gradient(135deg, #0b1120 0%, #172554 50%, #0f172a 100%)' },
];

const SITE_CONFIG_KEY = 'engwork_site_config_v1';

interface SiteConfigContextValue {
  config: SiteConfig;
  updateConfig: (partial: Partial<SiteConfig>) => void;
  resetConfig: () => void;
}

const SiteConfigContext = createContext<SiteConfigContextValue | undefined>(undefined);

function applyCssVars(cfg: SiteConfig) {
  const root = document.documentElement;
  root.style.setProperty('--brand-primary', cfg.primaryColor);
  root.style.setProperty('--brand-secondary', cfg.secondaryColor);
  root.style.setProperty('--hero-from', cfg.heroFrom);
  root.style.setProperty('--hero-via', cfg.heroVia);
  root.style.setProperty('--hero-to', cfg.heroTo);
}

export const SiteConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<SiteConfig>(() => {
    try {
      const saved = localStorage.getItem(SITE_CONFIG_KEY);
      if (saved) {
        return { ...DEFAULT_SITE_CONFIG, ...JSON.parse(saved) };
      }
    } catch {
      // ignore
    }
    return DEFAULT_SITE_CONFIG;
  });

  // On mount: pull config from backend (remote wins)
  useEffect(() => {
    apiGet<Partial<SiteConfig>>('/api/engwork/site-config').then((remote) => {
      if (remote && Object.keys(remote).length > 0) {
        setConfig((prev) => {
          const merged = { ...prev, ...remote };
          try { localStorage.setItem(SITE_CONFIG_KEY, JSON.stringify(merged)); } catch { /* ignore */ }
          return merged;
        });
      }
    }).catch(() => { /* offline */ });
  }, []);

  useEffect(() => {
    applyCssVars(config);
    document.title = `${config.brandName} — ${config.brandSubtitle}`;
    try {
      localStorage.setItem(SITE_CONFIG_KEY, JSON.stringify(config));
    } catch {
      // ignore quota errors
    }
  }, [config]);

  const updateConfig = (partial: Partial<SiteConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...partial };
      // Push to backend and invalidate sync cache so other devices re-fetch
      apiPut('/api/engwork/site-config', next, true).catch(() => {});
      localStorage.removeItem(SYNC_TS_KEY);
      return next;
    });
  };

  const resetConfig = () => {
    setConfig(DEFAULT_SITE_CONFIG);
  };

  return (
    <SiteConfigContext.Provider value={{ config, updateConfig, resetConfig }}>
      {children}
    </SiteConfigContext.Provider>
  );
};

export const useSiteConfig = () => {
  const ctx = useContext(SiteConfigContext);
  if (!ctx) throw new Error('useSiteConfig must be used within SiteConfigProvider');
  return ctx;
};
