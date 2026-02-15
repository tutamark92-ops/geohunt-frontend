/**
 * QR Code Scanner Component — handles camera access and real-time QR detection.
 * Uses the jsQR library (loaded via CDN) for client-side QR code reading.
 * 
 * Flow:
 *   1. Player taps "Start Scanning" → camera opens
 *   2. Video frames are continuously drawn to a hidden canvas
 *   3. jsQR analyzes each frame looking for QR codes
 *   4. If a valid "geohunt:<treasureId>" code is found matching the target → success!
 *   5. If the QR belongs to a different treasure → "Wrong QR Code!" with auto-retry
 *   6. Falls back to simulation mode if camera access is denied
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, X, CheckCircle, Zap, AlertTriangle } from 'lucide-react';

// Declare jsQR as global (loaded via CDN in index.html)
declare const jsQR: any;

/** Props for the Scanner component */
interface ScannerProps {
  onScan: (id: string) => void;
  onClose: () => void;
  targetId: string;
}

/**
 * Full-screen QR code scanner with camera feed and visual feedback.
 * @param {Function} onScan   - Called with the treasure ID when a valid QR is scanned
 * @param {Function} onClose  - Called when the user dismisses the scanner
 * @param {string}   targetId - The expected treasure ID (from the selected treasure)
 */
