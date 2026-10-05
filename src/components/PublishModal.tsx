import React, { useState } from 'react';
import { db, setDoc, doc, AUTHOR_EMAIL } from '../firebase.ts';
import { User } from 'firebase/auth';

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'diary' | 'writing';
  currentUser: User | null;
  isPasscodeAuthor: boolean;
}

export const PublishModal: React.FC<PublishModalProps> = ({
  isOpen,
  onClose,
  type,
  currentUser,
  isPasscodeAuthor,
}) => {
  const isAuthorized = currentUser?.email === AUTHOR_EMAIL || isPasscodeAuthor;

  const todayStr = new Date()
    .toISOString()
    .split('T')[0]
    .replace(/-/g, '.');

  // Form states for diary
  const [diaryDate, setDiaryDate] = useState(todayStr);
  const [diaryLocation, setDiaryLocation] = useState('');
  const [diaryText, setDiaryText] = useState('');

  // Form states for writing
  const [writingTitle, setWritingTitle] = useState('');
  const [writingDate, setWritingDate] = useState(todayStr);
  const [writingCategory, setWritingCategory] = useState('Essay');
  const [writingReadTime, setWritingReadTime] = useState('4 min');
  const [writingSummary, setWritingSummary] = useState('');
  const [writingContent, setWritingContent] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmitDiary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorized) {
      setErrorMsg('Unauthorized: Only author can publish.');
      return;
    }
    if (!diaryText.trim()) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    const docId = `diary-${Date.now()}`;
    const payload = {
      date: diaryDate.trim() || todayStr,
      text: diaryText.trim(),
      location: diaryLocation.trim() || '',
      authorEmail: currentUser?.email || AUTHOR_EMAIL,
      authorSecret: '28092007',
      createdAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'diary_entries', docId), payload);
    } catch (err: unknown) {
      console.warn('Firestore write warning:', err);
      // Also cache in localStorage so author work is never lost
      try {
        const local = localStorage.getItem('yves_local_diary');
        const list = local ? JSON.parse(local) : [];
        list.unshift({ id: docId, ...payload });
        localStorage.setItem('yves_local_diary', JSON.stringify(list));
      } catch {
        // ignore
      }
    }

    setDiaryText('');
    setDiaryLocation('');
    setIsSubmitting(false);
    onClose();
  };

  const handleSubmitWriting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorized) {
      setErrorMsg('Unauthorized: Only author can publish.');
      return;
    }
    if (!writingTitle.trim() || !writingContent.trim()) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    const docId = `article-${Date.now()}`;
    const payload = {
      title: writingTitle.trim(),
      date: writingDate.trim() || todayStr,
      category: writingCategory.trim() || 'Essay',
      readTime: writingReadTime.trim() || '4 min',
      summary: writingSummary.trim() || '',
      content: writingContent.trim(),
      authorEmail: currentUser?.email || AUTHOR_EMAIL,
      authorSecret: '28092007',
      createdAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'writing_articles', docId), payload);
    } catch (err: unknown) {
      console.warn('Firestore write warning:', err);
      try {
        const local = localStorage.getItem('yves_local_writing');
        const list = local ? JSON.parse(local) : [];
        list.unshift({ id: docId, ...payload });
        localStorage.setItem('yves_local_writing', JSON.stringify(list));
      } catch {
        // ignore
      }
    }

    setWritingTitle('');
    setWritingContent('');
    setWritingSummary('');
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/95 backdrop-blur-xs select-none"
      style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white border border-black p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-black pb-3 mb-6">
          <span className="text-[12px] font-normal text-black">
            publish new {type}
          </span>
          <button
            onClick={onClose}
            className="text-[12px] text-black/40 hover:text-black transition-colors cursor-pointer"
          >
            close
          </button>
        </div>

        {!isAuthorized ? (
          <div className="text-[13px] text-black/70 py-6">
            <p>Access restricted.</p>
            <p className="mt-2 text-[11px] text-black/40">
              Only {AUTHOR_EMAIL} is authorized to publish.
            </p>
          </div>
        ) : type === 'diary' ? (
          <form onSubmit={handleSubmitDiary} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-black/40 mb-1">
                  date (YYYY.MM.DD)
                </label>
                <input
                  type="text"
                  value={diaryDate}
                  onChange={(e) => setDiaryDate(e.target.value)}
                  className="w-full text-[13px] p-2 bg-white border border-black/30 focus:border-black outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-black/40 mb-1">
                  location
                </label>
                <input
                  type="text"
                  placeholder="e.g. Zurich"
                  value={diaryLocation}
                  onChange={(e) => setDiaryLocation(e.target.value)}
                  className="w-full text-[13px] p-2 bg-white border border-black/30 focus:border-black outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-black/40 mb-1">
                thought / note
              </label>
              <textarea
                rows={5}
                required
                placeholder="Write your note..."
                value={diaryText}
                onChange={(e) => setDiaryText(e.target.value)}
                className="w-full text-[13px] p-2 bg-white border border-black/30 focus:border-black outline-none resize-none leading-relaxed"
              />
            </div>

            {errorMsg && (
              <div className="text-[11px] text-red-600">{errorMsg}</div>
            )}

            <div className="flex justify-between items-center pt-2">
              <span className="text-[11px] text-black/35 font-mono">
                {currentUser?.email || AUTHOR_EMAIL}
              </span>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-black text-white text-[12px] hover:opacity-80 transition-opacity cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'publishing...' : 'publish'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmitWriting} className="space-y-4">
            <div>
              <label className="block text-[11px] text-black/40 mb-1">
                title
              </label>
              <input
                type="text"
                required
                placeholder="Essay title..."
                value={writingTitle}
                onChange={(e) => setWritingTitle(e.target.value)}
                className="w-full text-[13px] p-2 bg-white border border-black/30 focus:border-black outline-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-black/40 mb-1">
                  date
                </label>
                <input
                  type="text"
                  value={writingDate}
                  onChange={(e) => setWritingDate(e.target.value)}
                  className="w-full text-[13px] p-2 bg-white border border-black/30 focus:border-black outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-black/40 mb-1">
                  category
                </label>
                <input
                  type="text"
                  value={writingCategory}
                  onChange={(e) => setWritingCategory(e.target.value)}
                  className="w-full text-[13px] p-2 bg-white border border-black/30 focus:border-black outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-black/40 mb-1">
                  read time
                </label>
                <input
                  type="text"
                  value={writingReadTime}
                  onChange={(e) => setWritingReadTime(e.target.value)}
                  className="w-full text-[13px] p-2 bg-white border border-black/30 focus:border-black outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-black/40 mb-1">
                summary
              </label>
              <input
                type="text"
                placeholder="One sentence summary..."
                value={writingSummary}
                onChange={(e) => setWritingSummary(e.target.value)}
                className="w-full text-[13px] p-2 bg-white border border-black/30 focus:border-black outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] text-black/40 mb-1">
                essay content
              </label>
              <textarea
                rows={8}
                required
                placeholder="Write your essay paragraphs..."
                value={writingContent}
                onChange={(e) => setWritingContent(e.target.value)}
                className="w-full text-[13px] p-2 bg-white border border-black/30 focus:border-black outline-none resize-none leading-relaxed"
              />
            </div>

            {errorMsg && (
              <div className="text-[11px] text-red-600">{errorMsg}</div>
            )}

            <div className="flex justify-between items-center pt-2">
              <span className="text-[11px] text-black/35 font-mono">
                {currentUser?.email || AUTHOR_EMAIL}
              </span>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-black text-white text-[12px] hover:opacity-80 transition-opacity cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'publishing...' : 'publish'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
