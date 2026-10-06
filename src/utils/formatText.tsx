import React from 'react';

// Format helper for **bold**, *italic*, and [center]/[right]/[left]
export const renderFormattedText = (text: string): React.ReactNode => {
  if (!text) return null;
  const parts = text.split(
    /(\[center\][\s\S]*?\[\/center\]|\[right\][\s\S]*?\[\/right\]|\[left\][\s\S]*?\[\/left\]|\*\*[^*]+\*\*|\*[^*]+\*)/g
  );
  return parts.map((part, index) => {
    if (part.startsWith('[center]') && part.endsWith('[/center]')) {
      const inner = part.slice(8, -9);
      return (
        <span key={index} className="block text-center w-full my-1">
          {renderFormattedText(inner)}
        </span>
      );
    }
    if (part.startsWith('[right]') && part.endsWith('[/right]')) {
      const inner = part.slice(7, -8);
      return (
        <span key={index} className="block text-right w-full my-1">
          {renderFormattedText(inner)}
        </span>
      );
    }
    if (part.startsWith('[left]') && part.endsWith('[/left]')) {
      const inner = part.slice(6, -7);
      return (
        <span key={index} className="block text-left w-full my-1">
          {renderFormattedText(inner)}
        </span>
      );
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-semibold text-black">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={index} className="italic font-normal">
          {part.slice(1, -1)}
        </em>
      );
    }
    return part;
  });
};
