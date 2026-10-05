import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db, setDoc, doc, AUTHOR_EMAIL } from '../firebase.ts';
import { User } from 'firebase/auth';
import { CanvasImage } from '../types.ts';

export interface InitialEditData {
  id: string;
  type: 'writing' | 'diary';
  title?: string;
  date?: string;
  category?: string;
  content: string;
  images?: CanvasImage[];
}

interface WritingEditorProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'writing' | 'diary';
  currentUser: User | null;
  isPasscodeAuthor: boolean;
  editData?: InitialEditData | null;
  onDeleteExisting?: (id: string, type: 'writing' | 'diary') => Promise<void>;
}

export const WritingEditor: React.FC<WritingEditorProps> = ({
  isOpen,
  onClose,
  type,
  currentUser,
  isPasscodeAuthor,
  editData,
  onDeleteExisting,
}) => {
  const isAuthorized = currentUser?.email === AUTHOR_EMAIL || isPasscodeAuthor;

  // Format date and time: YYYY.MM.DD · HH:mm
  const formatCurrentDateTime = () => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())} · ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  };

  const [editorType, setEditorType] = useState<'writing' | 'diary'>(
    editData?.type || type
  );
  const [title, setTitle] = useState(editData?.title || '');
  const [dateTime, setDateTime] = useState(
    editData?.date || formatCurrentDateTime()
  );
  const [content, setContent] = useState(editData?.content || '');
  const [images, setImages] = useState<CanvasImage[]>(editData?.images || []);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync state if editData changes
  useEffect(() => {
    if (editData) {
      setEditorType(editData.type);
      setTitle(editData.title || '');
      setDateTime(editData.date || formatCurrentDateTime());
      setContent(editData.content || '');
      setImages(editData.images || []);
    } else {
      setEditorType(type);
      setTitle('');
      setDateTime(formatCurrentDateTime());
      setContent('');
      setImages([]);
    }
  }, [editData, type]);

  if (!isOpen) return null;

  // Format helper for Bold & Italic
  const applyFormatting = (tag: 'bold' | 'italic') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const wrapper = tag === 'bold' ? '**' : '*';

    let replacement = '';
    if (selectedText.length > 0) {
      if (
        selectedText.startsWith(wrapper) &&
        selectedText.endsWith(wrapper) &&
        selectedText.length >= wrapper.length * 2
      ) {
        replacement = selectedText.slice(wrapper.length, -wrapper.length);
      } else {
        replacement = `${wrapper}${selectedText}${wrapper}`;
      }
    } else {
      replacement = tag === 'bold' ? '**bold text**' : '*italic text*';
    }

    const newContent =
      content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + wrapper.length,
        start + replacement.length - wrapper.length
      );
    }, 0);
  };

  // Keyboard shortcut for Cmd/Ctrl+B and Cmd/Ctrl+I
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.metaKey || e.ctrlKey) {
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        applyFormatting('bold');
      } else if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        applyFormatting('italic');
      }
    }
  };

  // Handle image upload & compression
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const offscreen = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 850;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        offscreen.width = width;
        offscreen.height = height;
        const ctx = offscreen.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = offscreen.toDataURL('image/jpeg', 0.82);

          const maxLayer = images.reduce(
            (max, item) => Math.max(max, item.zIndex || 10),
            10
          );

          const newImg: CanvasImage = {
            id: `img-${Date.now()}`,
            src: dataUrl,
            x: Math.min(40 + images.length * 25, 200),
            y: Math.min(160 + images.length * 35, 450),
            width: 280,
            zIndex: maxLayer + 1,
          };
          setImages((prev) => [...prev, newImg]);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  const resizeImage = (id: string, delta: number) => {
    setImages((prev) =>
      prev.map((img) => {
        if (img.id !== id) return img;
        const newW = Math.max(120, Math.min(650, (img.width || 280) + delta));
        return { ...img, width: newW };
      })
    );
  };

  const adjustLayer = (id: string, direction: 'up' | 'down') => {
    setImages((prev) =>
      prev.map((img) => {
        if (img.id !== id) return img;
        const currentZ = img.zIndex || 10;
        const newZ = direction === 'up' ? currentZ + 1 : Math.max(1, currentZ - 1);
        return { ...img, zIndex: newZ };
      })
    );
  };

  // Discard draft or delete published item
  const handleDeleteOrDiscard = async () => {
    if (editData && onDeleteExisting) {
      if (window.confirm('Delete this entry permanently?')) {
        await onDeleteExisting(editData.id, editData.type);
        onClose();
      }
    } else {
      if (window.confirm('Discard what you wrote?')) {
        setTitle('');
        setContent('');
        setImages([]);
        onClose();
      }
    }
  };

  const handlePublish = async () => {
    if (!isAuthorized) {
      setStatusMessage('Unauthorized: Only author can publish.');
      return;
    }

    if (editorType === 'writing' && (!title.trim() || !content.trim())) {
      setStatusMessage('Please enter a title and text before publishing.');
      return;
    }

    if (editorType === 'diary' && !content.trim()) {
      setStatusMessage('Please write your note before publishing.');
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    const authorEmail = currentUser?.email || AUTHOR_EMAIL;

    try {
      if (editorType === 'diary') {
        const docId = editData ? editData.id : `diary-${Date.now()}`;
        const payload = {
          date: dateTime.trim() || formatCurrentDateTime(),
          text: content.trim(),
          images: images.map((img) => ({
            id: img.id,
            src: img.src,
            x: Math.round(img.x),
            y: Math.round(img.y),
            width: img.width || 280,
            zIndex: img.zIndex || 10,
          })),
          authorEmail,
          authorSecret: 'ieatandlovetomato444',
          updatedAt: new Date().toISOString(),
        };

        try {
          await setDoc(doc(db, 'diary_entries', docId), payload, { merge: true });
        } catch (dbErr) {
          console.warn('Firestore fallback to local:', dbErr);
          const local = localStorage.getItem('yves_local_diary');
          let list = local ? JSON.parse(local) : [];
          list = list.filter((it: { id: string }) => it.id !== docId);
          list.unshift({ id: docId, ...payload });
          localStorage.setItem('yves_local_diary', JSON.stringify(list));
        }
      } else {
        const docId = editData ? editData.id : `article-${Date.now()}`;
        const payload = {
          title: title.trim(),
          date: dateTime.trim() || formatCurrentDateTime(),
          readTime: `${Math.max(1, Math.round(content.split(/\s+/).length / 200))} min`,
          summary: content.slice(0, 140).replace(/\n/g, ' ') + '...',
          content: content.trim(),
          images: images.map((img) => ({
            id: img.id,
            src: img.src,
            x: Math.round(img.x),
            y: Math.round(img.y),
            width: img.width || 280,
            zIndex: img.zIndex || 10,
          })),
          authorEmail,
          authorSecret: 'ieatandlovetomato444',
          updatedAt: new Date().toISOString(),
        };

        try {
          await setDoc(doc(db, 'writing_articles', docId), payload, { merge: true });
        } catch (dbErr) {
          console.warn('Firestore fallback to local:', dbErr);
          const local = localStorage.getItem('yves_local_writing');
          let list = local ? JSON.parse(local) : [];
          list = list.filter((it: { id: string }) => it.id !== docId);
          list.unshift({ id: docId, ...payload });
          localStorage.setItem('yves_local_writing', JSON.stringify(list));
        }
      }

      setIsSubmitting(false);
      onClose();
    } catch (err: unknown) {
      console.error(err);
      setIsSubmitting(false);
      setStatusMessage(err instanceof Error ? err.message : 'Error publishing');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 bg-white text-black flex flex-col selection:bg-black selection:text-white lowercase"
      style={{
        fontFamily: 'Arial, sans-serif',
        letterSpacing: 'normal',
      }}
    >
      {/* Top Studio Control Bar */}
      <header className="w-full flex items-center justify-between px-6 sm:px-12 py-5 border-b border-black/10 shrink-0">
        <div className="flex items-center gap-6">
          <button
            onClick={onClose}
            className="text-[12px] text-black/50 hover:text-black transition-colors cursor-pointer"
          >
            ← close
          </button>

          {/* Section selector */}
          <div className="flex items-center gap-3 text-[12px]">
            <button
              onClick={() => {
                setEditorType('writing');
              }}
              className={`transition-colors cursor-pointer ${
                editorType === 'writing'
                  ? 'text-black font-medium border-b border-black pb-0.5'
                  : 'text-black/40 hover:text-black'
              }`}
            >
              writing
            </button>
            <span className="text-black/20">/</span>
            <button
              onClick={() => {
                setEditorType('diary');
              }}
              className={`transition-colors cursor-pointer ${
                editorType === 'diary'
                  ? 'text-black font-medium border-b border-black pb-0.5'
                  : 'text-black/40 hover:text-black'
              }`}
            >
              diary
            </button>
          </div>
        </div>

        {/* Minimal Formatting & Actions */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Bold & Italic minimal options */}
          <div className="flex items-center border border-black/20 px-1 py-0.5 text-[12px]">
            <button
              type="button"
              onClick={() => applyFormatting('bold')}
              className="px-2 py-0.5 text-black hover:opacity-50 transition-opacity font-bold cursor-pointer"
              title="bold (ctrl+b)"
            >
              b
            </button>
            <span className="text-black/20">|</span>
            <button
              type="button"
              onClick={() => applyFormatting('italic')}
              className="px-2 py-0.5 text-black hover:opacity-50 transition-opacity italic cursor-pointer"
              title="italic (ctrl+i)"
            >
              i
            </button>
          </div>

          {/* Add Image trigger */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-[12px] text-black/70 hover:text-black transition-colors border border-black/20 hover:border-black px-3 py-1 cursor-pointer"
            title="add image"
          >
            + add image
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
          />

          {/* Delete / Discard draft button */}
          <button
            type="button"
            onClick={handleDeleteOrDiscard}
            className="text-[12px] text-black/40 hover:text-red-600 transition-colors px-2 py-1 cursor-pointer"
            title="delete or discard"
          >
            {editData ? 'delete' : 'discard'}
          </button>

          {/* Publish / Update Button */}
          <button
            onClick={handlePublish}
            disabled={isSubmitting}
            className="text-[12px] bg-black text-white hover:opacity-80 transition-opacity px-4 py-1 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting
              ? 'saving...'
              : editData
              ? 'save changes'
              : 'publish'}
          </button>
        </div>
      </header>

      {/* Main Expansive Canvas Workspace */}
      <div className="flex-1 overflow-y-auto px-6 sm:px-12 py-10 relative">
        <div className="max-w-2xl mx-auto w-full min-h-[80vh] flex flex-col relative z-0">
          {statusMessage && (
            <div className="mb-6 p-3 bg-neutral-100 text-[12px] text-black">
              {statusMessage}
            </div>
          )}

          {/* Date & Time line only */}
          <div className="text-[12px] text-black/50 mb-6 font-normal">
            <input
              type="text"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              placeholder="yyyy.mm.dd · hh:mm"
              className="bg-transparent border-none outline-none text-black/50 text-[12px] w-52 font-normal"
            />
          </div>

          {/* Title input (for writing) */}
          {editorType === 'writing' && (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="title..."
              className="text-2xl sm:text-3xl font-normal text-black placeholder:text-black/20 outline-none border-none bg-transparent w-full mb-6 leading-normal"
            />
          )}

          {/* Writing Content Surface */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              editorType === 'writing'
                ? 'begin writing your essay...'
                : 'write your diary entry...'
            }
            className="w-full flex-1 min-h-[500px] text-[14px] sm:text-base leading-relaxed text-black/90 placeholder:text-black/25 outline-none border-none bg-transparent resize-none font-normal"
          />
        </div>

        {/* Freely Draggable Frameless Images with Layer Control */}
        <AnimatePresence>
          {images.map((img) => (
            <motion.div
              key={img.id}
              drag
              dragMomentum={false}
              dragElastic={0.08}
              initial={{ x: img.x, y: img.y, opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onDragEnd={(_, info) => {
                setImages((prev) =>
                  prev.map((item) =>
                    item.id === img.id
                      ? {
                          ...item,
                          x: item.x + info.offset.x,
                          y: item.y + info.offset.y,
                        }
                      : item
                  )
                );
              }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                zIndex: img.zIndex || 10,
                cursor: 'grab',
                width: img.width || 280,
              }}
              whileDrag={{
                cursor: 'grabbing',
                zIndex: (img.zIndex || 10) + 50,
              }}
              className="group select-none"
            >
              <div className="relative">
                {/* Floating Image controls on hover */}
                <div className="absolute -top-6 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 bg-black text-white text-[10px] px-1.5 py-0.5 z-30">
                  <button
                    onClick={() => adjustLayer(img.id, 'down')}
                    className="hover:opacity-70 px-1 cursor-pointer"
                    title="send layer backward"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => adjustLayer(img.id, 'up')}
                    className="hover:opacity-70 px-1 cursor-pointer"
                    title="bring layer forward"
                  >
                    ↑
                  </button>
                  <span className="text-white/30">|</span>
                  <button
                    onClick={() => resizeImage(img.id, -40)}
                    className="hover:opacity-70 px-1 cursor-pointer"
                    title="smaller"
                  >
                    -
                  </button>
                  <button
                    onClick={() => resizeImage(img.id, 40)}
                    className="hover:opacity-70 px-1 cursor-pointer"
                    title="larger"
                  >
                    +
                  </button>
                  <span className="text-white/30">|</span>
                  <button
                    onClick={() => removeImage(img.id)}
                    className="hover:text-red-400 px-1 cursor-pointer font-bold"
                    title="remove"
                  >
                    ✕
                  </button>
                </div>

                {/* Pure frameless photo */}
                <img
                  src={img.src}
                  alt="author asset"
                  className="w-full h-auto block pointer-events-none select-none"
                  draggable={false}
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
