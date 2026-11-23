import React, { useState } from 'react';
import { QrCode, X, Copy, Check, Link2 } from 'lucide-react';
import { HomeworkAssignment } from '../types/homework';

interface QrShareModalProps {
  assignment: HomeworkAssignment | null;
  onClose: () => void;
  onCopyLink: (assignment: HomeworkAssignment) => void;
}

export const QrShareModal: React.FC<QrShareModalProps> = ({ assignment, onClose, onCopyLink }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const [pinCopied, setPinCopied] = useState(false);

  if (!assignment) return null;

  const shareUrl = `${window.location.origin}/homework/do/${assignment.code}`;

  const handleCopyPin = async () => {
    try {
      await navigator.clipboard.writeText(assignment.code);
      setPinCopied(true);
      setTimeout(() => setPinCopied(false), 2000);
    } catch {
      // fallback ignored
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 max-w-sm w-full text-center space-y-5 shadow-elevated relative animate-sheet-up sm:animate-slide-up pb-safe"
      >
        {/* Mobile grab handle */}
        <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto sm:hidden -mt-2 mb-1" />

        <button
          onClick={onClose}
          aria-label="Đóng"
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-1.5 pt-1">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto border border-blue-100 dark:border-blue-900">
            <QrCode className="w-6 h-6" />
          </div>
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Chia Sẻ Bài Tập</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 px-2">{assignment.title}</p>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/70 rounded-2xl flex flex-col items-center justify-center space-y-3 border border-slate-200/80 dark:border-slate-700/80">
          <div className="w-44 h-44 bg-white p-3 rounded-2xl shadow-soft flex items-center justify-center border border-slate-200">
            {!imgFailed ? (
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(shareUrl)}`}
                alt={`QR Code cho ${assignment.code}`}
                className="w-full h-full object-contain"
                onError={() => setImgFailed(true)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-400 gap-2 p-2">
                <QrCode className="w-16 h-16 opacity-30" />
                <span className="text-[11px] font-semibold">Dùng mã PIN bên dưới</span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleCopyPin}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-400 transition group"
          >
            <span className="text-[11px] font-bold text-slate-400 uppercase">PIN:</span>
            <span className="font-mono font-extrabold text-blue-600 dark:text-blue-400 text-lg tracking-wider">
              {assignment.code}
            </span>
            {pinCopied ? (
              <Check className="w-4 h-4 text-emerald-500" />
            ) : (
              <Copy className="w-4 h-4 text-slate-400 group-hover:text-blue-500" />
            )}
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Học sinh dùng camera điện thoại quét mã QR hoặc nhập mã PIN để vào làm bài ngay, không cần đăng nhập.
        </p>

        <button
          onClick={() => {
            onCopyLink(assignment);
            onClose();
          }}
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-sm rounded-2xl shadow-glow-blue transition flex items-center justify-center gap-2"
        >
          <Link2 className="w-4 h-4" />
          <span>Sao Chép Đường Link Làm Bài</span>
        </button>
      </div>
    </div>
  );
};
