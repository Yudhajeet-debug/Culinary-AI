
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { FridgeIcon } from './icons/FridgeIcon';
import { CameraIcon } from './icons/CameraIcon';

interface ImageUploaderProps {
  onImageUpload: (base64: string) => void;
  error: string | null;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUpload, error }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const handleFileChange = (file: File | null) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        onImageUpload(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const onDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const openCamera = useCallback(async () => {
    setCapturedImage(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Camera access is not supported by your browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraOpen(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
      let message = "Could not access the camera. Please ensure it is not in use by another application.";
      if (err instanceof Error && (err.name === 'NotAllowedError' || err.message.includes('Permission denied'))) {
        message = "Camera access was denied. Please check your browser's site permissions and allow access to the camera for this page.";
      }
      alert(message);
    }
  }, []);

  const closeCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setIsCameraOpen(false);
    setCapturedImage(null);
  }, []);

  const capturePhoto = useCallback(() => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setCapturedImage(dataUrl);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      }
    }
  }, []);

  const handleUsePhoto = () => {
    if (capturedImage) {
      const base64 = capturedImage.split(',')[1];
      onImageUpload(base64);
      closeCamera();
    }
  };

  const handleRetake = () => {
    openCamera();
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const cameraModal = isCameraOpen && (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-2xl shadow-purple-900/40 w-full max-w-3xl border border-gray-700 relative">
        <div className="p-4">
          <div className="relative aspect-video bg-black rounded-md overflow-hidden">
            {capturedImage ? (
              <img src={capturedImage} alt="Captured preview" className="w-full h-full object-contain" />
            ) : (
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-contain"></video>
            )}
          </div>
        </div>
        <div className="flex justify-center gap-4 p-4 border-t border-gray-700">
          {capturedImage ? (
            <>
              <button onClick={handleUsePhoto} className="px-6 py-2 bg-purple-600 text-white font-bold rounded-md hover:bg-purple-500 transition-colors">
                Use Photo
              </button>
              <button onClick={handleRetake} className="px-6 py-2 bg-gray-600 text-white font-bold rounded-md hover:bg-gray-500 transition-colors">
                Retake
              </button>
            </>
          ) : (
            <button onClick={capturePhoto} className="w-16 h-16 bg-white rounded-full border-4 border-gray-400 hover:bg-gray-200 transition-colors ring-4 ring-white/20" aria-label="Capture photo"></button>
          )}
        </div>
        <button onClick={closeCamera} className="absolute top-2 right-2 text-white bg-black/50 rounded-full p-2 hover:bg-black/80 transition-colors" aria-label="Close camera">
           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <h2 className="text-4xl font-orbitron font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 mb-4">
          What's in your fridge?
        </h2>
        <p className="text-lg text-gray-400 mb-8 max-w-2xl">
          Snap a photo of your fridge's contents, and our Culinary AI will whip up personalized recipe ideas in seconds. Let's turn what you have into something amazing!
        </p>
        
        <div
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDragOver={onDragOver}
          onDrop={onDrop}
          className={`w-full max-w-2xl p-8 border-2 border-dashed rounded-xl transition-all duration-300 ${isDragging ? 'border-purple-500 bg-purple-900/20 scale-105' : 'border-gray-600 hover:border-purple-400 hover:bg-gray-800/50'}`}
        >
          <div className="flex flex-col items-center justify-center">
            <FridgeIcon className="w-16 h-16 text-gray-500 mb-4" />
            <span className="text-xl font-semibold text-gray-300">Drag & drop a photo here</span>
            <span className="text-gray-500 my-2">or</span>
            <div className="flex flex-col sm:flex-row gap-4 mt-2">
                <label htmlFor="file-upload" className="px-6 py-2 bg-purple-600 text-white font-bold rounded-md hover:bg-purple-500 transition-colors cursor-pointer flex items-center justify-center">
                    Upload File
                </label>
                <input
                    id="file-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null)}
                />
                 <button onClick={openCamera} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-md hover:bg-indigo-500 transition-colors flex items-center gap-2 justify-center">
                    <CameraIcon className="w-5 h-5" />
                    Take Photo
                </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-6 p-4 bg-red-900/50 border border-red-500 text-red-300 rounded-lg max-w-2xl">
            <p>{error}</p>
          </div>
        )}
      </div>
      {cameraModal}
    </>
  );
};

export default ImageUploader;
