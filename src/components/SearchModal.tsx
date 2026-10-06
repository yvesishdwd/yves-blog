import React, { useState, useEffect, useRef } from 'react';
import { Article } from '../types.ts';
import { Search, X, ArrowRight } from 'lucide-react';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  articles: Article[];
  onSelectArticle: (id: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  articles,
  onSelectArticle,
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filtered = query.trim() === ''
    ? []
    : articles.filter(
        (a) =>
          a.title.toLowerCase().includes(query.toLowerCase()) ||
          a.summary.toLowerCase().includes(query.toLowerCase()) ||
          (a.category && a.category.toLowerCase().includes(query.toLowerCase())) ||
          (a.tags && a.tags.some((t) => t.toLowerCase().includes(query.toLowerCase())))
      );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-28 px-4 bg-black/40 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white border border-black shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-black pb-3">
          <div className="flex items-center gap-2.5 flex-1">
            <Search size={16} className="text-black/60" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search essays, concepts, typography..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full text-base sm:text-lg bg-transparent text-black outline-none placeholder:text-black/30 font-normal"
            />
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:opacity-60 transition-opacity text-black"
            aria-label="Close search"
          >
            <X size={18} />
          </button>
        </div>

        {/* Results */}
        <div className="mt-4 max-h-80 overflow-y-auto divide-y divide-black/10">
          {query.trim() === '' ? (
            <div className="py-8 text-center text-xs text-black/50 font-mono">
              Type keywords such as "space", "kyoto", "helvetica", or "longevity"
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-black/60">
              No essays matching "{query}".
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  onSelectArticle(item.id);
                  onClose();
                }}
                className="py-3 px-2 group cursor-pointer hover:bg-neutral-50 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2 text-xs text-black/50 mb-0.5">
                    <span>{item.category}</span>
                    <span>·</span>
                    <span className="font-mono tabular-nums">{item.date}</span>
                  </div>
                  <h4 className="text-sm font-normal text-black group-hover:underline">
                    {item.title}
                  </h4>
                </div>
                <ArrowRight size={14} className="text-black/40 group-hover:text-black group-hover:translate-x-0.5 transition-transform" />
              </div>
            ))
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-black/10 flex items-center justify-between text-xs text-black/50 font-mono">
          <span>Press ESC to close</span>
          <span>{filtered.length} matches</span>
        </div>
      </div>
    </div>
  );
};
