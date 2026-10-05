import { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { OpeningPage } from './components/OpeningPage.tsx';
import { InnerPage } from './components/InnerPage.tsx';
import { ARTICLES, SHORT_NOTES } from './data/articles.ts';

export default function App() {
  const [showCover, setShowCover] = useState<boolean>(true);

  // Allow ESC to return to cover
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !showCover) {
        setShowCover(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showCover]);

  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white">
      <AnimatePresence mode="wait">
        {showCover ? (
          <OpeningPage
            key="cover"
            onEnter={() => setShowCover(false)}
          />
        ) : (
          <InnerPage
            key="inner"
            onBackToCover={() => setShowCover(true)}
            defaultArticles={ARTICLES}
            defaultNotes={SHORT_NOTES}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
