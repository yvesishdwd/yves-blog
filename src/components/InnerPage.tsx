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

interface ParsedNoteDate {
  year: string;
  month: string;
  day: string;
  time: string;
  displayTime: string;
  monthYear: string;
  dayMonth: string;
}

const parseNoteDate = (dateStr: string): ParsedNoteDate => {
  let year = '';
  let month = '';
  let day = '';
  let time = '';

  const timeMatch = dateStr.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (timeMatch) {
    const hours = timeMatch[1].padStart(2, '0');
    const minutes = timeMatch[2];
    time = `${hours}:${minutes}`;
  }

  const yearMatch = dateStr.match(/\b(20\d\d|19\d\d)\b/);
  if (yearMatch) {
    year = yearMatch[1];
  } else {
    year = new Date().getFullYear().toString();
  }

  const ymdMatch = dateStr.match(/(?:20\d\d|19\d\d)[.\-\/](\d{1,2})[.\-\/](\d{1,2})/);
  if (ymdMatch) {
    month = ymdMatch[1].padStart(2, '0');
    day = ymdMatch[2].padStart(2, '0');
  } else {
    const dmyMatch = dateStr.match(/(\d{1,2})[.\-\/](\d{1,2})[.\-\/](?:20\d\d|19\d\d)/);
    if (dmyMatch) {
      day = dmyMatch[1].padStart(2, '0');
      month = dmyMatch[2].padStart(2, '0');
    } else {
      const dmMatch = dateStr.match(/(\d{1,2})[.\-\/](\d{1,2})/);
      if (dmMatch) {
        day = dmMatch[1].padStart(2, '0');
        month = dmMatch[2].padStart(2, '0');
      } else {
        month = '01';
        day = '01';
      }
    }
  }

  const displayTime = time ? time.replace(/^0/, '') : '';

  return {
    year,
    month,
    day,
    time: time || '',
    displayTime,
    monthYear: `${month} ${year}`,
    dayMonth: `${day}/${month}`,
  };
};

