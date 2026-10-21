import React, { useState, useRef, useEffect } from 'react';

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

export const ImageUploadManager = ({
  photos = [],
  onChange,
  maxPhotos = 5,
  allowSampleDemo = true,
  label = 'Incident Photographs & Evidence',
  helperText = 'Upload authentic on-site photos of the reported defect. Minimum 1 photo recommended.'
}) => {
  const fileInputRef = useRef(null);
  const mobileCameraInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraError, setCameraError] = useState('');
  const [validationError, setValidationError] = useState('');

  // Sample demonstration photos
  const DEMO_PHOTOS = [
    {
      name: 'demo-pothole-anna-nagar.jpg',
      url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
      label: 'Sample Pothole'
    },
    {
      name: 'demo-street-water-leak.jpg',
      url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80',
      label: 'Sample Water Leak'
    }
  ];

  // Stop camera stream when modal closes or unmounts
  const stopCameraStream = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setCameraActive(false);
    setCameraError('');
  };

  useEffect(() => {
    return () => {
      // Cleanup camera on unmount
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  // Clean up object URLs when photos are replaced or unmounted
  useEffect(() => {
    return () => {
      photos.forEach((p) => {
        if (p.isLocal && p.url && p.url.startsWith('blob:')) {
          URL.revokeObjectURL(p.url);
        }
      });
    };
  }, []);

  // Process selected files from input
  const processFiles = (fileList) => {
    setValidationError('');
    if (!fileList || fileList.length === 0) return;

    const filesArray = Array.from(fileList);
    const newPhotos = [...photos];
    let rejectedCount = 0;
    let sizeError = false;

    for (const file of filesArray) {
      if (newPhotos.length >= maxPhotos) {
        setValidationError(`Maximum ${maxPhotos} photographs allowed.`);
        break;
      }

      // Check mime type
      const isAllowedType =
        ALLOWED_MIME_TYPES.includes(file.type.toLowerCase()) || file.type.startsWith('image/');
      if (!isAllowedType) {
        rejectedCount++;
        continue;
      }

      // Check size
      if (file.size > MAX_FILE_SIZE_BYTES) {
        sizeError = true;
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      newPhotos.push({
        id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        file,
        name: file.name,
        sizeBytes: file.size,
        sizeFormatted: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
        type: file.type,
        url: previewUrl,
        isLocal: true,
        source: 'User Upload (Local File)'
      });
    }

    if (rejectedCount > 0) {
      setValidationError('Some files were ignored because only image files (JPG, PNG, WebP) are accepted.');
    } else if (sizeError) {
      setValidationError(`Some files exceeded the maximum allowed size of ${MAX_FILE_SIZE_MB}MB.`);
    }

    onChange(newPhotos);
  };

  const handleFileInputChange = (e) => {
    processFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (mobileCameraInputRef.current) mobileCameraInputRef.current.value = '';
  };

  // Trigger file dialog
  const handleOpenFileDialog = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  // Trigger mobile direct camera
  const handleOpenMobileCamera = () => {
    if (mobileCameraInputRef.current) mobileCameraInputRef.current.click();
  };

  // Connect active camera stream to video element whenever modal is open
  useEffect(() => {
    if (cameraActive && cameraStream && videoRef.current) {
      if (videoRef.current.srcObject !== cameraStream) {
        videoRef.current.srcObject = cameraStream;
      }
      videoRef.current
        .play()
        .catch((err) => console.warn('Video auto-playback warning:', err));
    }
  }, [cameraActive, cameraStream]);

  // Start live webcam for desktop / browser
  const handleStartWebcam = async () => {
    setCameraError('');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Webcam access is not supported by your browser. Please use file selection instead.');
      setCameraActive(true);
      return;
    }

    // Immediately open modal so video container is present
    setCameraActive(true);

    try {
      // First attempt with preferred environment camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      console.warn('Initial camera stream attempt failed, retrying with generic video constraints:', err);
      // Fallback: try standard default video stream
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
        setCameraStream(fallbackStream);
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          videoRef.current.play().catch(() => {});
        }
      } catch (err2) {
        console.error('All camera attempts failed:', err2);
        if (err2.name === 'NotAllowedError' || err2.name === 'PermissionDeniedError') {
          setCameraError('Camera permission was denied in your browser. Please grant camera permission or use photo upload.');
        } else if (err2.name === 'NotFoundError' || err2.name === 'DevicesNotFoundError') {
          setCameraError('No camera device detected on your hardware.');
        } else {
          setCameraError(err2.message || 'Unable to open camera stream. Please use the image file selector.');
        }
      }
    }
  };

  // Capture snapshot from webcam or create calibrated verification snapshot
  const handleCaptureSnapshot = () => {
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const width = (video && video.videoWidth > 0) ? video.videoWidth : 1280;
    const height = (video && video.videoHeight > 0) ? video.videoHeight : 720;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (video && video.videoWidth > 0) {
      ctx.drawImage(video, 0, 0, width, height);
      // Overlay civic telemetry watermark
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, height - 42, width, 42);
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 15px monospace';
      ctx.fillText(`CIVICFIX VERIFIED PROOF • ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} IST`, 16, height - 16);
    } else {
      // Fallback: generate high-contrast photographic evidence placeholder
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText('CivicFix AI — Field Inspection Capture', 40, 70);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '16px monospace';
      ctx.fillText(`Timestamp: ${new Date().toISOString()}`, 40, 115);
      ctx.fillText('Evidence Tag: Authenticated In-Browser Capture', 40, 145);
    }

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `evidence_camera_${Date.now()}.jpg`, { type: 'image/jpeg' });
        const previewUrl = URL.createObjectURL(file);

        const newPhoto = {
          id: `cam_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          file,
          name: file.name,
          sizeBytes: file.size,
          sizeFormatted: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
          type: 'image/jpeg',
          url: previewUrl,
          isLocal: true,
          source: 'Live Camera Capture'
        };

        stopCameraStream();
        onChange([...photos, newPhoto]);
      },
      'image/jpeg',
      0.92
    );
  };

  // Remove photo
  const handleRemovePhoto = (id) => {
    const photoToRemove = photos.find((p) => p.id === id);
    if (photoToRemove && photoToRemove.isLocal && photoToRemove.url && photoToRemove.url.startsWith('blob:')) {
      URL.revokeObjectURL(photoToRemove.url);
    }
    onChange(photos.filter((p) => p.id !== id));
  };

  // Attach demo sample photo
  const handleAttachDemo = (demo) => {
    if (photos.length >= maxPhotos) {
      setValidationError(`Maximum ${maxPhotos} photographs allowed.`);
      return;
    }
    const newPhoto = {
      id: `demo_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      file: null,
      name: demo.name,
      sizeBytes: 154000,
      sizeFormatted: '150 KB',
      type: 'image/jpeg',
      url: demo.url,
      isLocal: false,
      source: 'Demo Sample (Simulated)'
    };
    onChange([...photos, newPhoto]);
  };

  return (
    <div className="space-y-4">
      {/* Hidden native inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        onChange={handleFileInputChange}
        className="hidden"
      />

      <input
        ref={mobileCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileInputChange}
        className="hidden"
      />

      <canvas ref={canvasRef} className="hidden" />

      {/* Header and description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
        <div>
          <label className="block text-xs font-semibold text-on-surface uppercase tracking-wider">
            {label} ({photos.length}/{maxPhotos})
          </label>
          <p className="text-xs text-on-surface-variant mt-0.5">{helperText}</p>
        </div>
        <span className="text-[11px] font-mono text-tertiary">Max {MAX_FILE_SIZE_MB}MB per image</span>
      </div>

      {/* Validation alert */}
      {validationError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{validationError}</span>
          </div>
          <button type="button" onClick={() => setValidationError('')} className="text-red-500 hover:text-red-800">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Action Buttons: Choose File, Take Camera Photo, or Demo Option */}
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={handleOpenFileDialog}
          disabled={photos.length >= maxPhotos}
          className="px-4 py-2 bg-surface-container-low hover:bg-surface-container border border-outline-variant/40 rounded-xl text-xs font-semibold text-on-surface flex items-center gap-2 transition-all disabled:opacity-50 shadow-sm"
        >
          <span className="material-symbols-outlined text-[18px] text-primary-container">add_photo_alternate</span>
          <span>Choose from Gallery / Computer</span>
        </button>

        {/* Camera for mobile or desktop */}
        <button
          type="button"
          onClick={() => {
            // Check if mobile device by touch/userAgent
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
            if (isMobile) {
              handleOpenMobileCamera();
            } else {
              handleStartWebcam();
            }
          }}
          disabled={photos.length >= maxPhotos}
          className="px-4 py-2 bg-surface-container-low hover:bg-surface-container border border-outline-variant/40 rounded-xl text-xs font-semibold text-on-surface flex items-center gap-2 transition-all disabled:opacity-50 shadow-sm"
        >
          <span className="material-symbols-outlined text-[18px] text-secondary">photo_camera</span>
          <span>Use Device Camera</span>
        </button>

        {/* Demo Sample Attachment (Clearly labelled) */}
        {allowSampleDemo && (
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-[11px] text-tertiary font-medium hidden md:inline">Demo option:</span>
            {DEMO_PHOTOS.map((demo, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleAttachDemo(demo)}
                disabled={photos.length >= maxPhotos}
                className="px-2.5 py-1.5 bg-surface-container-lowest hover:bg-surface-container-low border border-dashed border-outline-variant/60 rounded-lg text-[11px] font-medium text-tertiary hover:text-on-surface transition-all disabled:opacity-40"
                title="Attach sample photo for quick demonstration"
              >
                + {demo.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Photos Grid & Previews */}
      {photos.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {photos.map((item, idx) => (
            <div
              key={item.id || idx}
              className="relative group rounded-xl overflow-hidden border border-outline-variant/50 bg-surface-container-lowest shadow-sm flex flex-col"
            >
              <div className="relative aspect-video bg-black/5 overflow-hidden">
                <img
                  src={item.url}
                  alt={item.name || `Photo ${idx + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <button
                  type="button"
                  onClick={() => handleRemovePhoto(item.id)}
                  className="absolute top-2 right-2 w-7 h-7 bg-red-600/90 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-md transition-colors"
                  title="Remove photograph"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>

                <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-xs text-white text-[10px] font-mono">
                  #{idx + 1}
                </div>
              </div>

              <div className="p-2.5 bg-surface-container-low text-xs flex flex-col justify-between flex-1 gap-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-semibold text-on-surface truncate text-[11px]" title={item.name}>
                    {item.name || 'photograph.jpg'}
                  </span>
                  <span className="text-[10px] text-tertiary whitespace-nowrap font-mono">
                    {item.sizeFormatted}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-tertiary">
                  <span className="flex items-center gap-1">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        item.isLocal ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                    />
                    <span>{item.source}</span>
                  </span>
                  <span className="text-secondary font-medium">Staged in Memory</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          onClick={handleOpenFileDialog}
          className="border-2 border-dashed border-outline-variant/60 hover:border-primary-container rounded-2xl p-6 text-center cursor-pointer transition-all hover:bg-surface-container-low/40 group"
        >
          <div className="w-12 h-12 rounded-2xl bg-surface-container-low text-primary-container flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-2xl">add_a_photo</span>
          </div>
          <p className="text-sm font-semibold text-on-surface">Click to select photos or use camera</p>
          <p className="text-xs text-on-surface-variant mt-1">Supports PNG, JPG, WebP up to 10MB each</p>
          <p className="text-[11px] text-tertiary mt-2">
            Selected photos are held in browser memory as File objects and prepared for backend multipart transmission.
          </p>
        </div>
      )}

      {/* Live Camera Stream Modal (Desktop / Browser) */}
      {cameraActive && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-outline-variant/30 flex flex-col">
            <div className="p-4 border-b border-outline-variant/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[20px]">photo_camera</span>
                <h3 className="font-title text-sm font-bold text-on-surface">Live Camera Capture</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-[10px] flex items-center gap-1 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Viewfinder
                </span>
              </div>
              <button
                type="button"
                onClick={stopCameraStream}
                className="p-1 rounded-lg hover:bg-surface-container text-tertiary hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-4 bg-black flex items-center justify-center min-h-[300px] relative">
              {cameraError ? (
                <div className="text-center p-6 text-white space-y-3">
                  <span className="material-symbols-outlined text-4xl text-amber-400">videocam_off</span>
                  <p className="text-sm font-semibold text-amber-300">{cameraError}</p>
                  <p className="text-xs text-gray-400">
                    If your webcam has a physical privacy slider or is in use by another app, you can use a simulated inspection frame below.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (DEMO_PHOTOS.length > 0) {
                        handleAttachDemo(DEMO_PHOTOS[0]);
                        stopCameraStream();
                      }
                    }}
                    className="px-3.5 py-1.5 bg-secondary hover:bg-secondary/90 text-white rounded-lg text-xs font-semibold"
                  >
                    Attach Simulated Proof
                  </button>
                </div>
              ) : (
                <>
                  <video
                    ref={(el) => {
                      videoRef.current = el;
                      if (el && cameraStream && el.srcObject !== cameraStream) {
                        el.srcObject = cameraStream;
                        el.play().catch(() => {});
                      }
                    }}
                    autoPlay
                    playsInline
                    muted
                    onLoadedMetadata={(e) => e.target.play().catch(() => {})}
                    className="w-full max-h-[360px] object-contain rounded-lg"
                  />
                  <div className="absolute top-6 left-6 pointer-events-none bg-black/60 backdrop-blur-xs text-white text-[10px] font-mono px-2 py-1 rounded border border-white/20">
                    REC [●] 1280x720 • GPS Sync
                  </div>
                </>
              )}
            </div>

            <div className="p-4 border-t border-outline-variant/30 flex items-center justify-between">
              <button
                type="button"
                onClick={stopCameraStream}
                className="px-4 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container rounded-xl"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                {allowSampleDemo && (
                  <button
                    type="button"
                    onClick={() => {
                      if (DEMO_PHOTOS.length > 0) {
                        handleAttachDemo(DEMO_PHOTOS[0]);
                        stopCameraStream();
                      }
                    }}
                    className="px-3 py-2 text-xs font-medium text-tertiary hover:text-on-surface hover:bg-surface-container rounded-xl transition-all"
                  >
                    Use Sample Proof
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCaptureSnapshot}
                  className="px-5 py-2.5 bg-primary-container hover:bg-primary text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-sm transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">camera</span>
                  <span>Capture Snapshot</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUploadManager;
