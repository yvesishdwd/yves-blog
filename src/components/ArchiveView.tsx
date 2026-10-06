import React, { useState } from 'react';
import { Article } from '../types.ts';
import { ArrowUpRight } from 'lucide-react';

interface ArchiveViewProps {
  articles: Article[];
  onSelectArticle: (id: string) => void;
}

export const ArchiveView: React.FC<ArchiveViewProps> = ({ articles, onSelectArticle }) => {
  const [filterYear, setFilterYear] = useState<string>('all');

  // Extract years
  const years = ['all', ...Array.from(new Set(articles.map((a) => a.date.split('.')[0])))];

  const filtered = filterYear === 'all'
    ? articles
    : articles.filter((a) => a.date.startsWith(filterYear));

  return (
    <div className="max-w-5xl mx-auto px-6 sm:px-12 py-12 md:py-16">
      <div className="border-b border-black pb-8 mb-10">
        <span className="text-xs uppercase tracking-widest text-black/50 block mb-2 font-mono">
          Catalogue & Archive
        </span>
        <h2 className="text-3xl sm:text-4xl font-normal tracking-tight text-black">
          Chronological Registry
        </h2>
        <p className="mt-2 text-sm text-black/70 max-w-xl font-normal">
          Complete index of all essays, technical notes, and architectural dispatches published by Yves.
        </p>
      </div>

      {/* Year Filter */}
      <div className="flex items-center gap-2 mb-8 text-xs font-mono">
        <span className="text-black/50">Filter by year:</span>
        {years.map((y) => (
          <button
            key={y}
            onClick={() => setFilterYear(y)}
            className={`px-2 py-1 transition-colors cursor-pointer ${
              filterYear === y
                ? 'bg-black text-white font-medium'
                : 'text-black/60 hover:text-black hover:bg-neutral-100'
            }`}
          >
            {y}
          </button>
        ))}
      </div>

      {/* Registry Table */}
      <div className="border border-black overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-black bg-neutral-50 text-black/70 font-mono">
              <th className="py-3 px-4 font-normal">Ref</th>
              <th className="py-3 px-4 font-normal">Date</th>
              <th className="py-3 px-4 font-normal">Title</th>
              <th className="py-3 px-4 font-normal hidden sm:table-cell">Discipline</th>
              <th className="py-3 px-4 font-normal hidden md:table-cell">Duration</th>
              <th className="py-3 px-4 font-normal text-right">Access</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/10">
            {filtered.map((article, index) => {
              const refNum = `YV-${String(index + 1).padStart(3, '0')}`;
              return (
                <tr
                  key={article.id}
                  onClick={() => onSelectArticle(article.id)}
                  className="group hover:bg-neutral-50/80 cursor-pointer transition-colors"
                >
                  <td className="py-3.5 px-4 font-mono text-black/50 tabular-nums">
                    {refNum}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-black/70 tabular-nums">
                    {article.date}
                  </td>
                  <td className="py-3.5 px-4 font-normal text-black group-hover:underline text-sm sm:text-xs">
                    {article.title}
                  </td>
                  <td className="py-3.5 px-4 text-black/70 hidden sm:table-cell font-mono">
                    {article.category}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-black/50 tabular-nums hidden md:table-cell">
                    {article.readTime}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="inline-flex items-center gap-0.5 text-black group-hover:translate-x-0.5 transition-transform font-mono">
                      <span>read</span>
                      <ArrowUpRight size={12} />
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex items-center justify-between text-xs text-black/50 font-mono">
        <span>Total records: {filtered.length}</span>
        <span>Standard ISO 8601 formatting</span>
      </div>
    </div>
  );
};
