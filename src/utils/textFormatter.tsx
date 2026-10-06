import React from 'react';

// Formats inline markdown bold and italic
export const renderInlineFormatting = (text: string): React.ReactNode => {
  if (!text) return null;
  // Splits by ***bold italic***, **bold**, *italic*
  const parts = text.split(/(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('***') && part.endsWith('***') && part.length >= 6) {
      return (
        <strong key={index} className="font-semibold italic text-black">
          {part.slice(3, -3)}
        </strong>
      );
    }
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={index} className="font-semibold text-black">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return (
        <em key={index} className="italic font-normal">
          {part.slice(1, -1)}
        </em>
      );
    }
    return part;
  });
};

// Formats text with alignment tags like [center]...[/center], <center>...</center>,
// [right]...[/right], [left]...[/left], along with bold/italic formatting.
export const renderFormattedText = (
  text: string,
  baseAlign?: 'left' | 'center' | 'right'
): React.ReactNode => {
  if (!text) return null;

  // Regex matching [center]...[/center], <center>...</center>, etc.
  const ALIGN_REGEX = /(\[(?:center|right|left|justify)\][\s\S]*?\[\/(?:center|right|left|justify)\]|<(?:center|right|left)>[\s\S]*?<\/(?:center|right|left)>)/gi;

  if (!ALIGN_REGEX.test(text)) {
    // If no alignment tags present, just format inline bold/italic
    return renderInlineFormatting(text);
  }

  // Reset regex index after test
  ALIGN_REGEX.lastIndex = 0;
  const parts = text.split(ALIGN_REGEX);

  return parts.map((part, index) => {
    if (!part) return null;

    const bbMatch = part.match(/^\[(center|right|left|justify)\]([\s\S]*?)\[\/\1\]$/i);
    const htmlMatch = part.match(/^<(center|right|left)>([\s\S]*?)<\/\1>$/i);

    if (bbMatch || htmlMatch) {
      const alignType = (bbMatch ? bbMatch[1] : htmlMatch![1]).toLowerCase();
      const rawContent = bbMatch ? bbMatch[2] : htmlMatch![2];

      const alignClass =
        alignType === 'center'
          ? 'text-center'
          : alignType === 'right'
          ? 'text-right'
          : alignType === 'justify'
          ? 'text-justify'
          : 'text-left';

      return (
        <span
          key={index}
          className={`block w-full ${alignClass} my-0.5`}
        >
          {renderInlineFormatting(rawContent)}
        </span>
      );
    }

    // Normal text segment: trim single \n adjacent to block alignment elements to prevent double blank gaps
    let cleanedPart = part;
    const isFollowedByBlock = index < parts.length - 1 && ALIGN_REGEX.test(parts[index + 1]);
    ALIGN_REGEX.lastIndex = 0;
    const isPrecededByBlock = index > 0 && ALIGN_REGEX.test(parts[index - 1]);
    ALIGN_REGEX.lastIndex = 0;

    if (isFollowedByBlock && cleanedPart.endsWith('\n')) {
      cleanedPart = cleanedPart.slice(0, -1);
    }
    if (isPrecededByBlock && cleanedPart.startsWith('\n')) {
      cleanedPart = cleanedPart.slice(1);
    }

    if (!cleanedPart) return null;

    return (
      <span key={index} className="inline">
        {renderInlineFormatting(cleanedPart)}
      </span>
    );
  });
};
