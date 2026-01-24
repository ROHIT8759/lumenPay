'use client';

import React, { useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { X, AlertCircle } from 'lucide-react';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (data: string) => void;
}

export default function QRScanner({ isOpen, onClose, onScanSuccess }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string>('');
  const [scanned, setScanned] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        scanQR();
      }
    } catch (err) {
      setError('Cannot access camera. Please check permissions.');
    }
  }, []);

  const scanQR = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;

    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (code) {
      setScanned(true);
      onScanSuccess(code.data);
      stopCamera();
    } else {
      if (!scanned) {
        requestAnimationFrame(scanQR);
      }
    }
  }, [onScanSuccess, scanned]);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
    }
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur">
      <div className="relative w-full max-w-md h-screen md:h-[600px] bg-black rounded-lg overflow-hidden">
        {}
        <button
          onClick={() => {
            onClose();
            setScanned(false);
            setError('');
          }}
          className="absolute top-4 right-4 z-10 p-2 bg-white/10 hover:bg-white/20 rounded-full transition"
        >
          <X size={20} />
        </button>

        {}
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          style={{ display: scanned ? 'none' : 'block' }}
        />

        {}
        {!scanned && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-64 h-64 border-2 border-white">
              <div className="absolute inset-0 border-2 border-transparent" style={{
                borderImage: 'linear-gradient(45deg, #00ff00, transparent, transparent) 1',
              }} />
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 256 256">
                <path d="M 20 20 L 50 20 L 50 50 M 236 20 L 206 20 L 206 50 M 20 236 L 50 236 L 50 206 M 236 236 L 206 236 L 206 206" stroke="white" strokeWidth="2" fill="none" />
                <circle cx="128" cy="128" r="2" fill="#00ff00">
                  <animate attributeName="r" values="2;80" dur="2s" repeatCount="indefinite" />
                </circle>
              </svg>
            </div>
          </div>
        )}

        {}
        {error && (
          <div className="absolute inset-x-0 bottom-0 bg-red-500/90 p-4 flex items-center gap-2">
            <AlertCircle size={18} />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {}
        {scanned && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-lg font-bold">QR Code Scanned!</p>
              <p className="text-gray-400 text-sm mt-2">Processing...</p>
            </div>
          </div>
        )}

        {}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    </div>
  );
}
