import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUpdate } from '../context/UpdateContext';

export default function Splash() {
  const navigate = useNavigate();
  const [version, setVersion] = useState('0.0.0');
  const [statusMessage, setStatusMessage] = useState('Preparing application...');
  const [isFading, setIsFading] = useState(false);
  const { isChecking, updateAvailable, isDialogVisible } = useUpdate();
  const mountTime = useRef(Date.now());

  // Load current version for display
  useEffect(() => {
    if ((window as any).electron) {
      (window as any).electron
        .invoke('get-app-version')
        .then((v: string) => setVersion(v || '1.0.0'))
        .catch((err: any) => console.error('[Splash] Failed to load version:', err));
    }
  }, []);

  // Monitor update check and launch application when ready
  useEffect(() => {
    if (isChecking) {
      setStatusMessage('Checking for updates...');
      return;
    }

    // If an update is available and the dialog is active, wait here
    if (updateAvailable && isDialogVisible) {
      setStatusMessage('Update available.');
      return;
    }

    // Otherwise, fade out and transition to the login page after exactly 5 seconds total
    const elapsed = Date.now() - mountTime.current;
    const remainingTime = Math.max(0, 5000 - elapsed);

    setStatusMessage('Launching application...');
    
    const fadeTimer = setTimeout(() => {
      setIsFading(true);
    }, Math.max(0, remainingTime - 500)); // Start fade 500ms before transition

    const redirectTimer = setTimeout(() => {
      navigate('/login', { replace: true });
    }, remainingTime);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(redirectTimer);
    };
  }, [isChecking, updateAvailable, isDialogVisible, navigate]);

  return (
    <div
      className={`fixed inset-0 bg-[#F6F8FB] flex flex-col items-center justify-center select-none z-50 transition-opacity duration-500 ease-out ${
        isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Center Branding Area - Displays ONLY the high-quality big logo icon */}
      <div className="flex flex-col items-center text-center animate-fadeIn scale-up-5 font-sans">
        <img
          src="app-icons/icon.png"
          alt="App Icon"
          className="w-[400px] h-[400px] object-contain hover:scale-[1.03] transition-transform duration-300"
        />
        <div className="mt-8 space-y-1.5">
          <p className="text-xs font-bold text-[#4B5563] tracking-wider uppercase">{statusMessage}</p>
          <p className="text-[10px] font-semibold text-gray-400">v{version}</p>
        </div>
      </div>
    </div>
  );
}
