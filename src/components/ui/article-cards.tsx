import type { ReactNode, KeyboardEvent } from 'react';

interface ArticleCardProps {
  category: string;
  title: string;
  subtitle: string;
  price: string;
  imageUrl?: string;
  gradient?: string;
  actionLabel?: string;
  onClick?: () => void;
  onKeyDown?: (e: KeyboardEvent) => void;
  role?: string;
  tabIndex?: number;
  className?: string;
  children?: ReactNode;
}

export function ArticleCard({
  category,
  title,
  subtitle,
  price,
  imageUrl,
  gradient = 'linear-gradient(135deg, #1DB954, #191414)',
  actionLabel,
  onClick,
  onKeyDown,
  role,
  tabIndex,
  className = '',
}: ArticleCardProps) {
  return (
    <div
      role={role}
      tabIndex={tabIndex}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={`group relative flex flex-col overflow-hidden rounded-xl bg-[#181818] p-4 transition-all duration-300 hover:bg-[#282828] hover:shadow-xl cursor-pointer ${className}`}
    >
      <div
        className="mb-4 flex h-40 w-full items-center justify-center rounded-lg"
        style={{ background: gradient }}
      >
        {imageUrl ? (
          <img src={imageUrl} alt={title} className="h-full w-full rounded-lg object-cover" />
        ) : (
          <span className="text-4xl font-black text-white/20">{category[0]}</span>
        )}
      </div>
      <div className="flex flex-1 flex-col justify-between gap-1">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#1DB954]">
            {category}
          </span>
          <h3 className="mt-1 text-sm font-bold text-white truncate">{title}</h3>
          <p className="text-xs text-[#b3b3b3] line-clamp-2">{subtitle}</p>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-[#b3b3b3]">{price}</span>
          {actionLabel && (
            <span className="translate-y-2 text-[11px] font-bold text-white opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
              {actionLabel}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
