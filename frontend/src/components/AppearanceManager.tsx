import React, { useRef } from 'react';
import {
  Palette,
  Image as ImageIcon,
  Upload,
  Trash2,
  RotateCcw,
  Sparkles,
  GraduationCap,
  Type,
  Layers,
  Check,
} from 'lucide-react';
import {
  useSiteConfig,
  COLOR_PRESETS,
  GRADIENT_PRESETS,
  LogoMode,
  BackgroundMode,
} from '../context/SiteConfigContext';
import { useToast } from '../context/ToastContext';

async function compressImageToDataUrl(file: File, maxDim: number, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không đọc được file ảnh'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('File ảnh không hợp lệ'));
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        resolve(canvas.toDataURL(mime, quality));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export const AppearanceManager: React.FC = () => {
  const { config, updateConfig, resetConfig } = useSiteConfig();
  const { showToast } = useToast();

  const logoInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageToDataUrl(file, 256, 0.9);
      updateConfig({ logoMode: 'image', logoImageUrl: dataUrl });
      showToast({ message: 'Đã cập nhật ảnh Logo mới!', type: 'success' });
    } catch (err: any) {
      showToast({ message: 'Lỗi tải ảnh Logo', subMessage: err.message, type: 'error' });
    } finally {
      e.target.value = '';
    }
  };

  const handleUploadBg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageToDataUrl(file, 1440, 0.78);
      updateConfig({ backgroundMode: 'image', backgroundImageUrl: dataUrl });
      showToast({ message: 'Đã cập nhật hình nền mới!', type: 'success' });
    } catch (err: any) {
      showToast({ message: 'Lỗi tải hình nền', subMessage: err.message, type: 'error' });
    } finally {
      e.target.value = '';
    }
  };

  const handleResetAll = () => {
    resetConfig();
    showToast({ message: 'Đã khôi phục giao diện mặc định', type: 'info' });
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Top Info + Reset */}
      <div className="surface-card rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
            <Palette className="w-5 h-5 text-brand" />
            <span>Tùy Chỉnh Giao Diện, Logo, Màu Sắc &amp; Background</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Mọi thay đổi được áp dụng và lưu tức thì trên toàn bộ trang web.
          </p>
        </div>

        <button
          type="button"
          onClick={handleResetAll}
          className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/60 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Khôi phục mặc định</span>
        </button>
      </div>

      {/* ================= 1. LOGO & BRANDING ================= */}
      <section className="surface-card rounded-3xl p-5 sm:p-6 space-y-5">
        <div className="flex items-center gap-2 font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
          <Sparkles className="w-4.5 h-4.5 text-brand" />
          <span>1. Logo &amp; Thương Hiệu</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
          {/* Logo Preview & Controls */}
          <div className="md:col-span-5 space-y-3">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 flex items-center gap-3.5">
              {config.logoMode === 'image' && config.logoImageUrl ? (
                <img
                  src={config.logoImageUrl}
                  alt="Logo preview"
                  className="w-14 h-14 rounded-2xl object-cover border border-slate-200 dark:border-slate-600 bg-white shrink-0"
                />
              ) : config.logoMode === 'icon' ? (
                <div className="w-14 h-14 rounded-2xl bg-brand-gradient text-white flex items-center justify-center shadow-sm shrink-0">
                  <GraduationCap className="w-7 h-7" />
                </div>
              ) : (
                <div className="w-14 h-14 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center text-[10px] font-bold text-slate-400 shrink-0 text-center px-1">
                  Đã ẩn Logo
                </div>
              )}

              <div className="min-w-0">
                <p className="font-extrabold text-base text-slate-900 dark:text-white truncate">
                  {config.brandName || 'Chưa có tên'}
                </p>
                <p className="text-xs text-slate-500 truncate">{config.brandSubtitle || 'Không có mô tả phụ'}</p>
              </div>
            </div>

            {/* Logo Mode Selector */}
            <div className="grid grid-cols-3 gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              {(
                [
                  { id: 'icon', label: 'Icon sẵn' },
                  { id: 'image', label: 'Ảnh Logo' },
                  { id: 'none', label: 'Xóa Logo' },
                ] as { id: LogoMode; label: string }[]
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => updateConfig({ logoMode: m.id })}
                  className={`py-2 px-2 rounded-lg text-xs font-bold transition ${
                    config.logoMode === m.id
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Upload or URL */}
            <div className="space-y-2">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                onChange={handleUploadLogo}
                className="hidden"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="flex-1 py-2.5 px-3 rounded-xl btn-brand text-xs font-extrabold flex items-center justify-center gap-1.5 transition"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Tải ảnh Logo từ máy</span>
                </button>
                {config.logoImageUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      updateConfig({ logoImageUrl: '', logoMode: 'none' });
                      showToast({ message: 'Đã xóa ảnh Logo', type: 'info' });
                    }}
                    title="Xóa ảnh Logo"
                    className="px-3 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 text-xs font-bold flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa</span>
                  </button>
                )}
              </div>

              <input
                type="url"
                placeholder="Hoặc dán đường link ảnh Logo (https://...)"
                value={config.logoImageUrl.startsWith('data:') ? '' : config.logoImageUrl}
                onChange={(e) =>
                  updateConfig({
                    logoImageUrl: e.target.value,
                    logoMode: e.target.value.trim() ? 'image' : config.logoMode,
                  })
                }
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Brand & Hero Text Fields */}
          <div className="md:col-span-7 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Tên trang web / Thương hiệu
                </label>
                <input
                  type="text"
                  value={config.brandName}
                  onChange={(e) => updateConfig({ brandName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-sm font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Dòng mô tả dưới Logo
                </label>
                <input
                  type="text"
                  value={config.brandSubtitle}
                  onChange={(e) => updateConfig({ brandSubtitle: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-sm"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
              <p className="text-xs font-extrabold text-slate-500 flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5" /> Nội dung Banner Trang Chủ (để trống nếu muốn ẩn)
              </p>

              <input
                type="text"
                placeholder="Nhãn nhỏ trên cùng..."
                value={config.heroBadge}
                onChange={(e) => updateConfig({ heroBadge: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input
                  type="text"
                  placeholder="Tiêu đề chính..."
                  value={config.heroTitle}
                  onChange={(e) => updateConfig({ heroTitle: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                />
                <input
                  type="text"
                  placeholder="Cụm từ nổi bật..."
                  value={config.heroHighlight}
                  onChange={(e) => updateConfig({ heroHighlight: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                />
              </div>

              <textarea
                rows={2}
                placeholder="Mô tả ngắn dưới tiêu đề..."
                value={config.heroDescription}
                onChange={(e) => updateConfig({ heroDescription: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ================= 2. COLORS & HERO THEME ================= */}
      <section className="surface-card rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2 font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
          <Palette className="w-4.5 h-4.5 text-brand" />
          <span>2. Bảng Màu Chủ Đạo &amp; Banner Hero</span>
        </div>

        {/* Color Presets */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {COLOR_PRESETS.map((preset) => {
            const isSelected =
              config.primaryColor.toLowerCase() === preset.primary.toLowerCase() &&
              config.heroVia.toLowerCase() === preset.heroVia.toLowerCase();
            return (
              <button
                key={preset.name}
                type="button"
                onClick={() =>
                  updateConfig({
                    primaryColor: preset.primary,
                    secondaryColor: preset.secondary,
                    heroFrom: preset.heroFrom,
                    heroVia: preset.heroVia,
                    heroTo: preset.heroTo,
                  })
                }
                className={`p-3 rounded-2xl border text-left space-y-2 transition ${
                  isSelected
                    ? 'border-slate-900 dark:border-white ring-2 ring-slate-900/10 dark:ring-white/20 bg-slate-50 dark:bg-slate-800'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex -space-x-1.5">
                    <span
                      className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-900 shadow-sm"
                      style={{ backgroundColor: preset.primary }}
                    />
                    <span
                      className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-900 shadow-sm"
                      style={{ backgroundColor: preset.secondary }}
                    />
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-emerald-500" />}
                </div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                  {preset.name}
                </p>
              </button>
            );
          })}
        </div>

        {/* Custom Color Pickers */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
          {[
            { label: 'Màu nút chính', key: 'primaryColor' as const },
            { label: 'Màu nhấn phụ', key: 'secondaryColor' as const },
            { label: 'Banner (Đầu)', key: 'heroFrom' as const },
            { label: 'Banner (Giữa)', key: 'heroVia' as const },
            { label: 'Banner (Cuối)', key: 'heroTo' as const },
          ].map((item) => (
            <label
              key={item.key}
              className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-2.5 cursor-pointer"
            >
              <input
                type="color"
                value={config[item.key]}
                onChange={(e) => updateConfig({ [item.key]: e.target.value })}
                className="w-8 h-8 rounded-lg border-0 bg-transparent cursor-pointer shrink-0"
              />
              <div className="min-w-0">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block truncate">
                  {item.label}
                </span>
                <span className="font-mono text-[10px] text-slate-400 uppercase">{config[item.key]}</span>
              </div>
            </label>
          ))}
        </div>

        {/* Live Hero Mini Preview + Pattern Toggle */}
        <div className="rounded-2xl bg-hero-custom p-4 text-white flex flex-wrap items-center justify-between gap-3 relative overflow-hidden">
          {config.heroPattern && <div className="absolute inset-0 bg-dot-grid opacity-30 pointer-events-none" />}
          <div className="relative z-10">
            <p className="text-xs font-bold opacity-80">Xem trước Banner:</p>
            <p className="text-sm font-extrabold">
              {config.heroTitle}{' '}
              <span style={{ color: config.secondaryColor }} className="brightness-125">
                {config.heroHighlight}
              </span>
            </p>
          </div>
          <label className="relative z-10 inline-flex items-center gap-2 text-xs font-bold bg-white/15 px-3 py-1.5 rounded-xl cursor-pointer">
            <input
              type="checkbox"
              checked={config.heroPattern}
              onChange={(e) => updateConfig({ heroPattern: e.target.checked })}
              className="rounded"
            />
            <span>Họa tiết chấm bi</span>
          </label>
        </div>
      </section>

      {/* ================= 3. BACKGROUND MANAGER ================= */}
      <section className="surface-card rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2 font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
          <Layers className="w-4.5 h-4.5 text-brand" />
          <span>3. Hình Nền &amp; Background Trang Web</span>
        </div>

        {/* Mode Switcher */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(
            [
              { id: 'default', label: 'Mặc định' },
              { id: 'solid', label: 'Màu đơn sắc' },
              { id: 'gradient', label: 'Nền Gradient' },
              { id: 'image', label: 'Ảnh nền' },
            ] as { id: BackgroundMode; label: string }[]
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => updateConfig({ backgroundMode: m.id })}
              className={`py-2.5 px-3 rounded-xl text-xs font-extrabold border transition ${
                config.backgroundMode === m.id
                  ? 'btn-brand border-transparent shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Solid Color Options */}
        {config.backgroundMode === 'solid' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <label className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-3 cursor-pointer">
              <input
                type="color"
                value={config.backgroundColorLight}
                onChange={(e) => updateConfig({ backgroundColorLight: e.target.value })}
                className="w-10 h-10 rounded-xl cursor-pointer"
              />
              <div>
                <span className="text-xs font-extrabold text-slate-800 dark:text-white block">
                  Màu nền chế độ Sáng
                </span>
                <span className="font-mono text-[11px] text-slate-400">{config.backgroundColorLight}</span>
              </div>
            </label>

            <label className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-3 cursor-pointer">
              <input
                type="color"
                value={config.backgroundColorDark}
                onChange={(e) => updateConfig({ backgroundColorDark: e.target.value })}
                className="w-10 h-10 rounded-xl cursor-pointer"
              />
              <div>
                <span className="text-xs font-extrabold text-slate-800 dark:text-white block">
                  Màu nền chế độ Tối
                </span>
                <span className="font-mono text-[11px] text-slate-400">{config.backgroundColorDark}</span>
              </div>
            </label>
          </div>
        )}

        {/* Gradient Options */}
        {config.backgroundMode === 'gradient' && (
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {GRADIENT_PRESETS.map((g) => (
                <button
                  key={g.name}
                  type="button"
                  onClick={() => updateConfig({ backgroundGradient: g.value })}
                  className={`p-2 rounded-2xl border text-left space-y-1.5 transition ${
                    config.backgroundGradient === g.value
                      ? 'border-blue-600 ring-2 ring-blue-500/20'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="h-12 rounded-xl border border-black/5" style={{ backgroundImage: g.value }} />
                  <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate">{g.name}</p>
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Hoặc nhập CSS gradient tùy chỉnh..."
              value={config.backgroundGradient}
              onChange={(e) => updateConfig({ backgroundGradient: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs"
            />
          </div>
        )}

        {/* Image Background Options */}
        {config.backgroundMode === 'image' && (
          <div className="space-y-3 pt-1">
            <input
              ref={bgInputRef}
              type="file"
              accept="image/*"
              onChange={handleUploadBg}
              className="hidden"
            />

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => bgInputRef.current?.click()}
                className="px-4 py-2.5 rounded-xl btn-brand text-xs font-extrabold flex items-center gap-1.5"
              >
                <ImageIcon className="w-4 h-4" />
                <span>Tải ảnh nền từ máy</span>
              </button>

              {config.backgroundImageUrl && (
                <button
                  type="button"
                  onClick={() => {
                    updateConfig({ backgroundImageUrl: '', backgroundMode: 'default' });
                    showToast({ message: 'Đã xóa ảnh nền', type: 'info' });
                  }}
                  className="px-4 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 text-xs font-bold flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Xóa ảnh nền</span>
                </button>
              )}
            </div>

            <input
              type="url"
              placeholder="Hoặc dán đường link ảnh nền (https://...)"
              value={config.backgroundImageUrl.startsWith('data:') ? '' : config.backgroundImageUrl}
              onChange={(e) => updateConfig({ backgroundImageUrl: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-xs"
            />

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200">
                <span>Độ mờ lớp phủ giúp chữ dễ đọc</span>
                <span>{Math.round(config.backgroundOverlayOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="0.85"
                step="0.05"
                value={config.backgroundOverlayOpacity}
                onChange={(e) => updateConfig({ backgroundOverlayOpacity: Number(e.target.value) })}
                className="w-full accent-blue-600"
              />
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
