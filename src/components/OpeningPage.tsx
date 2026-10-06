import React, { useEffect } from 'react';
import { motion } from 'motion/react';

interface OpeningPageProps {
  onEnter: () => void;
}

export const OpeningPage: React.FC<OpeningPageProps> = ({ onEnter }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        onEnter();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onEnter]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-white text-black cursor-pointer select-none lowercase"
      onClick={onEnter}
      role="button"
      tabIndex={0}
      aria-label="enter yves' blog"
    >
      <h1
        className="text-3xl sm:text-4xl md:text-5xl font-normal text-black hover:opacity-60 transition-opacity duration-150 lowercase"
        style={{
          fontFamily: 'Arial, sans-serif',
          letterSpacing: 'normal',
        }}
      >
        yves' blog
      </h1>
    </motion.div>
  );
};