export const InnerPage: React.FC<InnerPageProps> = ({
  onBackToCover,
  defaultArticles,
  defaultNotes,
}) => {
  const [view, setView] = useState<ViewState>('menu');
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);

  // Year & Month filter states for writing and diary
  const [selectedWritingYear, setSelectedWritingYear] = useState<string | null>(null);
  const [selectedDiaryYear, setSelectedDiaryYear] = useState<string | null>(null);
  const [selectedDiaryMonth, setSelectedDiaryMonth] = useState<string | null>(null);

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

  // Permanently deleted tracking (never resurrect, never restore to trash or lists)
  const [permanentlyDeletedIds, setPermanentlyDeletedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('yves_permanently_deleted');
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
            blocks: data.blocks || [],
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
            blocks: data.blocks || [],
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
            blocks: data.blocks || [],
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
    permanentlyDeletedIds.forEach((id) => ids.add(id));
    return ids;
  }, [deletedIds, firestoreDeleted, permanentlyDeletedIds]);

  // Auto-sync any locally deleted IDs to Firestore so every visitor's device is in sync
  useEffect(() => {
    if (isAuthor && deletedIds.size > 0) {
      deletedIds.forEach(async (id) => {
        // Do not resurrect if permanently deleted
        if (permanentlyDeletedIds.has(id)) return;
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
  }, [isAuthor, deletedIds, permanentlyDeletedIds]);

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

  // Group diary notes by Month within selected year
  interface DayGroup {
    dayMonth: string;
    notes: {
      note: NoteItem;
      time: string;
      displayTime: string;
    }[];
  }

  interface MonthGroup {
    monthYear: string;
    days: DayGroup[];
    totalCount: number;
  }

  const diaryMonthGroups = React.useMemo((): MonthGroup[] => {
    if (!selectedDiaryYear) return [];
    const yearNotes = allNotes.filter((n) => getYearFromDate(n.date) === selectedDiaryYear);

    const monthMap: Record<string, NoteItem[]> = {};
    yearNotes.forEach((n) => {
      const parsed = parseNoteDate(n.date);
      if (!monthMap[parsed.monthYear]) monthMap[parsed.monthYear] = [];
      monthMap[parsed.monthYear].push(n);
    });

    return Object.keys(monthMap)
      .sort((a, b) => b.localeCompare(a))
      .map((monthYear) => {
        const notes = monthMap[monthYear];
        const dayMap: Record<string, { note: NoteItem; time: string; displayTime: string }[]> = {};
        notes.forEach((note) => {
          const parsed = parseNoteDate(note.date);
          if (!dayMap[parsed.dayMonth]) dayMap[parsed.dayMonth] = [];
          dayMap[parsed.dayMonth].push({
            note,
            time: parsed.time,
            displayTime: parsed.displayTime,
          });
        });

        const days: DayGroup[] = Object.keys(dayMap)
          .sort((a, b) => a.localeCompare(b))
          .map((dayMonth) => {
            const sortedNotes = dayMap[dayMonth].sort((a, b) => a.time.localeCompare(b.time));
            return {
              dayMonth,
              notes: sortedNotes,
            };
          });

        return {
          monthYear,
          days,
          totalCount: notes.length,
        };
      });
  }, [allNotes, selectedDiaryYear]);

  const currentActiveMonthGroup = React.useMemo(() => {
    if (!selectedDiaryMonth) return null;
    return diaryMonthGroups.find((g) => g.monthYear === selectedDiaryMonth) || null;
  }, [diaryMonthGroups, selectedDiaryMonth]);

  // Filtered articles for selected year
  const filteredArticles = React.useMemo(() => {
    if (!selectedWritingYear) return allArticles;
    return allArticles.filter((art) => getYearFromDate(art.date) === selectedWritingYear);
  }, [allArticles, selectedWritingYear]);

  // Combine recently deleted items (excluding permanently deleted)
  const allDeleted = React.useMemo(() => {
    const seen = new Set<string>();
    const combined: DeletedItem[] = [];
    [...firestoreDeleted, ...localDeleted].forEach((d) => {
      if (!seen.has(d.id) && !permanentlyDeletedIds.has(d.id)) {
        seen.add(d.id);
        combined.push(d);
      }
    });
    return combined;
  }, [firestoreDeleted, localDeleted, permanentlyDeletedIds]);

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
      if (selectedDiaryMonth) {
        setSelectedDiaryMonth(null);
      } else if (selectedDiaryYear) {
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

  const safeSetLocal = (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn(`LocalStorage write skipped for ${key}:`, e);
      try {
        localStorage.removeItem('yves_recently_deleted');
        localStorage.setItem(key, value);
      } catch {
        // Safe fallback
      }
    }
  };

  const handlePasscodeSuccess = () => {
    setIsPasscodeAuthor(true);
    safeSetLocal('yves_passcode_auth', 'true');
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
    safeSetLocal('yves_deleted_ids', JSON.stringify(Array.from(updatedDeleted)));

    const updatedLocalDeleted = [deletedRecord, ...localDeleted.filter((it) => it.id !== noteId)];
    setLocalDeleted(updatedLocalDeleted);
    safeSetLocal('yves_recently_deleted', JSON.stringify(updatedLocalDeleted));

    const updatedLocalNotes = localNotes.filter((it) => it.id !== noteId);
    setLocalNotes(updatedLocalNotes);
    safeSetLocal('yves_local_diary', JSON.stringify(updatedLocalNotes));

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
    safeSetLocal('yves_deleted_ids', JSON.stringify(Array.from(updatedDeleted)));

    const updatedLocalDeleted = [deletedRecord, ...localDeleted.filter((it) => it.id !== articleId)];
    setLocalDeleted(updatedLocalDeleted);
    safeSetLocal('yves_recently_deleted', JSON.stringify(updatedLocalDeleted));

    const updatedLocalArticles = localArticles.filter((it) => it.id !== articleId);
    setLocalArticles(updatedLocalArticles);
    safeSetLocal('yves_local_writing', JSON.stringify(updatedLocalArticles));

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
    // Unmark from permanently deleted if present
    const nextPerm = new Set(permanentlyDeletedIds);
    nextPerm.delete(item.id);
    setPermanentlyDeletedIds(nextPerm);
    safeSetLocal('yves_permanently_deleted', JSON.stringify(Array.from(nextPerm)));

    const updatedDeleted = new Set(deletedIds);
    updatedDeleted.delete(item.id);
    setDeletedIds(updatedDeleted);
    safeSetLocal('yves_deleted_ids', JSON.stringify(Array.from(updatedDeleted)));

    const updatedLocalDeleted = localDeleted.filter((it) => it.id !== item.id);
    setLocalDeleted(updatedLocalDeleted);
    safeSetLocal('yves_recently_deleted', JSON.stringify(updatedLocalDeleted));

    if (item.type === 'diary') {
      const restoredNote: NoteItem = {
        id: item.id,
        date: item.date,
        text: item.text || '',
        images: item.images || [],
      };
      const updatedLocalNotes = [restoredNote, ...localNotes.filter((it) => it.id !== item.id)];
      setLocalNotes(updatedLocalNotes);
      safeSetLocal('yves_local_diary', JSON.stringify(updatedLocalNotes));

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
      safeSetLocal('yves_local_writing', JSON.stringify(updatedLocalArticles));

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

    // 1. Mark permanently deleted so it's instantly hidden and never resurrected
    const nextPerm = new Set(permanentlyDeletedIds);
    nextPerm.add(id);
    setPermanentlyDeletedIds(nextPerm);
    safeSetLocal('yves_permanently_deleted', JSON.stringify(Array.from(nextPerm)));

    // 2. Remove from deletedIds (stops auto-sync re-creation)
    const nextDeleted = new Set(deletedIds);
    nextDeleted.delete(id);
    setDeletedIds(nextDeleted);
    safeSetLocal('yves_deleted_ids', JSON.stringify(Array.from(nextDeleted)));

    // 3. Remove from local deleted state & storage
    const updatedLocalDeleted = localDeleted.filter((it) => it.id !== id);
    setLocalDeleted(updatedLocalDeleted);
    safeSetLocal('yves_recently_deleted', JSON.stringify(updatedLocalDeleted));

    // 4. Purge from local diary / writing backups
    const updatedLocalNotes = localNotes.filter((it) => it.id !== id);
    setLocalNotes(updatedLocalNotes);
    safeSetLocal('yves_local_diary', JSON.stringify(updatedLocalNotes));

    const updatedLocalArticles = localArticles.filter((it) => it.id !== id);
    setLocalArticles(updatedLocalArticles);
    safeSetLocal('yves_local_writing', JSON.stringify(updatedLocalArticles));

    // 5. Delete permanently from all Firestore collections
    try {
      await Promise.allSettled([
        deleteDoc(doc(db, 'deleted_entries', id)),
        deleteDoc(doc(db, 'diary_entries', id)),
        deleteDoc(doc(db, 'writing_articles', id)),
      ]);
    } catch (e) {
      console.warn('Permanent deletion:', e);
    }
  };

  // Empty all trash
  const handleEmptyTrash = async () => {
    if (!window.confirm('Empty all recently deleted items? This cannot be undone.')) return;

    const idsToDelete = allDeleted.map((it) => it.id);
    if (idsToDelete.length === 0) return;

    // 1. Mark all permanently deleted so they vanish instantly and never resurrect
    const nextPerm = new Set(permanentlyDeletedIds);
    idsToDelete.forEach((id) => nextPerm.add(id));
    setPermanentlyDeletedIds(nextPerm);
    safeSetLocal('yves_permanently_deleted', JSON.stringify(Array.from(nextPerm)));

    // 2. Remove all from deletedIds (stops auto-sync re-creation)
    const nextDeleted = new Set(deletedIds);
    idsToDelete.forEach((id) => nextDeleted.delete(id));
    setDeletedIds(nextDeleted);
    safeSetLocal('yves_deleted_ids', JSON.stringify(Array.from(nextDeleted)));

    // 3. Clear local deleted state & storage
    setLocalDeleted([]);
    try {
      localStorage.removeItem('yves_recently_deleted');
    } catch {
      // ignore
    }

    // 4. Purge from local diary / writing backups
    const updatedLocalNotes = localNotes.filter((it) => !idsToDelete.includes(it.id));
    setLocalNotes(updatedLocalNotes);
    safeSetLocal('yves_local_diary', JSON.stringify(updatedLocalNotes));

    const updatedLocalArticles = localArticles.filter((it) => !idsToDelete.includes(it.id));
    setLocalArticles(updatedLocalArticles);
    safeSetLocal('yves_local_writing', JSON.stringify(updatedLocalArticles));

    // 5. Delete all permanently from Firestore
    try {
      await Promise.allSettled(
        idsToDelete.flatMap((id) => [
          deleteDoc(doc(db, 'deleted_entries', id)),
          deleteDoc(doc(db, 'diary_entries', id)),
          deleteDoc(doc(db, 'writing_articles', id)),
        ])
      );
    } catch (e) {
      console.warn('Empty trash firestore sync:', e);
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
      blocks: note.blocks,
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
      blocks: art.blocks,
    });
    setEditorType('writing');
  };

  return (
    <div
      className="min-h-screen bg-white text-black flex flex-col justify-between items-center px-6 py-12 selection:bg-black selection:text-white relative"
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
              key={`diary-${selectedDiaryYear || 'years'}-${selectedDiaryMonth || 'months'}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`w-full ${!selectedDiaryMonth ? 'max-w-md items-center' : 'max-w-2xl sm:max-w-3xl items-start'} flex flex-col pt-6 mx-auto`}
            >
              {/* Level 1: If no year is selected yet: show column of years centered */}
              {!selectedDiaryYear ? (
                <div className="w-full flex flex-col items-center justify-center text-center">
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

                  {/* Column of years without note counts */}
                  {diaryYearGroups.length === 0 ? (
                    <p className="text-[13px] text-black/40 py-2">no notes yet.</p>
                  ) : (
                    <div className="flex flex-col space-y-2.5 text-[15px] sm:text-base font-normal text-center items-center">
                      {diaryYearGroups.map((group) => (
                        <button
                          key={group.year}
                          onClick={() => {
                            setSelectedDiaryYear(group.year);
                            setSelectedDiaryMonth(null);
                          }}
                          className="text-black hover:opacity-40 transition-opacity text-center cursor-pointer"
                        >
                          {group.year}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : !selectedDiaryMonth ? (
                /* Level 2: When a specific year is clicked: show months list centered without count: e.g. "10 2026" */
                <div className="w-full max-w-md mx-auto flex flex-col items-center">
                  {/* Header showing back to years and new note */}
                  <div className="w-full flex justify-between items-center mb-8 text-[12px]">
                    <button
                      onClick={() => {
                        setSelectedDiaryYear(null);
                        setSelectedDiaryMonth(null);
                      }}
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

                  {diaryMonthGroups.length === 0 ? (
                    <p className="text-[13px] text-black/40 py-2">no notes yet.</p>
                  ) : (
                    <div className="flex flex-col space-y-3.5 text-[15px] sm:text-base font-normal text-center w-full items-center">
                      {diaryMonthGroups.map((group) => (
                        <button
                          key={group.monthYear}
                          onClick={() => setSelectedDiaryMonth(group.monthYear)}
                          className="text-black hover:opacity-40 transition-opacity text-center cursor-pointer"
                        >
                          {group.monthYear}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Level 3: Merged monthly diary: "1 bài cuộn dài ơi là dài" labeled e.g. "10 2026" */
                <div className="w-full max-w-[640px] mx-auto">
                  {/* Header showing back to months list and new note */}
                  <div className="w-full flex justify-between items-center mb-8 text-[12px]">
                    <button
                      onClick={() => setSelectedDiaryMonth(null)}
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

                  {/* Long scrolling merged notes by day and time */}
                  {!currentActiveMonthGroup || currentActiveMonthGroup.days.length === 0 ? (
                    <p className="text-[13px] text-black/40 py-4">no notes this month.</p>
                  ) : (
                    <div className="w-full space-y-8">
                      {currentActiveMonthGroup.days.map((dayGroup) => (
                        <section key={dayGroup.dayMonth} className="w-full space-y-3">
                          {/* Day date: e.g. "06/10" in normal font size, normal text color, no line page break */}
                          <div className="text-[13px] font-normal text-black">
                            {dayGroup.dayMonth}
                          </div>

                          {/* Notes for this day, ordered progressively by time */}
                          <div className="w-full space-y-6">
                            {dayGroup.notes.map(({ note, displayTime, time }) => (
                              <article key={note.id} className="space-y-1 group">
                                <div className="flex items-center justify-between text-[12px] text-black/50 font-normal">
                                  <span>{displayTime || time || note.date}</span>
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

                                {/* Render interleaved blocks or legacy content */}
                                {note.blocks && note.blocks.length > 0 ? (
                                  <div className="flex flex-col gap-[1.6em] w-full">
                                    {note.blocks.map((block) => {
                                      if (block.type === 'text') {
                                        if (!block.text.trim()) return null;
                                        return (
                                          <p
                                            key={block.id}
                                            className="text-black font-normal whitespace-pre-wrap leading-[1.6] text-[13px] sm:text-[14px]"
                                          >
                                            {renderFormattedText(block.text)}
                                          </p>
                                        );
                                      }

                                      if (block.type === 'image' && block.image) {
                                        const img = block.image;
                                        const alignClass =
                                          img.alignment === 'center'
                                            ? 'mx-auto'
                                            : img.alignment === 'right'
                                            ? 'ml-auto mr-0'
                                            : 'mr-auto ml-0';

                                        const widthStyle =
                                          img.width === 50
                                            ? '50%'
                                            : img.width === 75
                                            ? '75%'
                                            : typeof img.width === 'number' && img.width > 0 && img.width <= 100
                                            ? `${img.width}%`
                                            : '100%';

                                        return (
                                          <div
                                            key={block.id}
                                            className="w-full flex overflow-hidden"
                                          >
                                            <img
                                              src={img.src}
                                              alt="note visual"
                                              className={`h-auto block select-none max-w-full ${alignClass}`}
                                              style={{
                                                width: widthStyle,
                                                maxWidth: '100%',
                                              }}
                                            />
                                          </div>
                                        );
                                      }

                                      return null;
                                    })}
                                  </div>
                                ) : (
                                  <>
                                    <p className="text-black font-normal whitespace-pre-wrap leading-[1.6] text-[13px] sm:text-[14px]">
                                      {renderFormattedText(note.text)}
                                    </p>
                                    {note.images && note.images.length > 0 && (
                                      <div className="mt-[1.6em] space-y-[1.6em] w-full">
                                        {note.images
                                          .slice()
                                          .sort((a, b) => (a.zIndex || 10) - (b.zIndex || 10))
                                          .map((img) => {
                                            const alignClass =
                                              img.alignment === 'center'
                                                ? 'mx-auto'
                                                : img.alignment === 'right'
                                                ? 'ml-auto mr-0'
                                                : 'mr-auto ml-0';

                                            const widthStyle =
                                              img.width === 50
                                                ? '50%'
                                                : img.width === 75
                                                ? '75%'
                                                : typeof img.width === 'number' && img.width > 0 && img.width <= 100
                                                ? `${img.width}%`
                                                : '100%';

                                            return (
                                              <div
                                                key={img.id}
                                                className="w-full flex overflow-hidden"
                                              >
                                                <img
                                                  src={img.src}
                                                  alt="note visual"
                                                  className={`h-auto block select-none max-w-full ${alignClass}`}
                                                  style={{
                                                    width: widthStyle,
                                                    maxWidth: '100%',
                                                  }}
                                                />
                                              </div>
                                            );
                                          })}
                                      </div>
                                    )}
                                  </>
                                )}
                              </article>
                            ))}
                          </div>
                        </section>
                      ))}
                    </div>
                  )}
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
              className={`w-full ${!selectedWritingYear ? 'max-w-md items-center' : 'max-w-md items-start'} flex flex-col pt-6 mx-auto`}
            >
              {/* If no year is selected yet: show column of years centered */}
              {!selectedWritingYear ? (
                <div className="w-full flex flex-col items-center justify-center text-center">
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

                  {/* Column of years without count */}
                  {writingYearGroups.length === 0 ? (
                    <p className="text-[13px] text-black/40 py-2">no essays yet.</p>
                  ) : (
                    <div className="flex flex-col space-y-2.5 text-[15px] sm:text-base font-normal text-center items-center">
                      {writingYearGroups.map((group) => (
                        <button
                          key={group.year}
                          onClick={() => setSelectedWritingYear(group.year)}
                          className="text-black hover:opacity-40 transition-opacity text-center cursor-pointer"
                        >
                          {group.year}
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
              className="w-full max-w-[640px] flex flex-col items-start pt-6 pb-4 mx-auto"
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
              </header>

              {/* Render interleaved blocks or legacy content */}
              {selectedArticle.blocks && selectedArticle.blocks.length > 0 ? (
                <div className="flex flex-col gap-[1.6em] w-full">
                  {selectedArticle.blocks.map((block) => {
                    if (block.type === 'text') {
                      if (!block.text.trim()) return null;
                      return (
                        <p
                          key={block.id}
                          className="text-black font-normal whitespace-pre-wrap leading-[1.6] text-[13px] sm:text-[14px]"
                        >
                          {renderFormattedText(block.text)}
                        </p>
                      );
                    }

                    if (block.type === 'image' && block.image) {
                      const img = block.image;
                      const alignClass =
                        img.alignment === 'center'
                          ? 'mx-auto'
                          : img.alignment === 'right'
                          ? 'ml-auto mr-0'
                          : 'mr-auto ml-0';

                      const widthStyle =
                        img.width === 50
                          ? '50%'
                          : img.width === 75
                          ? '75%'
                          : typeof img.width === 'number' && img.width > 0 && img.width <= 100
                          ? `${img.width}%`
                          : '100%';

                      return (
                        <div key={block.id} className="w-full flex overflow-hidden">
                          <img
                            src={img.src}
                            alt="article photograph"
                            className={`h-auto block select-none max-w-full ${alignClass}`}
                            style={{
                              width: widthStyle,
                              maxWidth: '100%',
                            }}
                          />
                        </div>
                      );
                    }

                    return null;
                  })}
                </div>
              ) : (
                <>
                  {/* Frameless photographs strictly bounded within left and right margins */}
                  {selectedArticle.images && selectedArticle.images.length > 0 && (
                    <div className="my-[1.6em] flex flex-col gap-[1.6em] w-full">
                      {[...selectedArticle.images]
                        .sort((a, b) => (a.zIndex || 10) - (b.zIndex || 10))
                        .map((img) => {
                          const alignClass =
                            img.alignment === 'center'
                              ? 'mx-auto'
                              : img.alignment === 'right'
                              ? 'ml-auto mr-0'
                              : 'mr-auto ml-0';

                          const widthStyle =
                            img.width === 50
                              ? '50%'
                              : img.width === 75
                              ? '75%'
                              : typeof img.width === 'number' && img.width > 0 && img.width <= 100
                              ? `${img.width}%`
                              : '100%';

                          return (
                            <div key={img.id} className="w-full flex overflow-hidden">
                              <img
                                src={img.src}
                                alt="article photograph"
                                className={`h-auto block select-none max-w-full ${alignClass}`}
                                style={{
                                  width: widthStyle,
                                  maxWidth: '100%',
                                }}
                              />
                            </div>
                          );
                        })}
                    </div>
                  )}

                  <div className="w-full flex flex-col gap-[1.6em] text-[13px] sm:text-sm leading-[1.6] text-black/90 font-normal">
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
                              className="my-6 pl-4 border-l border-black text-black/80 font-normal not-italic"
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
                </>
              )}
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
