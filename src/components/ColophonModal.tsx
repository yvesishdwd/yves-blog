import React from 'react';
import { X, ArrowUpRight } from 'lucide-react';

interface ColophonModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ColophonModal: React.FC<ColophonModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/45 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white border border-black shadow-2xl p-6 sm:p-10 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-black pb-4 mb-6">
          <div className="text-xs uppercase tracking-widest text-black/60 font-mono">
            About Yves · Colophon
          </div>
          <button
            onClick={onClose}
            className="p-1 text-black hover:opacity-60 transition-opacity"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-6 text-sm text-black/85 leading-relaxed font-normal">
          <div>
            <h3 className="text-lg font-normal tracking-tight text-black mb-2">
              Yves
            </h3>
            <p>
              Independent writer and spatial designer. Working between Basel and Zurich. My practice explores the intersection of Swiss graphic discipline, physical timber architecture, and quiet digital tools that refuse to compete for human nervous systems.
            </p>
          </div>

          <div className="border-t border-black/15 pt-5">
            <h4 className="text-xs uppercase tracking-wider text-black font-medium mb-3">
              Typography & Composition
            </h4>
            <div className="space-y-2 text-xs font-mono text-black/70">
              <div className="flex justify-between border-b border-black/5 pb-1">
                <span>Primary Face</span>
                <span className="text-black">Helvetica (Neue Haas Grotesk)</span>
              </div>
              <div className="flex justify-between border-b border-black/5 pb-1">
                <span>Designers</span>
                <span className="text-black">Max Miedinger & Eduard Hoffmann, 1957</span>
              </div>
              <div className="flex justify-between border-b border-black/5 pb-1">
                <span>Foundry</span>
                <span className="text-black">Haas'sche Schriftgiesserei, Münchenstein</span>
              </div>
              <div className="flex justify-between border-b border-black/5 pb-1">
                <span>Canvas</span>
                <span className="text-black">#FFFFFF (pure white)</span>
              </div>
              <div className="flex justify-between">
                <span>Ink</span>
                <span className="text-black">#000000 (carbon black)</span>
              </div>
            </div>
          </div>

          <div className="border-t border-black/15 pt-5">
            <h4 className="text-xs uppercase tracking-wider text-black font-medium mb-2">
              Website Ethos
            </h4>
            <p className="text-xs text-black/70 leading-relaxed">
              This publication respects your time and device. It loads in milliseconds, executes no tracking telemetry, collects no cookies, and offers an uncompromised reading environment. The opening view defaults to pure silence: white ground, black text, and nothing more.
            </p>
          </div>

          <div className="border-t border-black/15 pt-5 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
            <div>
              <span className="text-black/50">Correspondence:</span>{' '}
              <a
                href="mailto:yves@atelier-zurich.ch"
                className="text-black underline underline-offset-2 hover:opacity-70"
              >
                yves@atelier-zurich.ch
              </a>
            </div>
            <a
              href="https://en.wikipedia.org/wiki/Helvetica"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-black hover:opacity-60"
            >
              <span>Haas Archive</span>
              <ArrowUpRight size={12} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