export const Scanner: React.FC<ScannerProps> = ({ onScan, onClose, targetId }) => {
  const [scanning, setScanning] = useState(false);
  const [success, setSuccess] = useState(false);
  const [wrongCode, setWrongCode] = useState(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('Initializing...');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);

  /**
   * Stop the camera and cancel the scanning animation loop.
   * Called on unmount and when the scanner is manually closed.
   */
  const cleanup = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  /**
   * The main scanning loop — runs every animation frame.
   * Draws the current video frame to a canvas, then runs jsQR detection.
   * On match: validates the QR data against the target treasure ID.
   */
  const scanQRCode = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || success) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationRef.current = requestAnimationFrame(scanQRCode);
      return;
    }
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });
      
      if (code && code.data) {
        setStatusMessage('QR Code detected!');
        
        // Validate it's a GeoHunt QR code (format: "geohunt:<treasureId>")
        if (code.data.startsWith('geohunt:')) {
          const treasureId = code.data.replace('geohunt:', '');
          
          // Check if it matches the treasure the player selected
          if (treasureId === targetId) {
            setScannedCode(treasureId);
            setSuccess(true);
            setWrongCode(false);
            cleanup();
            setTimeout(() => onScan(treasureId), 800);
            return;
          } else {
            // Valid GeoHunt QR but for a different treasure
            setWrongCode(true);
            setStatusMessage('Wrong QR code! Find the right marker.');
            setTimeout(() => {
              setWrongCode(false);
              setStatusMessage('Scanning for QR code...');
            }, 2000);
          }
        } else {
          setStatusMessage('Not a GeoHunt QR code');
        }
      } else {
        setStatusMessage('Scanning for QR code...');
      }
    } catch (err) {
      console.error('QR scan error:', err);
    }
    
    animationRef.current = requestAnimationFrame(scanQRCode);
  }, [success, cleanup, onScan]);

  /**
   * Initialize the camera and start the QR scanning loop.
   * Requests the rear camera (facingMode: 'environment') for best results.
   * Falls back to simulation mode if camera access is denied.
   */
  const startCamera = async () => {
    try {
      setCameraError(null);
      setStatusMessage('Accessing camera...');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setScanning(true);
          setStatusMessage('Point camera at QR code');
          animationRef.current = requestAnimationFrame(scanQRCode);
        };
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setCameraError("Camera access denied. Using simulation mode.");
      // Fallback: simulate a successful scan after 2 seconds
      setScanning(true);
      setStatusMessage('Simulating scan...');
      setTimeout(() => {
        setSuccess(true);
        setTimeout(() => onScan(targetId), 800);
      }, 2000);
    }
  };

  // Cleanup camera on component unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return (
    <div className="fixed inset-0 z-[3000] bg-[var(--duo-blue)] flex flex-col items-center justify-center p-8">
      <button onClick={() => { cleanup(); onClose(); }} className="absolute top-6 right-6 p-3 bg-white/20 hover:bg-white/30 rounded-xl transition-all text-white z-50">
        <X className="w-6 h-6" />
      </button>

      {/* Hidden canvas used for QR code processing */}
      <canvas ref={canvasRef} className="hidden" />

      <div className="w-full max-w-sm aspect-square relative flex items-center justify-center overflow-hidden">
        {/* Camera Feed Background */}
        <div className="absolute inset-4 rounded-3xl overflow-hidden bg-slate-900 shadow-inner">
          {scanning && !cameraError ? (
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : cameraError ? (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-white/60">
              <AlertTriangle className="w-12 h-12 mb-4" />
              <p className="text-xs font-bold uppercase tracking-widest leading-relaxed">{cameraError}</p>
              <p className="text-[10px] mt-2 italic opacity-50">(Using simulation fallback...)</p>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
            </div>
          )}
          
          {/* Animated scanning line */}
          {scanning && !success && (
            <div className="absolute inset-0 z-10 pointer-events-none">
              <div className="w-full h-1 bg-[var(--duo-green)] opacity-50 shadow-[0_0_15px_var(--duo-green)] animate-scan-line"></div>
            </div>
          )}
        </div>

        {/* Decorative frame corners */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-16 h-16 border-t-[6px] border-l-[6px] border-white rounded-tl-3xl"></div>
          <div className="absolute top-0 right-0 w-16 h-16 border-t-[6px] border-r-[6px] border-white rounded-tr-3xl"></div>
          <div className="absolute bottom-0 left-0 w-16 h-16 border-b-[6px] border-l-[6px] border-white rounded-bl-3xl"></div>
          <div className="absolute bottom-0 right-0 w-16 h-16 border-b-[6px] border-r-[6px] border-white rounded-br-3xl"></div>
        </div>

        {/* Scanner Content Overlay — shows success, error, or scanning state */}
        <div className="card w-[75%] h-[75%] flex items-center justify-center bg-white/10 backdrop-blur-sm border-white/20 shadow-none z-20">
          {success ? (
            <div className="flex flex-col items-center gap-4 celebrate">
              <div className="icon-box w-20 h-20 bg-[var(--duo-green)]">
                 <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <p className="text-xl font-black uppercase tracking-wide text-white drop-shadow-md">QR Verified!</p>
            </div>
          ) : wrongCode ? (
            <div className="flex flex-col items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-red-500 flex items-center justify-center" style={{ boxShadow: '0 4px 0 #b91c1c' }}>
                 <AlertTriangle className="w-10 h-10 text-white" />
              </div>
              <p className="text-lg font-black uppercase tracking-wide text-white drop-shadow-md">Wrong QR Code!</p>
              <p className="text-xs text-white/70 font-bold">Find the correct marker</p>
            </div>
          ) : scanning ? (
            <div className="w-full px-8 flex flex-col items-center gap-4">
               <Camera className="w-12 h-12 text-white/60 animate-pulse" />
               <p className="text-xs font-bold uppercase tracking-widest text-white text-center">{statusMessage}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 text-white">
               <Camera className="w-16 h-16 opacity-50" />
               <p className="text-xs font-bold uppercase tracking-widest">Ready to Scan</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-10 text-center max-w-sm">
        <h3 className="text-2xl font-black text-white mb-2 tracking-tight">GeoScanner v2.0</h3>
        <p className="text-white/80 text-sm font-medium mb-8 px-4">
          Scan the QR code on the treasure marker to unlock it!
        </p>
        
        {!scanning && !success && (
          <button 
            onClick={startCamera}
            className="btn-primary py-4 px-12 text-sm flex items-center gap-3 mx-auto group shadow-2xl"
          >
            <Zap className="w-5 h-5 group-hover:animate-pulse" /> Start Scanning
          </button>
        )}
      </div>
    </div>
  );
};
