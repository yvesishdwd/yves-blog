import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { db, setDoc, doc, AUTHOR_EMAIL } from '../firebase.ts';
import { User } from 'firebase/auth';
import { CanvasImage, ContentBlock } from '../types.ts';
import { ImageCropperModal } from './ImageCropperModal.tsx';

export interface InitialEditData {
  id: string;
  type: 'writing' | 'diary';
  title?: string;
  date?: string;
  category?: string;
  content: string;
  images?: CanvasImage[];
  blocks?: ContentBlock[];
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

  // Interleaved blocks: text and images in exact chronological sequence
  const [blocks, setBlocks] = useState<ContentBlock[]>(() => {
    if (editData?.blocks && editData.blocks.length > 0) {
      return editData.blocks;
    }
    const initial: ContentBlock[] = [];
    if (editData?.content && editData.content.trim()) {
      initial.push({
        id: `text-${Date.now()}-0`,
        type: 'text',
        text: editData.content,
      });
    }
    if (editData?.images && editData.images.length > 0) {
      editData.images.forEach((img, i) => {
        initial.push({
          id: `img-${Date.now()}-${i}`,
          type: 'image',
          image: img,
        });
      });
    }
    if (initial.length === 0) {
      initial.push({ id: `text-${Date.now()}-0`, type: 'text', text: '' });
    }
    return initial;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Active focused text block ID for B/I formatting
  const [activeTextId, setActiveTextId] = useState<string | null>(null);

  // Cropper state
  const [croppingImageId, setCroppingImageId] = useState<string | null>(null);

  // Target index for inserting newly uploaded image
  const [insertAfterIndex, setInsertAfterIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  // Sync state if editData changes
  useEffect(() => {
    if (editData) {
      setEditorType(editData.type);
      setTitle(editData.title || '');
      setDateTime(editData.date || formatCurrentDateTime());

      if (editData.blocks && editData.blocks.length > 0) {
        setBlocks(editData.blocks);
      } else {
        const initial: ContentBlock[] = [];
        if (editData.content && editData.content.trim()) {
          initial.push({
            id: `text-${Date.now()}-0`,
            type: 'text',
            text: editData.content,
          });
        }
        if (editData.images && editData.images.length > 0) {
          editData.images.forEach((img, i) => {
            initial.push({
              id: `img-${Date.now()}-${i}`,
              type: 'image',
              image: img,
            });
          });
        }
        if (initial.length === 0) {
          initial.push({ id: `text-${Date.now()}-0`, type: 'text', text: '' });
        }
        setBlocks(initial);
      }
    } else {
      setEditorType(type);
      setTitle('');
      setDateTime(formatCurrentDateTime());
      setBlocks([{ id: `text-${Date.now()}-0`, type: 'text', text: '' }]);
    }
  }, [editData, type]);

  // Auto-resize all textareas to fit content naturally
  useEffect(() => {
    blocks.forEach((block) => {
      if (block.type === 'text') {
        const el = textareaRefs.current[block.id];
        if (el) {
          el.style.height = 'auto';
          el.style.height = `${Math.max(36, el.scrollHeight)}px`;
        }
      }
    });
  }, [blocks]);

  if (!isOpen) return null;

  // Update text of a specific block
  const updateTextBlock = (id: string, text: string) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id && b.type === 'text' ? { ...b, text } : b))
    );
  };

  // Format helper for Bold & Italic on currently active text block
  const applyFormatting = (tag: 'bold' | 'italic') => {
    const targetId = activeTextId || blocks.find((b) => b.type === 'text')?.id;
    if (!targetId) return;

    const textarea = textareaRefs.current[targetId];
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentBlock = blocks.find((b) => b.id === targetId);
    if (!currentBlock || currentBlock.type !== 'text') return;

    const content = currentBlock.text;
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
    updateTextBlock(targetId, newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + wrapper.length,
        start + replacement.length - wrapper.length
      );
    }, 0);
  };

  // Keyboard shortcut for Cmd/Ctrl+B and Cmd/Ctrl+I
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, blockId: string) => {
    setActiveTextId(blockId);
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

  // Insert a new text block after a specific index (e.g. between 2 images)
  const insertTextAfter = (index: number) => {
    const newBlockId = `text-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newBlock: ContentBlock = {
      id: newBlockId,
      type: 'text',
      text: '',
    };
    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, newBlock);
    setBlocks(newBlocks);
    setActiveTextId(newBlockId);

    // Focus into newly created text area
    setTimeout(() => {
      textareaRefs.current[newBlockId]?.focus();
    }, 50);
  };

  // Trigger file upload at a specific position
  const triggerImageUploadAfter = (index: number | null) => {
    setInsertAfterIndex(index);
    fileInputRef.current?.click();
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
        const maxDim = 1200;
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
          const dataUrl = offscreen.toDataURL('image/jpeg', 0.85);

          const newImg: CanvasImage = {
            id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            src: dataUrl,
            x: 0,
            y: 0,
            width: 100,
            zIndex: blocks.length + 1,
            alignment: 'left',
          };

          const newBlock: ContentBlock = {
            id: `block-${newImg.id}`,
            type: 'image',
            image: newImg,
          };

          const newBlocks = [...blocks];
          if (insertAfterIndex !== null && insertAfterIndex >= 0 && insertAfterIndex < newBlocks.length) {
            newBlocks.splice(insertAfterIndex + 1, 0, newBlock);
          } else {
            newBlocks.push(newBlock);
          }
          setBlocks(newBlocks);
          setInsertAfterIndex(null);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Move block up or down
  const moveBlock = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === blocks.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const newBlocks = [...blocks];
    const [moved] = newBlocks.splice(index, 1);
    newBlocks.splice(targetIndex, 0, moved);
    setBlocks(newBlocks);
  };

  // Delete a block
  const deleteBlock = (index: number) => {
    if (blocks.length === 1 && blocks[0].type === 'text') {
      updateTextBlock(blocks[0].id, '');
      return;
    }
    const newBlocks = blocks.filter((_, i) => i !== index);
    if (newBlocks.length === 0) {
      newBlocks.push({ id: `text-${Date.now()}-0`, type: 'text', text: '' });
    }
    setBlocks(newBlocks);
  };

  // Update alignment of image block
  const updateImageAlignment = (blockId: string, alignment: 'left' | 'center' | 'right') => {
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId && b.type === 'image'
          ? { ...b, image: { ...b.image, alignment } }
          : b
      )
    );
  };

  // Update width of image block
  const updateImageWidth = (blockId: string, widthPercent: number) => {
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId && b.type === 'image'
          ? { ...b, image: { ...b.image, width: widthPercent } }
          : b
      )
    );
  };

  // Handle Crop result
  const handleCropComplete = (croppedDataUrl: string) => {
    if (!croppingImageId) return;
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.type === 'image' && b.image.id === croppingImageId) {
          return {
            ...b,
            image: { ...b.image, src: croppedDataUrl },
          };
        }
        return b;
      })
    );
    setCroppingImageId(null);
  };

  // Discard draft or delete published item
  const handleDeleteOrDiscard = async () => {
    if (editData && onDeleteExisting) {
      if (window.confirm('Delete this entry permanently?')) {
        await onDeleteExisting(editData.id, editData.type);
        onClose();
      }
    } else {
      if (window.confirm('Discard changes?')) {
        setTitle('');
        setBlocks([{ id: `text-${Date.now()}-0`, type: 'text', text: '' }]);
        onClose();
      }
    }
  };

  const handlePublish = async () => {
    if (!isAuthorized) {
      setStatusMessage('Unauthorized: Only author can publish.');
      return;
    }

    const hasAnyContent = blocks.some((b) =>
      b.type === 'text' ? b.text.trim().length > 0 : true
    );

    if (editorType === 'writing' && (!title.trim() || !hasAnyContent)) {
      setStatusMessage('Please enter a title and text before publishing.');
      return;
    }

    if (editorType === 'diary' && !hasAnyContent) {
      setStatusMessage('Please write your note or add a photo before publishing.');
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    const authorEmail = currentUser?.email || AUTHOR_EMAIL;

    // Filter out completely empty text blocks if other content exists
    const cleanedBlocks = blocks.filter((b) =>
      b.type === 'text' ? b.text.trim().length > 0 : true
    );

    const allImages = cleanedBlocks
      .filter((b): b is { id: string; type: 'image'; image: CanvasImage } => b.type === 'image')
      .map((b, idx) => ({
        id: b.image.id,
        src: b.image.src,
        x: 0,
        y: 0,
        width: b.image.width || 100,
        zIndex: idx + 1,
        alignment: b.image.alignment || 'left',
      }));

    const combinedText = cleanedBlocks
      .filter((b): b is { id: string; type: 'text'; text: string } => b.type === 'text')
      .map((b) => b.text.trim())
      .join('\n\n');

    try {
      if (editorType === 'diary') {
        const docId = editData ? editData.id : `diary-${Date.now()}`;
        const payload = {
          date: dateTime.trim() || formatCurrentDateTime(),
          text: combinedText,
          images: allImages,
          blocks: cleanedBlocks,
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
          readTime: `${Math.max(1, Math.round(combinedText.split(/\s+/).length / 200))} min`,
          summary: '',
          content: combinedText,
          images: allImages,
          blocks: cleanedBlocks,
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

  const imageBeingCropped = blocks
    .filter((b): b is { id: string; type: 'image'; image: CanvasImage } => b.type === 'image')
    .map((b) => b.image)
    .find((img) => img.id === croppingImageId);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 bg-white text-black flex flex-col selection:bg-black selection:text-white"
      style={{
        fontFamily: 'Arial, sans-serif',
        letterSpacing: 'normal',
      }}
    >
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        accept="image/*"
        className="hidden"
      />

      {/* Top Studio Control Bar */}
      <header className="w-full flex items-center justify-between px-6 sm:px-12 py-4 border-b border-black/10 shrink-0 bg-white">
        <div className="flex items-center gap-6">
          <button
            onClick={onClose}
            className="text-[12px] text-black/50 hover:text-black transition-colors cursor-pointer"
          >
            ← close
          </button>
        </div>

        {/* Minimal Formatting & Actions */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Bold & Italic */}
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
            onClick={() => triggerImageUploadAfter(blocks.length - 1)}
            className="text-[12px] text-black/70 hover:text-black transition-colors border border-black/20 hover:border-black px-3 py-1 cursor-pointer"
            title="Add photo to bottom"
          >
            + add photo
          </button>

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

      {/* Main Expansive WYSIWYG Workspace: Matches Reader EXACTLY */}
      <div className="flex-1 overflow-y-auto px-6 py-10">
        <div className="max-w-[640px] w-full mx-auto flex flex-col">
          {statusMessage && (
            <div className="mb-6 p-3 bg-neutral-100 text-[12px] text-black">
              {statusMessage}
            </div>
          )}

          {/* Date & Time line matching reader */}
          <div className="text-[12px] text-black/50 mb-3 font-normal">
            <input
              type="text"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              placeholder="yyyy.mm.dd · hh:mm"
              className="bg-transparent border-none outline-none text-black/50 text-[12px] w-56 font-normal p-0"
            />
          </div>

          {/* Title input (for writing) */}
          {editorType === 'writing' && (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Essay Title..."
              className="text-2xl sm:text-3xl font-normal text-black placeholder:text-black/20 outline-none border-none bg-transparent w-full mb-4 leading-normal p-0"
            />
          )}

          {/* Interleaved Content Flow with EXACT 1.6em typographic rhythm */}
          <div className="flex flex-col gap-[1.6em] w-full">
            {blocks.map((block, index) => {
              if (block.type === 'text') {
                return (
                  <div key={block.id} className="w-full relative group">
                    <textarea
                      ref={(el) => {
                        textareaRefs.current[block.id] = el;
                      }}
                      value={block.text}
                      onChange={(e) => updateTextBlock(block.id, e.target.value)}
                      onFocus={() => setActiveTextId(block.id)}
                      onKeyDown={(e) => handleKeyDown(e, block.id)}
                      placeholder="Write your text here..."
                      className="w-full text-[13px] sm:text-[14px] leading-[1.6] text-black placeholder:text-black/30 outline-none border-none bg-transparent resize-none font-normal p-0 overflow-hidden block"
                      rows={1}
                    />

                    {/* Inline Quick Insert buttons on hover - Absolute positioned so ZERO height is added to layout */}
                    <div className="absolute -bottom-5 left-0 z-20 flex items-center gap-3 text-[11px] text-black/50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto bg-white/95 px-1">
                      <button
                        type="button"
                        onClick={() => triggerImageUploadAfter(index)}
                        className="hover:text-black hover:underline cursor-pointer"
                      >
                        + photo here
                      </button>
                      {blocks.length > 1 && (
                        <>
                          <span>·</span>
                          <button
                            type="button"
                            onClick={() => moveBlock(index, 'up')}
                            disabled={index === 0}
                            className="hover:text-black disabled:opacity-20 cursor-pointer"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={() => moveBlock(index, 'down')}
                            disabled={index === blocks.length - 1}
                            className="hover:text-black disabled:opacity-20 cursor-pointer"
                          >
                            ↓
                          </button>
                          <span>·</span>
                          <button
                            type="button"
                            onClick={() => deleteBlock(index)}
                            className="hover:text-red-600 cursor-pointer"
                          >
                            delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              }

              if (block.type === 'image') {
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
                  <div key={block.id} className="w-full relative group">
                    {/* Floating Toolstrip above/inside image - Absolute so ZERO height is added to layout */}
                    <div className="absolute top-2 left-2 right-2 z-20 flex items-center justify-between text-[11px] text-black bg-white/95 backdrop-blur-xs border border-black/20 px-2 py-1 shadow-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                      {/* Left: Reorder & Crop */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => moveBlock(index, 'up')}
                          disabled={index === 0}
                          className="px-1 py-0.5 hover:text-black disabled:opacity-20 cursor-pointer disabled:cursor-default"
                          title="Move block up"
                        >
                          ↑ up
                        </button>
                        <span className="text-black/20">|</span>
                        <button
                          type="button"
                          onClick={() => moveBlock(index, 'down')}
                          disabled={index === blocks.length - 1}
                          className="px-1 py-0.5 hover:text-black disabled:opacity-20 cursor-pointer disabled:cursor-default"
                          title="Move block down"
                        >
                          ↓ down
                        </button>
                        <span className="text-black/20">|</span>
                        <button
                          type="button"
                          onClick={() => setCroppingImageId(img.id)}
                          className="px-1.5 py-0.5 bg-black text-white hover:bg-neutral-800 text-[10px] cursor-pointer"
                          title="Crop image"
                        >
                          ✂ crop
                        </button>
                      </div>

                      {/* Right: Alignment & Width & Delete */}
                      <div className="flex items-center gap-2">
                        {/* Alignment buttons */}
                        <div className="flex items-center border border-black/15 text-[10px]">
                          <button
                            type="button"
                            onClick={() => updateImageAlignment(block.id, 'left')}
                            className={`px-1.5 py-0.5 ${img.alignment !== 'center' && img.alignment !== 'right' ? 'bg-black text-white font-medium' : 'hover:text-black text-black/60'}`}
                            title="Align left"
                          >
                            left
                          </button>
                          <button
                            type="button"
                            onClick={() => updateImageAlignment(block.id, 'center')}
                            className={`px-1.5 py-0.5 ${img.alignment === 'center' ? 'bg-black text-white font-medium' : 'hover:text-black text-black/60'}`}
                            title="Align center"
                          >
                            center
                          </button>
                          <button
                            type="button"
                            onClick={() => updateImageAlignment(block.id, 'right')}
                            className={`px-1.5 py-0.5 ${img.alignment === 'right' ? 'bg-black text-white font-medium' : 'hover:text-black text-black/60'}`}
                            title="Align right"
                          >
                            right
                          </button>
                        </div>

                        {/* Width presets */}
                        <div className="flex items-center border border-black/15 text-[10px]">
                          <button
                            type="button"
                            onClick={() => updateImageWidth(block.id, 50)}
                            className={`px-1.5 py-0.5 ${img.width === 50 ? 'bg-black text-white' : 'hover:text-black text-black/60'}`}
                            title="50% width"
                          >
                            50%
                          </button>
                          <button
                            type="button"
                            onClick={() => updateImageWidth(block.id, 75)}
                            className={`px-1.5 py-0.5 ${img.width === 75 ? 'bg-black text-white' : 'hover:text-black text-black/60'}`}
                            title="75% width"
                          >
                            75%
                          </button>
                          <button
                            type="button"
                            onClick={() => updateImageWidth(block.id, 100)}
                            className={`px-1.5 py-0.5 ${(!img.width || img.width === 100) ? 'bg-black text-white' : 'hover:text-black text-black/60'}`}
                            title="100% full margin width"
                          >
                            100%
                          </button>
                        </div>

                        {/* Delete button */}
                        <button
                          type="button"
                          onClick={() => deleteBlock(index)}
                          className="text-black/40 hover:text-red-600 px-1 py-0.5 cursor-pointer ml-1"
                          title="Remove image"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {/* Image display strictly bounded within margins */}
                    <div className="w-full flex overflow-hidden">
                      <img
                        src={img.src}
                        alt="Illustration"
                        className={`h-auto block select-none max-w-full ${alignClass}`}
                        style={{
                          width: widthStyle,
                          maxWidth: '100%',
                        }}
                      />
                    </div>

                    {/* Floating quick action buttons centered at bottom of image - Absolute positioned */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-white/95 backdrop-blur-xs border border-black/20 px-3 py-1 text-[11px] text-black shadow-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                      <button
                        type="button"
                        onClick={() => insertTextAfter(index)}
                        className="hover:underline cursor-pointer font-medium"
                      >
                        + text here
                      </button>
                      <span>·</span>
                      <button
                        type="button"
                        onClick={() => triggerImageUploadAfter(index)}
                        className="hover:underline cursor-pointer"
                      >
                        + photo here
                      </button>
                    </div>
                  </div>
                );
              }

              return null;
            })}
          </div>
        </div>
      </div>

      {/* Image Cropping Modal */}
      {croppingImageId && imageBeingCropped && (
        <ImageCropperModal
          isOpen={!!croppingImageId}
          imageSrc={imageBeingCropped.src}
          onClose={() => setCroppingImageId(null)}
          onCrop={handleCropComplete}
        />
      )}
    </motion.div>
  );
};
