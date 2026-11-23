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
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { HomeworkStorageService } from '../services/homeworkStorage';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();

  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [quickPin, setQuickPin] = useState('');

  const isDoPage = location.pathname.startsWith('/homework/do');
  const isHome = location.pathname === '/homework' || location.pathname === '/';
  const isCreate = location.pathname.startsWith('/homework/create');

  const handleQuickJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = quickPin.trim().toUpperCase();
    if (!cleaned) {
      showToast({ message: 'Vui lòng nhập mã bài tập', type: 'error' });
      return;
    }
    const found = HomeworkStorageService.getAssignment(cleaned);
    if (!found) {
      showToast({
        message: 'Không tìm thấy bài tập',
        subMessage: `Mã "${cleaned}" không tồn tại. Thử mã mẫu ENG-101.`,
        type: 'error',
      });
      return;
    }
    setPinModalOpen(false);
    setQuickPin('');
    navigate(`/homework/do/${found.code}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F8FB] dark:bg-[#0B1120]">
      {/* ================= CLEAN TOP BAR (All Devices) ================= */}
      <header className="sticky top-0 z-40 h-14 sm:h-16 glass-bar border-b pt-safe">
        <div className="max-w-5xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-3">
          {/* Brand */}
          <button
            type="button"
            onClick={() => navigate('/homework')}
            className="flex items-center gap-2.5 group shrink-0"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-blue-600 to-teal-500 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="text-left">
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-slate-900 dark:text-white block leading-none">
                EngWork
              </span>
              <span className="text-[10px] font-semibold text-slate-400">
                {isDoPage ? 'Đang làm bài tập' : 'Bài tập Tiếng Anh'}
              </span>
            </div>
          </button>

          {/* Desktop / Tablet Nav Actions */}
          {!isDoPage ? (
            <div className="flex items-center gap-2">
              <nav className="hidden sm:flex items-center gap-1 mr-1">
                <button
                  type="button"
                  onClick={() => navigate('/homework')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                    isHome
                      ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Bài tập</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/homework/create')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                    isCreate
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                  }`}
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Tạo bài tập</span>
                </button>
              </nav>

              <button
                type="button"
                onClick={() => setPinModalOpen(true)}
                className="sm:hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200/70 dark:border-teal-800/60 text-xs font-bold"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Nhập mã</span>
              </button>

              <button
                type="button"
                onClick={toggleTheme}
                aria-label="Đổi giao diện Sáng/Tối"
                className="p-2 rounded-xl text-slate-600 dark:text-slate-300 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200/70 dark:hover:bg-slate-700 transition"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
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
                {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
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
      <main className="flex-1 w-full">
        <div
          className={`max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-8 ${
            !isDoPage ? 'pb-24 sm:pb-12' : 'pb-24 lg:pb-12'
          }`}
        >
          {children}
        </div>
      </main>

      {/* ================= MOBILE BOTTOM BAR (< sm, hidden while taking test) ================= */}
      {!isDoPage && (
        <nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 glass-bar border-t pb-safe">
          <div className="grid grid-cols-3 h-16 px-2">
            <button
              type="button"
              onClick={() => navigate('/homework')}
              className={`flex flex-col items-center justify-center gap-1 transition ${
                isHome ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <BookOpen className="w-5 h-5" />
              <span className="text-[11px] font-bold">Bài tập</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/homework/create')}
              className="flex flex-col items-center justify-center gap-0.5"
            >
              <span
                className={`w-11 h-8 rounded-xl flex items-center justify-center shadow-sm transition active:scale-95 ${
                  isCreate
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                    : 'bg-blue-600 text-white'
                }`}
              >
                <Plus className="w-5 h-5 stroke-[2.5]" />
              </span>
              <span
                className={`text-[11px] font-bold ${
                  isCreate ? 'text-slate-900 dark:text-white' : 'text-blue-600 dark:text-blue-400'
                }`}
              >
                Tạo bài
              </span>
            </button>

            <button
              type="button"
              onClick={() => setPinModalOpen(true)}
              className="flex flex-col items-center justify-center gap-1 text-slate-500 dark:text-slate-400 active:text-teal-600 transition"
            >
              <KeyRound className="w-5 h-5" />
              <span className="text-[11px] font-bold">Làm bài</span>
            </button>
          </div>
        </nav>
      )}

      {/* ================= QUICK PIN SHEET (Mobile) ================= */}
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
              <p className="text-xs text-slate-500 mt-0.5">Nhập mã PIN do giáo viên gửi để bắt đầu làm bài</p>
            </div>

            <form onSubmit={handleQuickJoin} className="space-y-3">
              <input
                type="text"
                autoFocus
                placeholder="VD: ENG-101"
                value={quickPin}
                onChange={(e) => setQuickPin(e.target.value.toUpperCase())}
                className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-base font-extrabold tracking-wider uppercase text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-sm shadow-glow-emerald flex items-center justify-center gap-2 transition"
              >
                <span>Bắt Đầu Làm Bài</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
