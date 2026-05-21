'use client';

import { useCallback, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ZoomIn } from 'lucide-react';
import { getCroppedImageBlob } from '@/lib/profile/crop-image';

interface ImageCropModalProps {
  open: boolean;
  imageSrc: string;
  aspect: number;
  title: string;
  previewShape: 'circle' | 'banner';
  onClose: () => void;
  onConfirm: (blob: Blob) => void;
}

export function ImageCropModal({
  open,
  imageSrc,
  aspect,
  title,
  previewShape,
  onClose,
  onConfirm,
}: ImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [step, setStep] = useState<'crop' | 'preview'>('crop');
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_a: Area, pixels: Area) => {
    setCroppedArea(pixels);
  }, []);

  const goPreview = async () => {
    if (!croppedArea) return;
    const blob = await getCroppedImageBlob(imageSrc, croppedArea);
    setPreviewUrl(URL.createObjectURL(blob));
    setStep('preview');
  };

  const confirmSave = async () => {
    if (!croppedArea) return;
    setSaving(true);
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedArea);
      onConfirm(blob);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-4 sm:items-center"
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="glass-card w-full max-w-lg overflow-hidden rounded-3xl border border-white/20 shadow-2xl dark:border-white/10"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <h3 className="font-bold text-neutral-950 dark:text-white">{title}</h3>
              <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-2 hover:bg-neutral-100 dark:hover:bg-white/10">
                <X size={18} />
              </button>
            </div>

            {step === 'crop' ? (
              <>
                <div className="relative h-64 w-full bg-neutral-900">
                  <Cropper
                    image={imageSrc}
                    crop={crop}
                    zoom={zoom}
                    aspect={aspect}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={onCropComplete}
                  />
                </div>
                <div className="flex items-center gap-3 px-5 py-4">
                  <ZoomIn size={16} className="text-brand-500" />
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.05}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="w-full accent-brand-500"
                  />
                </div>
                <div className="flex gap-3 px-5 pb-5">
                  <button type="button" onClick={onClose} className="flex-1 rounded-full border border-white/20 py-3 text-sm font-semibold">
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={goPreview}
                    className="flex-1 rounded-full bg-brand-500 py-3 text-sm font-semibold text-white shadow-glow"
                  >
                    Preview
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="p-5">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-brand-500">Profile preview</p>
                  {previewShape === 'banner' ? (
                    <div className="overflow-hidden rounded-2xl border border-white/20">
                      <div className="h-28 w-full overflow-hidden bg-neutral-200 dark:bg-neutral-800">
                        {previewUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={previewUrl} alt="Cover preview" className="h-full w-full object-cover" />
                        )}
                      </div>
                      <div className="h-12 bg-white/80 px-4 py-2 text-xs dark:bg-black/80">Cover photo preview</div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      <div className="h-20 w-20 overflow-hidden rounded-full border-4 border-white shadow-glow dark:border-neutral-900">
                        {previewUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={previewUrl} alt="Avatar preview" className="h-full w-full object-cover" />
                        )}
                      </div>
                      <p className="text-sm text-neutral-600 dark:text-neutral-300">This is how your avatar will appear on your profile.</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-3 px-5 pb-5">
                  <button type="button" onClick={() => setStep('crop')} className="flex-1 rounded-full border border-white/20 py-3 text-sm font-semibold">
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={confirmSave}
                    className="flex-1 rounded-full bg-brand-500 py-3 text-sm font-semibold text-white shadow-glow disabled:opacity-60"
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
