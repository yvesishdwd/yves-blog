import React, { useState } from 'react';
import { Article, NoteItem } from '../types.ts';
import { Bookmark, ArrowUpRight, Check } from 'lucide-react';

interface ArticleListProps {
  articles: Article[];
  shortNotes: NoteItem[];
  onSelectArticle: (id: string) => void;
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  onOpenColophon: () => void;
}

export const ArticleList: React.FC<ArticleListProps> = ({
  articles,
  shortNotes,
  onSelectArticle,
  selectedCategory,
  onSelectCategory,
  onOpenColophon,
}) => {
  const [emailInput, setEmailInput] = useState<string>('');
  const [subscribed, setSubscribed] = useState<boolean>(false);
  const [showOnlyBookmarks, setShowOnlyBookmarks] = useState<boolean>(false);

  // Read saved bookmarks
  const savedBookmarks: string[] = (() => {
    try {
      const saved = localStorage.getItem('yves_bookmarks');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  })();

  const categories = ['All', 'Essay', 'Architecture', 'Typography', 'Design', 'Note'];

  const filteredArticles = articles.filter((a) => {
    if (showOnlyBookmarks) {
      return savedBookmarks.includes(a.id);
    }
    if (selectedCategory === 'All') return true;
    return a.category === selectedCategory;
  });

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !emailInput.includes('@')) return;
    setSubscribed(true);
    setEmailInput('');
  };

  return (
    <main className="max-w-5xl mx-auto px-6 sm:px-12 py-12 md:py-16">
      {/* Intro hero banner */}
      <section className="mb-16 border-b border-black pb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="max-w-2xl">
            <span className="text-xs uppercase tracking-widest text-black/50 block mb-3 font-mono">
              Volume IV · Selected Writings
            </span>
            <h2
              className="text-3xl sm:text-5xl font-normal tracking-tight text-black text-balance leading-[1.15]"
              style={{ letterSpacing: '-0.035em' }}
            >
              Essays on form, typography, and deliberate restraint.
            </h2>
            <p className="mt-4 text-sm sm:text-base text-black/70 leading-relaxed font-normal">
              A public archive authored by Yves. Observations on Swiss graphic design, physical materials, architecture in Kyoto, and building artifacts that endure.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end gap-3 text-xs text-black shrink-0">
            <button
              onClick={onOpenColophon}
              className="inline-flex items-center gap-1 hover:underline text-black"
            >
              <span>About the Colophon</span>
              <ArrowUpRight size={12} />
            </button>
            <div className="text-black/50 font-mono">
              <span>{articles.length} published essays</span>
              <span className="mx-1.5">·</span>
              <span>Basel / Zurich</span>
            </div>
          </div>
        </div>
      </section>

      {/* Filter and View Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-4 border-b border-black/15 text-xs">
        {/* Interactive filter tabs */}
        <div className="flex flex-wrap items-center gap-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setShowOnlyBookmarks(false);
                onSelectCategory(cat);
              }}
              className={`px-3 py-1.5 transition-colors cursor-pointer text-xs ${
                !showOnlyBookmarks && selectedCategory === cat
                  ? 'bg-black text-white font-medium'
                  : 'text-black/70 hover:text-black hover:bg-neutral-100'
              }`}
            >
              {cat}
            </button>
          ))}

          {/* Bookmarked filter */}
          <button
            onClick={() => setShowOnlyBookmarks(!showOnlyBookmarks)}
            className={`px-3 py-1.5 ml-2 transition-colors cursor-pointer flex items-center gap-1 text-xs ${
              showOnlyBookmarks
                ? 'bg-black text-white font-medium'
                : 'text-black/70 hover:text-black hover:bg-neutral-100 border border-black/20'
            }`}
          >
            <Bookmark size={12} fill={showOnlyBookmarks ? 'white' : 'none'} />
            <span>Saved ({savedBookmarks.length})</span>
          </button>
        </div>

        <div className="text-xs text-black/50 font-mono tabular-nums">
          Showing {filteredArticles.length} of {articles.length}
        </div>
      </div>

      {/* Main Content Layout: Articles + Short Dispatches */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Articles Column */}
        <div className="lg:col-span-8 space-y-0 divide-y divide-black/15">
          {filteredArticles.length === 0 ? (
            <div className="py-16 text-center text-sm text-black/60">
              {showOnlyBookmarks
                ? 'You have not saved any essays yet. Click "Save" while reading any essay.'
                : 'No essays found in this category.'}
            </div>
          ) : (
            filteredArticles.map((article, index) => {
              const numStr = String(index + 1).padStart(2, '0');
              const isSaved = savedBookmarks.includes(article.id);

              return (
                <article
                  key={article.id}
                  onClick={() => onSelectArticle(article.id)}
                  className="group py-8 first:pt-0 cursor-pointer transition-all duration-150"
                >
                  {/* Clean unboxed metadata with typographic separators (anti-slop zero pill rule) */}
                  <div className="flex items-center gap-2 text-xs text-black/60 mb-2">
                    <span className="font-mono tabular-nums">{numStr}</span>
                    <span aria-hidden="true">/</span>
                    <span className="text-black font-medium">{article.category}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{article.date}</span>
                    <span aria-hidden="true">·</span>
                    <span>{article.readTime}</span>
                    {isSaved && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-black font-mono">saved</span>
                      </>
                    )}
                  </div>

                  {/* Title */}
                  <h3
                    className="text-xl sm:text-2xl font-normal tracking-tight text-black group-hover:underline underline-offset-4 leading-snug"
                    style={{ letterSpacing: '-0.025em' }}
                  >
                    {article.title}
                  </h3>

                  <div className="mt-4 flex items-center gap-1.5 text-xs text-black font-normal opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>Read essay</span>
                    <span aria-hidden="true">→</span>
                  </div>
                </article>
              );
            })
          )}
        </div>

        {/* Sidebar Column: Short Notes & Subscription */}
        <aside className="lg:col-span-4 space-y-10 lg:pl-6 lg:border-l lg:border-black/15">
          {/* Studio Dispatches / Short Notes */}
          <div>
            <div className="flex items-center justify-between border-b border-black pb-2 mb-4">
              <h4 className="text-xs uppercase tracking-widest text-black font-medium">
                Short Notes
              </h4>
              <span className="text-xs text-black/40 font-mono">ephemera</span>
            </div>

            <div className="space-y-5">
              {shortNotes.map((note) => (
                <div key={note.id} className="text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-black/50 font-mono">
                    <span>{note.date}</span>
                    {note.location && <span>{note.location}</span>}
                  </div>
                  <p className="text-sm text-black leading-relaxed font-normal">
                    {note.text}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Minimal Newsletter / Dispatch */}
          <div className="border border-black p-5 bg-neutral-50/60">
            <h4 className="text-xs uppercase tracking-wider text-black font-medium mb-1">
              The Dispatch
            </h4>
            <p className="text-xs text-black/70 leading-relaxed mb-4">
              Occasional letters when a new long-form essay is finished. No spam, no tracking.
            </p>

            {subscribed ? (
              <div className="flex items-center gap-2 text-xs font-mono text-black py-2">
                <Check size={14} />
                <span>Subscribed. Thank you.</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="space-y-2">
                <input
                  type="email"
                  required
                  placeholder="your.email@domain.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border border-black/40 focus:border-black outline-none font-mono"
                />
                <button
                  type="submit"
                  className="w-full py-2 bg-black text-white text-xs font-normal hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  Join Reader Dispatch
                </button>
              </form>
            )}
          </div>

          {/* Quote / Credo */}
          <div className="border-t border-black/15 pt-6 text-xs text-black/60 space-y-2">
            <div className="font-mono text-black/40">CREDO</div>
            <p className="italic text-black/80 leading-relaxed font-normal">
              "Good design is as little design as possible. Less, but better – because it concentrates on the essential aspects."
            </p>
            <div className="text-black/50">— Dieter Rams</div>
          </div>
        </aside>
      </div>
    </main>
  );
};
