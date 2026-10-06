import React from 'react';
import { Search, RotateCcw } from 'lucide-react';

interface HeaderProps {
  onOpenCover: () => void;
  onOpenSearch: () => void;
  onOpenColophon: () => void;
  currentSection: 'essays' | 'notes' | 'archive';
  onSelectSection: (section: 'essays' | 'notes' | 'archive') => void;
  selectedArticleId: string | null;
  onBackToIndex: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenCover,
  onOpenSearch,
  onOpenColophon,
  currentSection,
  onSelectSection,
  selectedArticleId,
  onBackToIndex,
}) => {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-6 sm:px-12 py-5 bg-white/95 backdrop-blur-sm border-b border-black">
      {/* Zone 1: Single text element wordmark */}
      <button
        onClick={() => {
          if (selectedArticleId) {
            onBackToIndex();
          } else {
            onOpenCover();
          }
        }}
        className="text-xl sm:text-2xl font-normal tracking-tighter text-black hover:opacity-75 transition-opacity text-left cursor-pointer"
        style={{ letterSpacing: '-0.035em' }}
        title="Return to cover"
      >
        yves' blog
      </button>

      {/* Zone 2: 4 clean text navigation links */}
      <nav className="hidden md:flex items-center gap-8 text-sm font-normal text-black">
        <button
          onClick={() => {
            onBackToIndex();
            onSelectSection('essays');
          }}
          className={`transition-colors pb-0.5 ${
            currentSection === 'essays' && !selectedArticleId
              ? 'border-b border-black font-medium'
              : 'text-black/60 hover:text-black'
          }`}
        >
          Essays
        </button>

        <button
          onClick={() => {
            onBackToIndex();
            onSelectSection('notes');
          }}
          className={`transition-colors pb-0.5 ${
            currentSection === 'notes' && !selectedArticleId
              ? 'border-b border-black font-medium'
              : 'text-black/60 hover:text-black'
          }`}
        >
          Short Notes
        </button>

        <button
          onClick={() => {
            onBackToIndex();
            onSelectSection('archive');
          }}
          className={`transition-colors pb-0.5 ${
            currentSection === 'archive' && !selectedArticleId
              ? 'border-b border-black font-medium'
              : 'text-black/60 hover:text-black'
          }`}
        >
          Index & Archive
        </button>

        <button
          onClick={onOpenColophon}
          className="text-black/60 hover:text-black transition-colors"
        >
          Colophon
        </button>
      </nav>

      {/* Zone 3: 1-2 primary actions */}
      <div className="flex items-center gap-4 text-xs font-normal">
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-1.5 py-1.5 px-2 text-black hover:opacity-60 transition-opacity border border-black/30 hover:border-black rounded-none cursor-pointer"
          title="Search articles (/) "
        >
          <Search size={13} strokeWidth={1.5} />
          <span className="hidden sm:inline">Search</span>
        </button>

        <button
          onClick={onOpenCover}
          className="flex items-center gap-1.5 py-1.5 px-2.5 bg-black text-white hover:bg-neutral-800 transition-colors text-xs cursor-pointer"
          title="Return to minimal opening page"
        >
          <RotateCcw size={12} strokeWidth={1.5} />
          <span className="whitespace-nowrap">Cover</span>
        </button>
      </div>
    </header>
  );
};
