import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Plus,
  Sun,
  Moon,
  KeyRound,
  ArrowRight,
  X,
  GraduationCap,
  ShieldCheck,
  User,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useSiteConfig } from '../context/SiteConfigContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { HomeworkStorageService } from '../services/homeworkStorage';
import { AdminLoginModal } from './AdminLoginModal';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { config } = useSiteConfig();
  const { isAdmin, adminUsername, studentName } = useAuth();
  const { showToast } = useToast();

  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);
  const [quickPin, setQuickPin] = useState('');

  const isDoPage = location.pathname.startsWith('/homework/do');
  const isHome = location.pathname === '/homework' || location.pathname === '/';
  const isCreate =
    location.pathname.startsWith('/homework/create') ||
    location.pathname.startsWith('/homework/edit');
  const isAdminPage = location.pathname.startsWith('/admin');

  const handleQuickJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = quickPin.trim().toUpperCase();
    if (!cleaned) {
      showToast({ message: 'Vui lòng nhập mã bài tập', type: 'error' });
      return;
    }
    let found = HomeworkStorageService.getAssignment(cleaned);
    if (!found) {
      await HomeworkStorageService.syncFromBackend(true);
      found = HomeworkStorageService.getAssignment(cleaned);
    }
    if (!found) {
      showToast({
        message: 'Không tìm thấy bài tập',
        subMessage: `Mã "${cleaned}" không tồn tại.`,
        type: 'error',
      });
      return;
    }
    setPinModalOpen(false);
    setQuickPin('');
    navigate(`/homework/do/${found.code}`);
  };

  // Compute dynamic page background style from Admin SiteConfig
  const getBackgroundStyle = (): React.CSSProperties => {
    if (config.backgroundMode === 'solid') {
      return {
        backgroundColor: theme === 'dark' ? config.backgroundColorDark : config.backgroundColorLight,
      };
    }
    if (config.backgroundMode === 'gradient') {
      return {
        backgroundImage: config.backgroundGradient,
        backgroundAttachment: 'fixed',
      };
    }
    if (config.backgroundMode === 'image' && config.backgroundImageUrl) {
      return {
        backgroundImage: `url("${config.backgroundImageUrl}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      };
    }
    return {};
  };

  const hasBgImage = config.backgroundMode === 'image' && Boolean(config.backgroundImageUrl);

  return (
    <div
      style={getBackgroundStyle()}
      className="min-h-screen flex flex-col bg-[#F6F8FB] dark:bg-[#0B1120] relative transition-colors duration-300"
    >
      {/* Background Image Readability Overlay */}
      {hasBgImage && (
        <div
          className="fixed inset-0 pointer-events-none z-0 transition-opacity"
          style={{
            backgroundColor:
              theme === 'dark'
                ? `rgba(11, 17, 32, ${Math.min(0.9, config.backgroundOverlayOpacity + 0.2)})`
                : `rgba(248, 250, 252, ${config.backgroundOverlayOpacity})`,
          }}
        />
      )}

      {/* ================= ADAPTIVE TOP BAR ================= */}
      <header className="sticky top-0 z-40 h-12 sm:h-16 glass-bar border-b pt-safe">
        <div className="max-w-6xl mx-auto h-full px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-3">
          {/* Dynamic Brand & Logo */}
          <button
            type="button"
            onClick={() => navigate('/homework')}
            className="flex items-center gap-2.5 group shrink-0 min-w-0"
          >
            {config.logoMode === 'image' && config.logoImageUrl ? (
              <img
                src={config.logoImageUrl}
                alt={config.brandName}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shadow-sm shrink-0"
              />
            ) : config.logoMode === 'icon' ? (
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-brand-gradient text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition shrink-0">
                <GraduationCap className="w-5 h-5" />
              </div>
            ) : null}

            <div className="text-left min-w-0">
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-slate-900 dark:text-white block leading-none truncate">
                {config.brandName || 'Zeanokai'}
              </span>
              {(isDoPage || config.brandSubtitle) && (
                <span className="text-[10px] font-semibold text-slate-400 block truncate mt-0.5">
                  {isDoPage ? 'Chế độ làm bài' : config.brandSubtitle}
                </span>
              )}
            </div>
          </button>

          {/* Right Controls */}
          {!isDoPage ? (
            <div className="flex items-center gap-2">
              <nav className="hidden sm:flex items-center gap-1 mr-1">
                <button
                  type="button"
                  onClick={() => navigate('/homework')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                    isHome
                      ? 'bg-slate-900/10 dark:bg-white/10 text-slate-900 dark:text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Bài tập</span>
                </button>

                {isAdmin && (
                  <>
                    <button
                      type="button"
                      onClick={() => navigate('/homework/create')}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                        isCreate
                          ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                          : 'btn-brand shadow-sm'
                      }`}
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                      <span>Tạo bài</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate('/admin')}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                        isAdminPage
                          ? 'bg-teal-600 text-white shadow-sm'
                          : 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/60'
                      }`}
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Quản trị ({adminUsername})</span>
                    </button>
                  </>
                )}
              </nav>

              {!isAdmin && studentName && (
                <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200">
                  <User className="w-3.5 h-3.5 text-brand" />
                  <span className="max-w-[140px] truncate">{studentName}</span>
                </span>
              )}

              {!isAdmin && (
                <button
                  type="button"
                  onClick={() => setAdminLoginOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100/90 dark:bg-slate-800/90 hover:bg-slate-200/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-brand" />
                  <span>Admin</span>
                </button>
              )}

              <button
                type="button"
                onClick={toggleTheme}
                aria-label="Đổi giao diện Sáng/Tối"
                className="p-2 rounded-xl text-slate-600 dark:text-slate-300 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200/70 dark:hover:bg-slate-700 transition"
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                aria-label="Đổi giao diện Sáng/Tối"
                className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate('/homework')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                Thoát
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ================= MAIN CONTENT ================= */}
      <main className="flex-1 w-full relative z-10">
        <div
          className={`max-w-6xl mx-auto px-3 sm:px-6 py-3.5 sm:py-8 ${
            !isDoPage ? 'pb-20 sm:pb-12' : 'pb-20 lg:pb-12'
          }`}
        >
          {children}
        </div>
      </main>

      {/* ================= MOBILE BOTTOM BAR (< sm) ================= */}
      {!isDoPage && (
        <nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 glass-bar border-t pb-safe">
          <div className="grid grid-cols-3 h-14 px-2">
            <button
              type="button"
              onClick={() => navigate('/homework')}
              className={`flex flex-col items-center justify-center gap-0.5 transition ${
                isHome ? 'text-brand' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <BookOpen className="w-[18px] h-[18px]" />
              <span className="text-[10px] font-bold">Bài tập</span>
            </button>

            {isAdmin ? (
              <>
                <button
                  type="button"
                  onClick={() => navigate('/homework/create')}
                  className="flex flex-col items-center justify-center gap-0.5"
                >
                  <span
                    className={`w-9 h-7 rounded-lg flex items-center justify-center shadow-sm ${
                      isCreate
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                        : 'btn-brand'
                    }`}
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                  </span>
                  <span className="text-[10px] font-bold text-brand">Tạo bài</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/admin')}
                  className={`flex flex-col items-center justify-center gap-0.5 transition ${
                    isAdminPage ? 'text-teal-600 dark:text-teal-400' : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <ShieldCheck className="w-[18px] h-[18px]" />
                  <span className="text-[10px] font-bold">Quản trị</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setPinModalOpen(true)}
                  className="flex flex-col items-center justify-center gap-0.5"
                >
                  <span className="w-9 h-7 rounded-lg btn-brand flex items-center justify-center shadow-sm">
                    <KeyRound className="w-4 h-4" />
                  </span>
                  <span className="text-[10px] font-bold text-brand">Nhập mã</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAdminLoginOpen(true)}
                  className="flex flex-col items-center justify-center gap-0.5 text-slate-500 dark:text-slate-400"
                >
                  <ShieldCheck className="w-[18px] h-[18px]" />
                  <span className="text-[10px] font-bold">Admin</span>
                </button>
              </>
            )}
          </div>
        </nav>
      )}

      {/* ================= QUICK PIN MODAL ================= */}
      {pinModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setPinModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-elevated animate-sheet-up sm:animate-slide-up pb-safe relative"
          >
            <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto sm:hidden -mt-2" />
            <button
              type="button"
              onClick={() => setPinModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Nhập Mã Bài Tập</h3>
              <p className="text-xs text-slate-500 mt-0.5">Nhập mã bài tập để mở và làm ngay</p>
            </div>

            <form onSubmit={handleQuickJoin} className="space-y-3">
              <input
                type="text"
                autoFocus
                placeholder="VD: ENG-XXXX"
                value={quickPin}
                onChange={(e) => setQuickPin(e.target.value.toUpperCase())}
                className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-base font-extrabold tracking-wider uppercase text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl btn-brand font-extrabold text-sm shadow-sm flex items-center justify-center gap-2 transition"
              >
                <span>Vào Làm Bài</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ================= ADMIN LOGIN MODAL ================= */}
      <AdminLoginModal
        open={adminLoginOpen}
        onClose={() => setAdminLoginOpen(false)}
        onSuccess={() => navigate('/admin')}
      />
    </div>
  );
};
