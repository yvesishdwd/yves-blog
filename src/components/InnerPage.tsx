import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Article, NoteItem, DeletedItem } from '../types.ts';
import {
  auth,
  db,
  doc,
  setDoc,
  deleteDoc,
  logout,
  onAuthStateChanged,
  collection,
  onSnapshot,
  User,
  AUTHOR_EMAIL,
} from '../firebase.ts';
import { WritingEditor, InitialEditData } from './WritingEditor.tsx';
import { AuthModal } from './AuthModal.tsx';

interface InnerPageProps {
  onBackToCover: () => void;
  defaultArticles: Article[];
  defaultNotes: NoteItem[];
}

type ViewState = 'menu' | 'diary' | 'writing' | 'article' | 'recently_deleted';

// Format helper for **bold** and *italic*
const renderFormattedText = (text: string) => {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, index) => {
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

// Helper to extract 4-digit year from date string (e.g. "2026.10.05 · 16:30" -> "2026")
const getYearFromDate = (dateStr: string): string => {
  if (!dateStr) return new Date().getFullYear().toString();
  const match = dateStr.match(/\b(20\d\d|19\d\d)\b/);
  return match ? match[1] : new Date().getFullYear().toString();
};

export const InnerPage: React.FC<InnerPageProps> = ({
  onBackToCover,
  defaultArticles,
  defaultNotes,
}) => {
  const [view, setView] = useState<ViewState>('menu');
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);

  // Year filter states for writing and diary
  const [selectedWritingYear, setSelectedWritingYear] = useState<string | null>(null);
  const [selectedDiaryYear, setSelectedDiaryYear] = useState<string | null>(null);

  // Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isPasscodeAuthor, setIsPasscodeAuthor] = useState<boolean>(() => {
    return localStorage.getItem('yves_passcode_auth') === 'true';
  });

  const isAuthor = currentUser?.email === AUTHOR_EMAIL || isPasscodeAuthor;

  // Real-time Firestore entries
  const [firestoreNotes, setFirestoreNotes] = useState<NoteItem[]>([]);
  const [firestoreArticles, setFirestoreArticles] = useState<Article[]>([]);
  const [firestoreDeleted, setFirestoreDeleted] = useState<DeletedItem[]>([]);

  // Deleted tracking (to suppress default items when deleted)
  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('yves_deleted_ids');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Local storage entries fallback
  const [localNotes, setLocalNotes] = useState<NoteItem[]>(() => {
    try {
      const saved = localStorage.getItem('yves_local_diary');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [localArticles, setLocalArticles] = useState<Article[]>(() => {
    try {
      const saved = localStorage.getItem('yves_local_writing');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [localDeleted, setLocalDeleted] = useState<DeletedItem[]>(() => {
    try {
      const saved = localStorage.getItem('yves_recently_deleted');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Modal / Editor states
  const [editorType, setEditorType] = useState<'writing' | 'diary' | null>(null);
  const [editingItem, setEditingItem] = useState<InitialEditData | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Listen to Firestore diary_entries
  useEffect(() => {
    try {
      const unsub = onSnapshot(collection(db, 'diary_entries'), (snapshot) => {
        const items: NoteItem[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          items.push({
            id: docSnap.id,
            date: data.date || '',
            text: data.text || '',
            authorEmail: data.authorEmail,
            images: data.images || [],
          });
        });
        items.sort((a, b) => b.date.localeCompare(a.date));
        setFirestoreNotes(items);
      });
      return () => unsub();
    } catch (e) {
      console.warn('Firestore subscription notice:', e);
    }
  }, []);

  // Listen to Firestore writing_articles
  useEffect(() => {
    try {
      const unsub = onSnapshot(collection(db, 'writing_articles'), (snapshot) => {
        const items: Article[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          items.push({
            id: docSnap.id,
            title: data.title || '',
            date: data.date || '',
            category: data.category || 'Essay',
            readTime: data.readTime || '4 min',
            summary: data.summary || '',
            content: data.content || '',
            authorEmail: data.authorEmail,
            images: data.images || [],
          });
        });
        items.sort((a, b) => b.date.localeCompare(a.date));
        setFirestoreArticles(items);
      });
      return () => unsub();
    } catch (e) {
      console.warn('Firestore subscription notice:', e);
    }
  }, []);

  // Listen to Firestore deleted_entries
  useEffect(() => {
    try {
      const unsub = onSnapshot(collection(db, 'deleted_entries'), (snapshot) => {
        const items: DeletedItem[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          items.push({
            id: docSnap.id,
            type: data.type || 'diary',
            title: data.title,
            date: data.date || '',
            text: data.text,
            summary: data.summary,
            content: data.content,
            images: data.images || [],
            deletedAt: data.deletedAt || '',
          });
        });
        items.sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
        setFirestoreDeleted(items);
      });
      return () => unsub();
    } catch (e) {
      console.warn('Firestore subscription notice:', e);
    }
  }, []);

  // Combine all deleted IDs from both Firestore and LocalStorage
  const globalDeletedIds = React.useMemo(() => {
    const ids = new Set<string>(deletedIds);
    firestoreDeleted.forEach((d) => ids.add(d.id));
    return ids;
  }, [deletedIds, firestoreDeleted]);

  // Auto-sync any locally deleted IDs to Firestore so every visitor's device is in sync
  useEffect(() => {
    if (isAuthor && deletedIds.size > 0) {
      deletedIds.forEach(async (id) => {
        try {
          await setDoc(
            doc(db, 'deleted_entries', id),
            {
              id,
              deletedAt: new Date().toISOString(),
              authorSecret: 'ieatandlovetomato444',
            },
            { merge: true }
          );
        } catch {
          // ignore
        }
      });
    }
  }, [isAuthor, deletedIds]);

  // Combine unique notes
  const allNotes = React.useMemo(() => {
    const seen = new Set<string>();
    const combined: NoteItem[] = [];
    [...firestoreNotes, ...localNotes, ...defaultNotes].forEach((n) => {
      if (!seen.has(n.id) && !globalDeletedIds.has(n.id)) {
        seen.add(n.id);
        combined.push(n);
      }
    });
    return combined;
  }, [firestoreNotes, localNotes, defaultNotes, globalDeletedIds]);

  // Combine unique articles
  const allArticles = React.useMemo(() => {
    const seen = new Set<string>();
    const combined: Article[] = [];
    [...firestoreArticles, ...localArticles, ...defaultArticles].forEach((a) => {
      if (!seen.has(a.id) && !globalDeletedIds.has(a.id)) {
        seen.add(a.id);
        combined.push(a);
      }
    });
    return combined;
  }, [firestoreArticles, localArticles, defaultArticles, globalDeletedIds]);

  // Group writings by Year
  const writingYearGroups = React.useMemo(() => {
    const map: Record<string, Article[]> = {};
    allArticles.forEach((art) => {
      const y = getYearFromDate(art.date);
      if (!map[y]) map[y] = [];
      map[y].push(art);
    });
    return Object.keys(map)
      .sort((a, b) => b.localeCompare(a))
      .map((year) => ({
        year,
        items: map[year],
        count: map[year].length,
      }));
  }, [allArticles]);

  // Group diary notes by Year
  const diaryYearGroups = React.useMemo(() => {
    const map: Record<string, NoteItem[]> = {};
    allNotes.forEach((note) => {
      const y = getYearFromDate(note.date);
      if (!map[y]) map[y] = [];
      map[y].push(note);
    });
    return Object.keys(map)
      .sort((a, b) => b.localeCompare(a))
      .map((year) => ({
        year,
        items: map[year],
        count: map[year].length,
      }));
  }, [allNotes]);

  // Filtered articles for selected year
  const filteredArticles = React.useMemo(() => {
    if (!selectedWritingYear) return allArticles;
    return allArticles.filter((art) => getYearFromDate(art.date) === selectedWritingYear);
  }, [allArticles, selectedWritingYear]);

  // Filtered diary notes for selected year
  const filteredNotes = React.useMemo(() => {
    if (!selectedDiaryYear) return allNotes;
    return allNotes.filter((note) => getYearFromDate(note.date) === selectedDiaryYear);
  }, [allNotes, selectedDiaryYear]);

  // Combine recently deleted items
  const allDeleted = React.useMemo(() => {
    const seen = new Set<string>();
    const combined: DeletedItem[] = [];
    [...firestoreDeleted, ...localDeleted].forEach((d) => {
      if (!seen.has(d.id)) {
        seen.add(d.id);
        combined.push(d);
      }
    });
    return combined;
  }, [firestoreDeleted, localDeleted]);

  const selectedArticle = allArticles.find((a) => a.id === selectedArticleId);

  const handleBack = () => {
    if (view === 'article') {
      setView('writing');
    } else if (view === 'writing') {
      if (selectedWritingYear) {
        setSelectedWritingYear(null);
      } else {
        setView('menu');
      }
    } else if (view === 'diary') {
      if (selectedDiaryYear) {
        setSelectedDiaryYear(null);
      } else {
        setView('menu');
      }
    } else if (view === 'recently_deleted') {
      setView('menu');
    } else {
      onBackToCover();
    }
  };

  const handleLogout = async () => {
    await logout();
    setIsPasscodeAuthor(false);
    localStorage.removeItem('yves_passcode_auth');
  };

  const handlePasscodeSuccess = () => {
    setIsPasscodeAuthor(true);
    localStorage.setItem('yves_passcode_auth', 'true');
  };

  // Move diary note to recently deleted
  const handleDeleteNote = async (noteId: string) => {
    const target = allNotes.find((n) => n.id === noteId);
    if (!target) return;
    if (!window.confirm('Move this note to recently deleted?')) return;

    const deletedRecord: DeletedItem = {
      id: target.id,
      type: 'diary',
      date: target.date,
      text: target.text,
      images: target.images || [],
      deletedAt: new Date().toISOString(),
    };

    const updatedDeleted = new Set(deletedIds);
    updatedDeleted.add(noteId);
    setDeletedIds(updatedDeleted);
    localStorage.setItem('yves_deleted_ids', JSON.stringify(Array.from(updatedDeleted)));

    const updatedLocalDeleted = [deletedRecord, ...localDeleted.filter((it) => it.id !== noteId)];
    setLocalDeleted(updatedLocalDeleted);
    localStorage.setItem('yves_recently_deleted', JSON.stringify(updatedLocalDeleted));

    const updatedLocalNotes = localNotes.filter((it) => it.id !== noteId);
    setLocalNotes(updatedLocalNotes);
    localStorage.setItem('yves_local_diary', JSON.stringify(updatedLocalNotes));

    try {
      await setDoc(doc(db, 'deleted_entries', noteId), {
        ...deletedRecord,
        authorSecret: 'ieatandlovetomato444',
      });
      await deleteDoc(doc(db, 'diary_entries', noteId));
    } catch (e) {
      console.warn('Firestore deletion sync:', e);
    }
  };

  // Move article to recently deleted
  const handleDeleteArticle = async (articleId: string) => {
    const target = allArticles.find((a) => a.id === articleId);
    if (!target) return;
    if (!window.confirm('Move this essay to recently deleted?')) return;

    const deletedRecord: DeletedItem = {
      id: target.id,
      type: 'writing',
      title: target.title,
      date: target.date,
      summary: target.summary,
      content: target.content,
      images: target.images || [],
      deletedAt: new Date().toISOString(),
    };

    const updatedDeleted = new Set(deletedIds);
    updatedDeleted.add(articleId);
    setDeletedIds(updatedDeleted);
    localStorage.setItem('yves_deleted_ids', JSON.stringify(Array.from(updatedDeleted)));

    const updatedLocalDeleted = [deletedRecord, ...localDeleted.filter((it) => it.id !== articleId)];
    setLocalDeleted(updatedLocalDeleted);
    localStorage.setItem('yves_recently_deleted', JSON.stringify(updatedLocalDeleted));

    const updatedLocalArticles = localArticles.filter((it) => it.id !== articleId);
    setLocalArticles(updatedLocalArticles);
    localStorage.setItem('yves_local_writing', JSON.stringify(updatedLocalArticles));

    try {
      await setDoc(doc(db, 'deleted_entries', articleId), {
        ...deletedRecord,
        authorSecret: 'ieatandlovetomato444',
      });
      await deleteDoc(doc(db, 'writing_articles', articleId));
    } catch (e) {
      console.warn('Firestore deletion sync:', e);
    }

    if (selectedArticleId === articleId) {
      setSelectedArticleId(null);
      setView('writing');
    }
  };

  // Restore an item from recently deleted
  const handleRestore = async (item: DeletedItem) => {
    const updatedDeleted = new Set(deletedIds);
    updatedDeleted.delete(item.id);
    setDeletedIds(updatedDeleted);
    localStorage.setItem('yves_deleted_ids', JSON.stringify(Array.from(updatedDeleted)));

    const updatedLocalDeleted = localDeleted.filter((it) => it.id !== item.id);
    setLocalDeleted(updatedLocalDeleted);
    localStorage.setItem('yves_recently_deleted', JSON.stringify(updatedLocalDeleted));

    if (item.type === 'diary') {
      const restoredNote: NoteItem = {
        id: item.id,
        date: item.date,
        text: item.text || '',
        images: item.images || [],
      };
      const updatedLocalNotes = [restoredNote, ...localNotes.filter((it) => it.id !== item.id)];
      setLocalNotes(updatedLocalNotes);
      localStorage.setItem('yves_local_diary', JSON.stringify(updatedLocalNotes));

      try {
        await setDoc(doc(db, 'diary_entries', item.id), {
          date: item.date,
          text: item.text || '',
          images: item.images || [],
          authorSecret: 'ieatandlovetomato444',
        });
        await deleteDoc(doc(db, 'deleted_entries', item.id));
      } catch (e) {
        console.warn('Restore sync:', e);
      }
    } else {
      const restoredArticle: Article = {
        id: item.id,
        title: item.title || 'untitled',
        date: item.date,
        readTime: '4 min',
        summary: item.summary || '',
        content: item.content || '',
        images: item.images || [],
      };
      const updatedLocalArticles = [restoredArticle, ...localArticles.filter((it) => it.id !== item.id)];
      setLocalArticles(updatedLocalArticles);
      localStorage.setItem('yves_local_writing', JSON.stringify(updatedLocalArticles));

      try {
        await setDoc(doc(db, 'writing_articles', item.id), {
          title: item.title || 'untitled',
          date: item.date,
          readTime: '4 min',
          summary: item.summary || '',
          content: item.content || '',
          images: item.images || [],
          authorSecret: 'ieatandlovetomato444',
        });
        await deleteDoc(doc(db, 'deleted_entries', item.id));
      } catch (e) {
        console.warn('Restore sync:', e);
      }
    }
  };

  // Permanently delete a single item from trash
  const handlePermanentDelete = async (id: string) => {
    if (!window.confirm('Permanently delete this item? This cannot be undone.')) return;

    const updatedLocalDeleted = localDeleted.filter((it) => it.id !== id);
    setLocalDeleted(updatedLocalDeleted);
    localStorage.setItem('yves_recently_deleted', JSON.stringify(updatedLocalDeleted));

    try {
      await deleteDoc(doc(db, 'deleted_entries', id));
    } catch (e) {
      console.warn('Permanent deletion:', e);
    }
  };

  // Empty all trash
  const handleEmptyTrash = async () => {
    if (!window.confirm('Empty all recently deleted items? This cannot be undone.')) return;

    const idsToDelete = allDeleted.map((it) => it.id);
    setLocalDeleted([]);
    localStorage.removeItem('yves_recently_deleted');

    for (const id of idsToDelete) {
      try {
        await deleteDoc(doc(db, 'deleted_entries', id));
      } catch {
        // ignore
      }
    }
  };

  // Start editing a diary note
  const handleStartEditNote = (note: NoteItem) => {
    setEditingItem({
      id: note.id,
      type: 'diary',
      date: note.date,
      content: note.text,
      images: note.images || [],
    });
    setEditorType('diary');
  };

  // Start editing an article
  const handleStartEditArticle = (art: Article) => {
    const rawContent =
      typeof art.content === 'string'
        ? art.content
        : art.content.map((b) => b.text || '').join('\n\n');

    setEditingItem({
      id: art.id,
      type: 'writing',
      title: art.title,
      date: art.date,
      category: art.category,
      content: rawContent,
      images: art.images || [],
    });
    setEditorType('writing');
  };

  return (
    <div
      className="min-h-screen bg-white text-black flex flex-col justify-between items-center px-6 py-12 selection:bg-black selection:text-white relative lowercase"
      style={{
        fontFamily: 'Arial, sans-serif',
        letterSpacing: 'normal',
      }}
    >
      {/* Invisible spacer for vertical balance */}
      <div className="h-6 w-full" aria-hidden="true" />

      {/* Main Content Area */}
      <main className="w-full flex flex-col items-center my-auto">
        <AnimatePresence mode="wait">
          {/* 1. Main 2-line list */}
          {view === 'menu' && (
            <motion.div
              key="menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col space-y-2 text-[15px] sm:text-base font-normal text-left"
            >
              <button
                onClick={() => {
                  setSelectedDiaryYear(null);
                  setView('diary');
                }}
                className="text-black hover:opacity-40 transition-opacity text-left cursor-pointer"
              >
                diary
              </button>
              <button
                onClick={() => {
                  setSelectedWritingYear(null);
                  setView('writing');
                }}
                className="text-black hover:opacity-40 transition-opacity text-left cursor-pointer"
              >
                writing
              </button>

              {/* Author link to recently deleted */}
              {isAuthor && allDeleted.length > 0 && (
                <button
                  onClick={() => setView('recently_deleted')}
                  className="text-black/35 hover:text-black transition-colors text-left cursor-pointer pt-3 text-[12px]"
                >
                  recently deleted ({allDeleted.length})
                </button>
              )}
            </motion.div>
          )}

          {/* 2. Diary view */}
          {view === 'diary' && (
            <motion.div
              key={`diary-${selectedDiaryYear || 'years'}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md flex flex-col items-start pt-6"
            >
              {/* If no year is selected yet: show column of years: 2026 (x), 2025 (y) */}
              {!selectedDiaryYear ? (
                <div className="w-full flex flex-col items-start">
                  {/* Top author button */}
                  {isAuthor && (
                    <div className="w-full flex justify-end mb-6">
                      <button
                        onClick={() => {
                          setEditingItem(null);
                          setEditorType('diary');
                        }}
                        className="text-[11px] text-black/50 hover:text-black transition-colors cursor-pointer"
                      >
                        + new note
                      </button>
                    </div>
                  )}

                  {/* Column of years with note counts */}
                  {diaryYearGroups.length === 0 ? (
                    <p className="text-[13px] text-black/40 py-2">no notes yet.</p>
                  ) : (
                    <div className="flex flex-col space-y-2 text-[15px] sm:text-base font-normal text-left">
                      {diaryYearGroups.map((group) => (
                        <button
                          key={group.year}
                          onClick={() => setSelectedDiaryYear(group.year)}
                          className="text-black hover:opacity-40 transition-opacity text-left cursor-pointer"
                        >
                          {group.year} ({group.count})
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* When a specific year is clicked: show entries for that year */
                <div className="w-full">
                  {/* Header showing current year and back to years */}
                  <div className="w-full flex justify-between items-center mb-8 text-[12px]">
                    <button
                      onClick={() => setSelectedDiaryYear(null)}
                      className="text-black/50 hover:text-black transition-colors cursor-pointer"
                    >
                      ← {selectedDiaryYear}
                    </button>
                    {isAuthor && (
                      <button
                        onClick={() => {
                          setEditingItem(null);
                          setEditorType('diary');
                        }}
                        className="text-[11px] text-black/50 hover:text-black transition-colors cursor-pointer"
                      >
                        + new note
                      </button>
                    )}
                  </div>

                  <div className="w-full space-y-8 text-[13px] leading-relaxed">
                    {filteredNotes.map((note) => (
                      <article key={note.id} className="space-y-1 group">
                        <div className="flex items-center justify-between text-[12px] text-black/50 font-normal">
                          <span>{note.date}</span>
                          {isAuthor && (
                            <div className="flex items-center gap-2 text-[11px]">
                              <button
                                onClick={() => handleStartEditNote(note)}
                                className="text-black/40 hover:text-black transition-colors cursor-pointer"
                              >
                                edit
                              </button>
                              <span className="text-black/20">·</span>
                              <button
                                onClick={() => handleDeleteNote(note.id)}
                                className="text-black/40 hover:text-red-600 transition-colors cursor-pointer"
                              >
                                delete
                              </button>
                            </div>
                          )}
                        </div>
                        <p className="text-black font-normal whitespace-pre-wrap leading-relaxed">
                          {renderFormattedText(note.text)}
                        </p>
                        {note.images && note.images.length > 0 && (
                          <div className="flex flex-wrap gap-4 pt-3">
                            {note.images.map((img) => (
                              <img
                                key={img.id}
                                src={img.src}
                                alt="note visual"
                                className="max-w-[260px] h-auto block select-none"
                              />
                            ))}
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* 3. Writing view */}
          {view === 'writing' && (
            <motion.div
              key={`writing-${selectedWritingYear || 'years'}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md flex flex-col items-start pt-6"
            >
              {/* If no year is selected yet: show column of years: 2026 (x), 2025 (y) */}
              {!selectedWritingYear ? (
                <div className="w-full flex flex-col items-start">
                  {/* Top author button */}
                  {isAuthor && (
                    <div className="w-full flex justify-end mb-6">
                      <button
                        onClick={() => {
                          setEditingItem(null);
                          setEditorType('writing');
                        }}
                        className="text-[11px] text-black/50 hover:text-black transition-colors cursor-pointer"
                      >
                        + new essay
                      </button>
                    </div>
                  )}

                  {/* Column of years with essay counts */}
                  {writingYearGroups.length === 0 ? (
                    <p className="text-[13px] text-black/40 py-2">no essays yet.</p>
                  ) : (
                    <div className="flex flex-col space-y-2 text-[15px] sm:text-base font-normal text-left">
                      {writingYearGroups.map((group) => (
                        <button
                          key={group.year}
                          onClick={() => setSelectedWritingYear(group.year)}
                          className="text-black hover:opacity-40 transition-opacity text-left cursor-pointer"
                        >
                          {group.year} ({group.count})
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* When a specific year is clicked: show essays for that year */
                <div className="w-full">
                  {/* Header showing current year and back to years */}
                  <div className="w-full flex justify-between items-center mb-8 text-[12px]">
                    <button
                      onClick={() => setSelectedWritingYear(null)}
                      className="text-black/50 hover:text-black transition-colors cursor-pointer"
                    >
                      ← {selectedWritingYear}
                    </button>
                    {isAuthor && (
                      <button
                        onClick={() => {
                          setEditingItem(null);
                          setEditorType('writing');
                        }}
                        className="text-[11px] text-black/50 hover:text-black transition-colors cursor-pointer"
                      >
                        + new essay
                      </button>
                    )}
                  </div>

                  <div className="w-full space-y-3.5 text-[13px]">
                    {filteredArticles.map((art) => (
                      <div
                        key={art.id}
                        className="group flex flex-col sm:flex-row sm:items-baseline justify-between gap-1"
                      >
                        <button
                          onClick={() => {
                            setSelectedArticleId(art.id);
                            setView('article');
                          }}
                          className="text-left text-black hover:opacity-40 transition-opacity cursor-pointer font-normal"
                        >
                          {art.title}
                        </button>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[12px] text-black/50 font-normal">
                            {art.date}
                          </span>
                          {isAuthor && (
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <button
                                onClick={() => handleStartEditArticle(art)}
                                className="text-black/40 hover:text-black transition-colors cursor-pointer"
                              >
                                edit
                              </button>
                              <span className="text-black/20">·</span>
                              <button
                                onClick={() => handleDeleteArticle(art.id)}
                                className="text-black/40 hover:text-red-600 transition-colors cursor-pointer"
                              >
                                delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* 4. Article reading view */}
          {view === 'article' && selectedArticle && (
            <motion.div
              key="article"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-xl flex flex-col items-start pt-6 pb-4"
            >
              <header className="mb-8 w-full">
                <div className="flex items-center justify-between text-[12px] text-black/50 font-normal mb-2">
                  <span>{selectedArticle.date} · {selectedArticle.readTime}</span>
                  {isAuthor && (
                    <div className="flex items-center gap-2.5 text-[11px]">
                      <button
                        onClick={() => handleStartEditArticle(selectedArticle)}
                        className="text-black/40 hover:text-black transition-colors cursor-pointer"
                      >
                        edit essay
                      </button>
                      <span className="text-black/20">·</span>
                      <button
                        onClick={() => handleDeleteArticle(selectedArticle.id)}
                        className="text-black/40 hover:text-red-600 transition-colors cursor-pointer"
                      >
                        delete essay
                      </button>
                    </div>
                  )}
                </div>
                <h1 className="text-xl sm:text-2xl font-normal text-black leading-normal">
                  {selectedArticle.title}
                </h1>
                {selectedArticle.summary && (
                  <p className="mt-2 text-[13px] text-black/60 italic font-normal leading-normal">
                    {selectedArticle.summary}
                  </p>
                )}
              </header>

              {/* Frameless photographs sorted by layer order */}
              {selectedArticle.images && selectedArticle.images.length > 0 && (
                <div className="my-8 w-full space-y-6">
                  {[...selectedArticle.images]
                    .sort((a, b) => (a.zIndex || 10) - (b.zIndex || 10))
                    .map((img) => (
                      <div key={img.id} className="w-full">
                        <img
                          src={img.src}
                          alt="article photograph"
                          className="w-full max-w-lg h-auto block select-none"
                          style={{ width: img.width ? `${img.width}px` : undefined }}
                        />
                      </div>
                    ))}
                </div>
              )}

              <div className="w-full space-y-5 text-[13px] sm:text-sm leading-relaxed text-black/90 font-normal">
                {typeof selectedArticle.content === 'string' ? (
                  selectedArticle.content.split('\n\n').map((para, i) => (
                    <p key={i} className="whitespace-pre-line">
                      {renderFormattedText(para)}
                    </p>
                  ))
                ) : Array.isArray(selectedArticle.content) ? (
                  selectedArticle.content.map((block, idx) => {
                    if (block.type === 'heading') {
                      return (
                        <h3
                          key={idx}
                          className="text-sm sm:text-base font-normal text-black pt-4 pb-1"
                        >
                          {block.text}
                        </h3>
                      );
                    }
                    if (block.type === 'paragraph') {
                      return <p key={idx}>{block.text ? renderFormattedText(block.text) : ''}</p>;
                    }
                    if (block.type === 'quote') {
                      return (
                        <blockquote
                          key={idx}
                          className="my-6 pl-4 border-l border-black italic text-black/80"
                        >
                          "{block.text ? renderFormattedText(block.text) : ''}"
                        </blockquote>
                      );
                    }
                    if (block.type === 'list' && block.items) {
                      return (
                        <ul key={idx} className="my-4 space-y-1.5 pl-0">
                          {block.items.map((it, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-black/40">—</span>
                              <span>{renderFormattedText(it)}</span>
                            </li>
                          ))}
                        </ul>
                      );
                    }
                    return null;
                  })
                ) : null}
              </div>
            </motion.div>
          )}

          {/* 5. Recently Deleted view (Author only) */}
          {view === 'recently_deleted' && (
            <motion.div
              key="recently_deleted"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md flex flex-col items-start pt-6 space-y-6"
            >
              <div className="w-full flex items-center justify-between border-b border-black/10 pb-3">
                <span className="text-[13px] font-normal text-black">
                  recently deleted ({allDeleted.length})
                </span>
                {allDeleted.length > 0 && (
                  <button
                    onClick={handleEmptyTrash}
                    className="text-[11px] text-red-600 hover:opacity-60 transition-opacity cursor-pointer"
                  >
                    empty trash
                  </button>
                )}
              </div>

              {allDeleted.length === 0 ? (
                <p className="text-[12px] text-black/40 py-8">
                  trash is empty.
                </p>
              ) : (
                <div className="w-full space-y-5">
                  {allDeleted.map((item) => (
                    <div
                      key={item.id}
                      className="border-b border-black/10 pb-4 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[11px] text-black/40">
                        <span>
                          {item.type} · {item.date}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleRestore(item)}
                            className="text-black/60 hover:text-black transition-colors cursor-pointer"
                          >
                            restore
                          </button>
                          <span className="text-black/20">·</span>
                          <button
                            onClick={() => handlePermanentDelete(item.id)}
                            className="text-black/40 hover:text-red-600 transition-colors cursor-pointer"
                          >
                            delete permanently
                          </button>
                        </div>
                      </div>
                      <p className="text-[13px] text-black font-normal">
                        {item.type === 'writing'
                          ? item.title
                          : item.text?.slice(0, 120)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Back button at the very bottom of the page: just an arrow icon */}
      <footer className="w-full flex justify-center pt-12 pb-4">
        <button
          onClick={handleBack}
          className="text-black/35 hover:text-black transition-opacity cursor-pointer p-2 flex items-center justify-center"
          aria-label="Go back"
          title="Back"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
      </footer>

      {/* Discreet author auth link in very quiet corner */}
      <div className="fixed bottom-3 right-4 text-[10px] text-black/20 hover:text-black/70 transition-colors flex items-center gap-1.5">
        {isAuthor ? (
          <>
            <button
              onClick={() => setView('recently_deleted')}
              className="hover:underline cursor-pointer"
            >
              trash {allDeleted.length > 0 && `(${allDeleted.length})`}
            </button>
            <span>·</span>
            <span>author</span>
            <span>·</span>
            <button
              onClick={handleLogout}
              className="hover:underline cursor-pointer"
            >
              out
            </button>
          </>
        ) : (
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="hover:underline cursor-pointer"
          >
            auth
          </button>
        )}
      </div>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onPasscodeSuccess={handlePasscodeSuccess}
        isPasscodeAuthor={isPasscodeAuthor}
      />

      {/* Fullscreen Expanded Writing Studio with Edit & Draggable Images */}
      {editorType && (
        <WritingEditor
          isOpen={!!editorType}
          onClose={() => {
            setEditorType(null);
            setEditingItem(null);
            try {
              const ld = localStorage.getItem('yves_local_diary');
              if (ld) setLocalNotes(JSON.parse(ld));
              const lw = localStorage.getItem('yves_local_writing');
              if (lw) setLocalArticles(JSON.parse(lw));
              const lr = localStorage.getItem('yves_recently_deleted');
              if (lr) setLocalDeleted(JSON.parse(lr));
            } catch {
              // ignore
            }
          }}
          type={editorType}
          currentUser={currentUser}
          isPasscodeAuthor={isPasscodeAuthor}
          editData={editingItem}
          onDeleteExisting={async (id, itemType) => {
            if (itemType === 'diary') {
              await handleDeleteNote(id);
            } else {
              await handleDeleteArticle(id);
            }
          }}
        />
      )}
    </div>
  );
};
