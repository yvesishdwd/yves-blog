import React from 'react';
import { ArrowUp } from 'lucide-react';

interface FooterProps {
  onOpenCover: () => void;
  onOpenColophon: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenCover, onOpenColophon }) => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="border-t border-black bg-white mt-20 text-xs">
      <div className="max-w-5xl mx-auto px-6 sm:px-12 py-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div>
            <button
              onClick={onOpenCover}
              className="text-lg font-normal tracking-tight text-black hover:opacity-70 transition-opacity"
              style={{ letterSpacing: '-0.03em' }}
            >
              yves' blog
            </button>
            <p className="mt-1 text-black/50 text-xs">
              A minimalist publication typeset in Helvetica.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-black/70">
            <button
              onClick={onOpenCover}
              className="hover:text-black transition-colors"
            >
              Minimal Cover
            </button>
            <button
              onClick={onOpenColophon}
              className="hover:text-black transition-colors"
            >
              Colophon
            </button>
            <a
              href="mailto:yves@atelier-zurich.ch"
              className="hover:text-black transition-colors"
            >
              Contact
            </a>
            <button
              onClick={scrollToTop}
              className="inline-flex items-center gap-1 text-black hover:opacity-60 transition-opacity ml-auto sm:ml-4"
              title="Return to top"
            >
              <span>Top</span>
              <ArrowUp size={12} />
            </button>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-black/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-black/40 font-mono text-xs">
          <div>© {new Date().getFullYear()} Yves. All rights reserved.</div>
          <div>Neue Haas Grotesk · 1957</div>
        </div>
      </div>
    </footer>
  );
};
