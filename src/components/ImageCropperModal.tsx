import React, { useState, useRef, useEffect, useCallback } from 'react';

interface ImageCropperModalProps {
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
  onCrop: (croppedDataUrl: string) => void;
}

type AspectRatioOption = 'free' | '1:1' | '4:3' | '3:2' | '16:9' | '2:3';

interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  isOpen,
  imageSrc,
  onClose,
  onCrop,
}) => {
  const [aspectRatio, setAspectRatio] = useState<AspectRatioOption>('free');
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [displaySize, setDisplaySize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [crop, setCrop] = useState<CropRect>({ x: 0, y: 0, width: 0, height: 0 });
  const [dragMode, setDragMode] = useState<
    'none' | 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w'
  >('none');
  const [dragStart, setDragStart] = useState<{ x: number; y: number; initialCrop: CropRect }>({
    x: 0,
    y: 0,
    initialCrop: { x: 0, y: 0, width: 0, height: 0 },
  });

  const imgRef = useRef<HTMLImageElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  // Initialize crop when image is loaded
  const handleImageLoad = () => {
    if (!imgRef.current) return;
    const { naturalWidth, naturalHeight } = imgRef.current;
    const rect = imgRef.current.getBoundingClientRect();
    const clientWidth = Math.round(imgRef.current.offsetWidth || rect.width);
    const clientHeight = Math.round(imgRef.current.offsetHeight || rect.height);

    setNaturalSize({ width: naturalWidth, height: naturalHeight });
    setDisplaySize({ width: clientWidth, height: clientHeight });

    // Initial crop: 90% centered on the image itself
    const marginRatio = 0.05;
    const initialWidth = clientWidth * (1 - 2 * marginRatio);
    const initialHeight = clientHeight * (1 - 2 * marginRatio);
    setCrop({
      x: Math.round(clientWidth * marginRatio),
      y: Math.round(clientHeight * marginRatio),
      width: Math.round(initialWidth),
      height: Math.round(initialHeight),
    });
  };

  // Re-adjust crop when aspect ratio changes
  const applyAspectRatio = useCallback(
    (ratioType: AspectRatioOption, currentDisplay: { width: number; height: number }) => {
      if (currentDisplay.width === 0 || currentDisplay.height === 0) return;
      if (ratioType === 'free') return;

      let targetRatio = 1;
      if (ratioType === '1:1') targetRatio = 1;
      else if (ratioType === '4:3') targetRatio = 4 / 3;
      else if (ratioType === '3:2') targetRatio = 3 / 2;
      else if (ratioType === '16:9') targetRatio = 16 / 9;
      else if (ratioType === '2:3') targetRatio = 2 / 3;

      const dw = currentDisplay.width;
      const dh = currentDisplay.height;

      let newWidth = dw * 0.85;
      let newHeight = newWidth / targetRatio;

      if (newHeight > dh * 0.85) {
        newHeight = dh * 0.85;
        newWidth = newHeight * targetRatio;
      }

      const newX = (dw - newWidth) / 2;
      const newY = (dh - newHeight) / 2;

      setCrop({
        x: Math.max(0, Math.round(newX)),
        y: Math.max(0, Math.round(newY)),
        width: Math.round(newWidth),
        height: Math.round(newHeight),
      });
    },
    []
  );

  useEffect(() => {
    if (aspectRatio !== 'free' && displaySize.width > 0) {
      applyAspectRatio(aspectRatio, displaySize);
    }
  }, [aspectRatio, displaySize, applyAspectRatio]);

  // Window resize handler
  useEffect(() => {
    const handleResize = () => {
      if (!imgRef.current || displaySize.width === 0) return;
      const rect = imgRef.current.getBoundingClientRect();
      const newW = Math.round(imgRef.current.offsetWidth || rect.width);
      const newH = Math.round(imgRef.current.offsetHeight || rect.height);
      if (newW > 0 && newH > 0 && (newW !== displaySize.width || newH !== displaySize.height)) {
        const factorX = newW / displaySize.width;
        const factorY = newH / displaySize.height;
        setDisplaySize({ width: newW, height: newH });
        setCrop((prev) => ({
          x: Math.round(prev.x * factorX),
          y: Math.round(prev.y * factorY),
          width: Math.round(prev.width * factorX),
          height: Math.round(prev.height * factorY),
        }));
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [displaySize.width, displaySize.height]);

  // Global mouseup/pointerup safety
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (dragMode !== 'none') {
        setDragMode('none');
      }
    };
    window.addEventListener('pointerup', handleGlobalPointerUp);
    return () => window.removeEventListener('pointerup', handleGlobalPointerUp);
  }, [dragMode]);

  // Pointer drag handling for moving crop box or handles
  const handlePointerDown = (
    e: React.PointerEvent,
    mode: 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w'
  ) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    setDragMode(mode);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      initialCrop: { ...crop },
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragMode === 'none') return;
    e.preventDefault();

    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    const init = dragStart.initialCrop;
    const dw = displaySize.width;
    const dh = displaySize.height;

    let targetRatio: number | null = null;
    if (aspectRatio === '1:1') targetRatio = 1;
    else if (aspectRatio === '4:3') targetRatio = 4 / 3;
    else if (aspectRatio === '3:2') targetRatio = 3 / 2;
    else if (aspectRatio === '16:9') targetRatio = 16 / 9;
    else if (aspectRatio === '2:3') targetRatio = 2 / 3;

    if (dragMode === 'move') {
      const newX = Math.max(0, Math.min(dw - init.width, init.x + dx));
      const newY = Math.max(0, Math.min(dh - init.height, init.y + dy));
      setCrop({
        ...init,
        x: Math.round(newX),
        y: Math.round(newY),
      });
      return;
    }

    let newX = init.x;
    let newY = init.y;
    let newW = init.width;
    let newH = init.height;

    if (dragMode.includes('e')) {
      newW = Math.max(30, Math.min(dw - init.x, init.width + dx));
    }
    if (dragMode.includes('s')) {
      newH = Math.max(30, Math.min(dh - init.y, init.height + dy));
    }
    if (dragMode.includes('w')) {
      const maxLeftMove = init.width - 30;
      const actualDx = Math.max(-init.x, Math.min(maxLeftMove, dx));
      newX = init.x + actualDx;
      newW = init.width - actualDx;
    }
    if (dragMode.includes('n')) {
      const maxUpMove = init.height - 30;
      const actualDy = Math.max(-init.y, Math.min(maxUpMove, dy));
      newY = init.y + actualDy;
      newH = init.height - actualDy;
    }

    // Apply fixed ratio if needed
    if (targetRatio !== null) {
      if (dragMode === 'e' || dragMode === 'w' || dragMode === 'se' || dragMode === 'sw') {
        newH = newW / targetRatio;
        if (newY + newH > dh) {
          newH = dh - newY;
          newW = newH * targetRatio;
        }
      } else {
        newW = newH * targetRatio;
        if (newX + newW > dw) {
          newW = dw - newX;
          newH = newW / targetRatio;
        }
      }
    }

    newX = Math.max(0, Math.min(dw - 30, newX));
    newY = Math.max(0, Math.min(dh - 30, newY));
    newW = Math.max(30, Math.min(dw - newX, newW));
    newH = Math.max(30, Math.min(dh - newY, newH));

    setCrop({
      x: Math.round(newX),
      y: Math.round(newY),
      width: Math.round(newW),
      height: Math.round(newH),
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragMode !== 'none') {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      setDragMode('none');
    }
  };

  // Perform full-resolution crop on canvas
  const handleConfirmCrop = () => {
    if (!naturalSize.width || !displaySize.width) return;

    const scaleX = naturalSize.width / displaySize.width;
    const scaleY = naturalSize.height / displaySize.height;

    const cropX = Math.max(0, Math.round(crop.x * scaleX));
    const cropY = Math.max(0, Math.round(crop.y * scaleY));
    const cropW = Math.max(1, Math.min(naturalSize.width - cropX, Math.round(crop.width * scaleX)));
    const cropH = Math.max(1, Math.min(naturalSize.height - cropY, Math.round(crop.height * scaleY)));

    const imageObj = new Image();
    imageObj.onload = () => {
      let targetW = cropW;
      let targetH = cropH;
      const maxDim = 1000;
      if (targetW > maxDim || targetH > maxDim) {
        if (targetW > targetH) {
          targetH = Math.round((targetH * maxDim) / targetW);
          targetW = maxDim;
        } else {
          targetW = Math.round((targetW * maxDim) / targetH);
          targetH = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(imageObj, cropX, cropY, cropW, cropH, 0, 0, targetW, targetH);

      const croppedUrl = canvas.toDataURL('image/jpeg', 0.78);
      onCrop(croppedUrl);
      onClose();
    };
    imageObj.src = imageSrc;
  };

  const handleResetCrop = () => {
    if (!displaySize.width) return;
    setAspectRatio('free');
    setCrop({
      x: 0,
      y: 0,
      width: displaySize.width,
      height: displaySize.height,
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white border border-black shadow-2xl flex flex-col p-5 sm:p-6"
        onClick={(e) => e.stopPropagation()}
        style={{ fontFamily: 'Arial, sans-serif' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/15 pb-3 mb-4">
          <div className="text-xs font-normal tracking-wide text-black uppercase font-mono">
            Crop Image
          </div>
          <button
            onClick={onClose}
            className="text-xs text-black/50 hover:text-black transition-colors cursor-pointer"
          >
            ✕ Close
          </button>
        </div>

        {/* Aspect Ratio Selector */}
        <div className="flex flex-wrap items-center gap-1.5 mb-4 text-xs">
          <span className="text-black/50 mr-1 text-[11px] font-mono">Aspect:</span>
          {(['free', '1:1', '4:3', '3:2', '16:9', '2:3'] as AspectRatioOption[]).map((r) => (
            <button
              key={r}
              onClick={() => setAspectRatio(r)}
              className={`px-2 py-1 text-[11px] cursor-pointer transition-colors ${
                aspectRatio === r
                  ? 'bg-black text-white font-medium'
                  : 'bg-neutral-100 text-black/70 hover:text-black hover:bg-neutral-200'
              }`}
            >
              {r}
            </button>
          ))}
          <button
            onClick={handleResetCrop}
            className="ml-auto text-[11px] text-black/50 hover:text-black underline cursor-pointer"
          >
            Reset
          </button>
        </div>

        {/* Centered Gray Viewport with the Image Stage bounded exactly to the image's dimensions */}
        <div className="w-full max-h-[60vh] flex items-center justify-center bg-neutral-100 border border-black/10 overflow-hidden py-3 px-3 select-none touch-none">
          {/* THE STAGE: Matches the rendered image down to the exact pixel */}
          <div
            ref={stageRef}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="relative inline-block select-none"
            style={{
              width: displaySize.width > 0 ? `${displaySize.width}px` : 'auto',
              height: displaySize.height > 0 ? `${displaySize.height}px` : 'auto',
              lineHeight: 0,
            }}
          >
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Source for cropping"
              onLoad={handleImageLoad}
              className="max-h-[52vh] max-w-full block object-contain pointer-events-none select-none mx-auto"
              draggable={false}
            />

            {displaySize.width > 0 && crop.width > 0 && (
              <>
                {/* Darkened overlay strictly covering the unselected areas of the IMAGE */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'rgba(0, 0, 0, 0.5)',
                    clipPath: `polygon(
                      0% 0%, 100% 0%, 100% 100%, 0% 100%,
                      0% 0%,
                      ${crop.x}px ${crop.y}px,
                      ${crop.x}px ${crop.y + crop.height}px,
                      ${crop.x + crop.width}px ${crop.y + crop.height}px,
                      ${crop.x + crop.width}px ${crop.y}px,
                      ${crop.x}px ${crop.y}px
                    )`,
                  }}
                />

                {/* The interactive Crop Box strictly centered and bounded on the image */}
                <div
                  onPointerDown={(e) => handlePointerDown(e, 'move')}
                  className="absolute cursor-move border border-white"
                  style={{
                    left: `${crop.x}px`,
                    top: `${crop.y}px`,
                    width: `${crop.width}px`,
                    height: `${crop.height}px`,
                    boxShadow: '0 0 0 1px rgba(0,0,0,0.6)',
                  }}
                >
                  {/* Rule of thirds grid lines */}
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-35">
                    <div className="border-r border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-b border-white" />
                    <div className="border-r border-white" />
                    <div className="border-r border-white" />
                    <div />
                  </div>

                  {/* Corner Handles */}
                  <div
                    onPointerDown={(e) => handlePointerDown(e, 'nw')}
                    className="absolute -top-2 -left-2 w-4 h-4 bg-white border border-black cursor-nwse-resize z-20 shadow-xs"
                  />
                  <div
                    onPointerDown={(e) => handlePointerDown(e, 'ne')}
                    className="absolute -top-2 -right-2 w-4 h-4 bg-white border border-black cursor-nesw-resize z-20 shadow-xs"
                  />
                  <div
                    onPointerDown={(e) => handlePointerDown(e, 'sw')}
                    className="absolute -bottom-2 -left-2 w-4 h-4 bg-white border border-black cursor-nesw-resize z-20 shadow-xs"
                  />
                  <div
                    onPointerDown={(e) => handlePointerDown(e, 'se')}
                    className="absolute -bottom-2 -right-2 w-4 h-4 bg-white border border-black cursor-nwse-resize z-20 shadow-xs"
                  />

                  {/* Edge Handles */}
                  {aspectRatio === 'free' && (
                    <>
                      <div
                        onPointerDown={(e) => handlePointerDown(e, 'n')}
                        className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-4 h-3 bg-white border border-black cursor-ns-resize z-10"
                      />
                      <div
                        onPointerDown={(e) => handlePointerDown(e, 's')}
                        className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-3 bg-white border border-black cursor-ns-resize z-10"
                      />
                      <div
                        onPointerDown={(e) => handlePointerDown(e, 'w')}
                        className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-3 h-4 bg-white border border-black cursor-ew-resize z-10"
                      />
                      <div
                        onPointerDown={(e) => handlePointerDown(e, 'e')}
                        className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-3 h-4 bg-white border border-black cursor-ew-resize z-10"
                      />
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between border-t border-black/10 pt-4 mt-4">
          <div className="text-[11px] text-black/50 font-mono">
            {naturalSize.width > 0 && `${naturalSize.width} × ${naturalSize.height}px`}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs text-black/70 hover:text-black border border-black/20 hover:border-black transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmCrop}
              className="px-4 py-1.5 text-xs bg-black text-white hover:opacity-85 transition-opacity cursor-pointer font-medium"
            >
              Apply Crop
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
