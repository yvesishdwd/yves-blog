import React, { useState, useEffect } from 'react';
import { Article, ReaderNote } from '../types.ts';
import { ArrowLeft, Bookmark, Share2, Check, MessageSquare } from 'lucide-react';

interface ArticleReaderProps {
  article: Article;
  onBack: () => void;
  onSelectArticle: (id: string) => void;
  allArticles: Article[];
}

export const ArticleReader: React.FC<ArticleReaderProps> = ({
  article,
  onBack,
  onSelectArticle,
  allArticles,
}) => {
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'larger'>('normal');
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [notes, setNotes] = useState<ReaderNote[]>([]);
  const [authorName, setAuthorName] = useState<string>('');
  const [noteText, setNoteText] = useState<string>('');
  const [noteSubmitted, setNoteSubmitted] = useState<boolean>(false);

  // Check bookmark status
  useEffect(() => {
    try {
      const saved = localStorage.getItem('yves_bookmarks');
      if (saved) {
        const list: string[] = JSON.parse(saved);
        setIsBookmarked(list.includes(article.id));
      }
    } catch {
      // ignore
    }
  }, [article.id]);

  // Load reader notes
  useEffect(() => {
    try {
      const storedNotes = localStorage.getItem(`yves_notes_${article.id}`);
      if (storedNotes) {
        setNotes(JSON.parse(storedNotes));
      } else {
        setNotes([]);
      }
    } catch {
      // ignore
    }
  }, [article.id]);

  // Scroll to top on article change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [article.id]);

  const toggleBookmark = () => {
    try {
      const saved = localStorage.getItem('yves_bookmarks');
      let list: string[] = saved ? JSON.parse(saved) : [];
      if (list.includes(article.id)) {
        list = list.filter((id) => id !== article.id);
        setIsBookmarked(false);
      } else {
        list.push(article.id);
        setIsBookmarked(true);
      }
      localStorage.setItem('yves_bookmarks', JSON.stringify(list));
    } catch {
      // ignore
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    const newNote: ReaderNote = {
      id: Date.now().toString(),
      articleId: article.id,
      name: authorName.trim() || 'Anonymous Reader',
      note: noteText.trim(),
      timestamp: new Date().toISOString().split('T')[0],
    };

    const updated = [newNote, ...notes];
    setNotes(updated);
    try {
      localStorage.setItem(`yves_notes_${article.id}`, JSON.stringify(updated));
    } catch {
      // ignore
    }
    setNoteText('');
    setNoteSubmitted(true);
    setTimeout(() => setNoteSubmitted(false), 3000);
  };

  // Find previous and next articles
  const currentIndex = allArticles.findIndex((a) => a.id === article.id);
  const prevArticle = currentIndex > 0 ? allArticles[currentIndex - 1] : null;
  const nextArticle = currentIndex < allArticles.length - 1 ? allArticles[currentIndex + 1] : null;

  const fontClasses = {
    normal: 'text-base leading-relaxed',
    large: 'text-lg leading-relaxed',
    larger: 'text-xl leading-loose',
  };

  return (
    <article className="max-w-3xl mx-auto px-6 sm:px-8 py-12 md:py-16">
      {/* Top action row */}
      <div className="flex items-center justify-between border-b border-black/15 pb-4 mb-10 text-xs">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-black hover:opacity-60 transition-opacity font-normal"
        >
          <ArrowLeft size={13} />
          <span>Index</span>
        </button>

        <div className="flex items-center gap-4 text-black">
          {/* Typography size selector */}
          <div className="flex items-center gap-1.5 text-xs text-black/60">
            <span>type:</span>
            <button
              onClick={() => setFontSize('normal')}
              className={`px-1 text-xs ${fontSize === 'normal' ? 'font-bold text-black underline' : 'hover:text-black'}`}
            >
              1x
            </button>
            <button
              onClick={() => setFontSize('large')}
              className={`px-1 text-xs ${fontSize === 'large' ? 'font-bold text-black underline' : 'hover:text-black'}`}
            >
              1.2x
            </button>
            <button
              onClick={() => setFontSize('larger')}
              className={`px-1 text-xs ${fontSize === 'larger' ? 'font-bold text-black underline' : 'hover:text-black'}`}
            >
              1.4x
            </button>
          </div>

          <span className="text-black/20">|</span>

          {/* Bookmark toggle */}
          <button
            onClick={toggleBookmark}
            className="flex items-center gap-1 hover:opacity-60 transition-opacity"
            title={isBookmarked ? 'Remove bookmark' : 'Bookmark essay'}
          >
            <Bookmark size={13} fill={isBookmarked ? 'currentColor' : 'none'} />
            <span className="hidden sm:inline">{isBookmarked ? 'Saved' : 'Save'}</span>
          </button>

          {/* Share */}
          <button
            onClick={handleShare}
            className="flex items-center gap-1 hover:opacity-60 transition-opacity"
            title="Copy essay link"
          >
            {copied ? <Check size={13} /> : <Share2 size={13} />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Share'}</span>
          </button>
        </div>
      </div>

      {/* Article Header */}
      <header className="mb-12">
        <div className="flex items-center gap-2 text-xs text-black/60 mb-4 tracking-tight">
          <span>{article.category}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">{article.date}</span>
          <span aria-hidden="true">·</span>
          <span>{article.readTime}</span>
        </div>

        <h1
          className="text-3xl sm:text-4xl md:text-5xl font-normal tracking-tight text-black text-balance leading-tight"
          style={{ letterSpacing: '-0.035em' }}
        >
          {article.title}
        </h1>
      </header>

      {/* Frameless photographs sorted by layer order */}
      {article.images && article.images.length > 0 && (
        <div className="mb-12 w-full space-y-6">
          {[...article.images]
            .sort((a, b) => (a.zIndex || 10) - (b.zIndex || 10))
            .map((img) => (
              <div key={img.id} className="w-full flex justify-center">
                <img
                  src={img.src}
                  alt="essay photograph"
                  className="h-auto block select-none mx-auto"
                  style={{
                    width: img.width ? `${img.width}px` : 'auto',
                    maxWidth: '100%',
                  }}
                />
              </div>
            ))}
        </div>
      )}

      {/* Article Body */}
      <div className={`space-y-6 text-black ${fontClasses[fontSize]}`}>
        {typeof article.content === 'string' ? (
          article.content.split('\n\n').map((para, i) => (
            <p key={i} className="font-normal text-black/90">
              {para}
            </p>
          ))
        ) : Array.isArray(article.content) ? (
          article.content.map((block, idx) => {
            if (block.type === 'heading') {
              return (
                <h2
                  key={idx}
                  className="text-xl sm:text-2xl font-medium tracking-tight text-black pt-6 pb-2"
                  style={{ letterSpacing: '-0.02em' }}
                >
                  {block.text}
                </h2>
              );
            }

            if (block.type === 'paragraph') {
              return (
                <p key={idx} className="font-normal text-black/90">
                  {block.text}
                </p>
              );
            }

            if (block.type === 'quote') {
              return (
                <blockquote
                  key={idx}
                  className="my-8 py-3 px-6 border-l-2 border-black bg-neutral-50 text-black italic"
                >
                  <p className="text-base sm:text-lg leading-relaxed not-italic font-normal">
                    "{block.text}"
                  </p>
                  {block.author && (
                    <footer className="mt-2 text-xs not-italic text-black/60">
                      — {block.author}
                    </footer>
                  )}
                </blockquote>
              );
            }

            if (block.type === 'list' && block.items) {
              return (
                <ul key={idx} className="my-6 space-y-2 list-none pl-0">
                  {block.items.map((item, itemIdx) => (
                    <li key={itemIdx} className="flex items-start gap-3">
                      <span className="text-black font-mono text-sm leading-6">—</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              );
            }

            return null;
          })
        ) : null}
      </div>

      {/* Tags */}
      {article.tags && article.tags.length > 0 && (
        <div className="mt-12 pt-6 border-t border-black/10 flex items-center gap-2 text-xs text-black/60">
          <span>Themes:</span>
          {article.tags.map((t, idx) => (
            <React.Fragment key={t}>
              <span className="text-black">{t}</span>
              {article.tags && idx < article.tags.length - 1 && <span aria-hidden="true">·</span>}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Navigation to next/previous */}
      <nav className="mt-12 py-8 border-y border-black grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
        <div>
          {prevArticle ? (
            <button
              onClick={() => onSelectArticle(prevArticle.id)}
              className="text-left group flex flex-col gap-1 hover:opacity-60 transition-opacity"
            >
              <span className="text-xs text-black/50">← Previous Essay</span>
              <span className="font-normal text-black group-hover:underline">{prevArticle.title}</span>
            </button>
          ) : (
            <div className="text-xs text-black/40">First essay in collection</div>
          )}
        </div>

        <div className="sm:text-right">
          {nextArticle ? (
            <button
              onClick={() => onSelectArticle(nextArticle.id)}
              className="sm:text-right text-left group flex flex-col gap-1 hover:opacity-60 transition-opacity ml-auto"
            >
              <span className="text-xs text-black/50">Next Essay →</span>
              <span className="font-normal text-black group-hover:underline">{nextArticle.title}</span>
            </button>
          ) : (
            <div className="text-xs text-black/40">Latest essay in collection</div>
          )}
        </div>
      </nav>

      {/* Reader Marginalia / Responses */}
      <section className="mt-16 pt-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-normal tracking-tight text-black flex items-center gap-2">
            <MessageSquare size={16} />
            <span>Reader's Marginalia ({notes.length})</span>
          </h3>
          <span className="text-xs text-black/50">unmoderated local notes</span>
        </div>

        {/* Existing notes */}
        {notes.length === 0 ? (
          <p className="text-xs text-black/50 italic mb-6">
            No notes on this essay yet. Leave your thought below.
          </p>
        ) : (
          <div className="space-y-4 mb-8">
            {notes.map((n) => (
              <div key={n.id} className="p-4 border border-black/15 bg-neutral-50/50">
                <div className="flex items-center justify-between text-xs text-black/60 mb-1.5 font-mono">
                  <span className="font-medium text-black">{n.name}</span>
                  <span>{n.timestamp}</span>
                </div>
                <p className="text-sm text-black leading-relaxed font-normal">{n.note}</p>
              </div>
            ))}
          </div>
        )}

        {/* Note input form */}
        <form onSubmit={handleAddNote} className="border border-black p-5 space-y-4">
          <div className="text-xs uppercase tracking-wider text-black font-medium">
            Write a Marginal Note
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="reader-name" className="block text-xs text-black/60 mb-1">
                Your Name / Initial
              </label>
              <input
                id="reader-name"
                type="text"
                placeholder="e.g. Maya S."
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="w-full text-xs p-2 bg-white border border-black/30 focus:border-black outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="reader-note" className="block text-xs text-black/60 mb-1">
              Thought or Observation
            </label>
            <textarea
              id="reader-note"
              rows={3}
              placeholder="Reflect on this text..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="w-full text-xs p-2 bg-white border border-black/30 focus:border-black outline-none resize-none"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="submit"
              className="px-4 py-2 bg-black text-white text-xs font-normal hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              Post Note
            </button>
            {noteSubmitted && (
              <span className="text-xs text-black font-mono">Note recorded.</span>
            )}
          </div>
        </form>
      </section>
    </article>
  );
};
