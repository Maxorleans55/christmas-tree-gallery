import React, { useEffect, useState } from 'react';
import { X, Share, PlusSquare, Download } from 'lucide-react';

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const DISMISS_KEY = 'install-prompt-dismissed';

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as any).standalone === true;

const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// On iPhone only Safari can add to the home screen (Chrome / Firefox on iOS cannot)
const isIOSSafari = () => isIOS() && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(navigator.userAgent);

const InstallPrompt: React.FC = () => {
  const [bip, setBip] = useState<BIPEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<'native' | 'ios' | 'ios-other'>('native');

  useEffect(() => {
    const qs = new URLSearchParams(window.location.search);
    const demo = qs.has('demo-install') ? qs.get('demo-install') || 'native' : null; // preview: ?demo-install or ?demo-install=ios
    if (!demo && isStandalone()) return; // already installed, nothing to ask

    let dismissed = false;
    try {
      dismissed = sessionStorage.getItem(DISMISS_KEY) === '1';
    } catch {}
    if (!demo && dismissed) return;

    let cancelled = false;
    let hasPrompt = false;

    const onBip = (e: Event) => {
      e.preventDefault();
      setBip(e as BIPEvent);
      hasPrompt = true;
    };
    const onInstalled = () => {
      setVisible(false);
      setBip(null);
    };

    // The browser may have offered the install before this component mounted
    const early = (window as any).__bip as BIPEvent | undefined;
    if (early) {
      setBip(early);
      hasPrompt = true;
    }
    window.addEventListener('beforeinstallprompt', onBip);
    window.addEventListener('bip-ready', () => {
      const ev = (window as any).__bip as BIPEvent | undefined;
      if (ev) {
        setBip(ev);
        hasPrompt = true;
      }
    });
    window.addEventListener('appinstalled', onInstalled);

    // Wait for the launch animation to finish, then show the prompt
    const wait = setInterval(() => {
      if (cancelled || document.getElementById('splash')) return;
      clearInterval(wait);
      setTimeout(() => {
        if (cancelled) return;
        if (demo === 'ios' || (!demo && isIOSSafari())) {
          setMode('ios');
          setVisible(true);
        } else if (!demo && isIOS()) {
          setMode('ios-other');
          setVisible(true);
        } else if (demo || hasPrompt || (window as any).__bip) {
          setMode('native');
          setVisible(true);
        }
      }, 1500);
    }, 400);

    return () => {
      cancelled = true;
      clearInterval(wait);
      window.removeEventListener('beforeinstallprompt', onBip);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const close = () => {
    setVisible(false);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {}
  };

  const install = async () => {
    const ev = bip || ((window as any).__bip as BIPEvent | undefined);
    if (!ev) return close();
    await ev.prompt();
    try {
      await ev.userChoice;
    } catch {}
    (window as any).__bip = null;
    setBip(null);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed left-0 right-0 bottom-0 z-[110] flex justify-center px-3 pointer-events-none"
      style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
    >
      <div className="pointer-events-auto w-full max-w-md rounded-3xl border border-[#f2e24e]/30 bg-[#08130d]/95 shadow-[0_10px_50px_rgba(0,0,0,0.7)] backdrop-blur-xl p-4 animate-in slide-in-from-bottom duration-500">
        <div className="flex items-start gap-3">
          <img
            src="./icons/icon-192.png"
            alt=""
            className="w-14 h-14 rounded-2xl shadow-lg shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h3 className="text-[#fff1a1] text-lg leading-tight" style={{ fontFamily: "'Great Vibes', cursive" }}>
              Keep our tree close
            </h3>
            <p className="text-white/70 text-xs mt-0.5">
              {mode === 'native' && 'Install it for a one-tap shortcut on your home screen.'}
              {mode === 'ios' && 'Add it to your home screen for a one-tap shortcut:'}
              {mode === 'ios-other' && 'To add a shortcut, open this link in Safari first.'}
            </p>
          </div>
          <button
            onClick={close}
            className="p-1.5 rounded-full text-white/60 hover:text-white hover:bg-white/10"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {mode === 'ios' && (
          <ol className="mt-3 space-y-2 text-sm text-white/85">
            <li className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs">1</span>
              Tap <Share className="w-4 h-4 text-[#f2e24e] inline" /> <b className="font-semibold">Share</b> at the bottom of Safari
            </li>
            <li className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs">2</span>
              Choose <PlusSquare className="w-4 h-4 text-[#f2e24e] inline" /> <b className="font-semibold">Add to Home Screen</b>
            </li>
          </ol>
        )}

        <div className="mt-3 flex gap-2">
          {mode === 'native' && (
            <button
              onClick={install}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full bg-[#f2e24e] text-black font-semibold text-sm hover:scale-[1.02] transition-transform"
            >
              <Download className="w-4 h-4" /> Install
            </button>
          )}
          <button
            onClick={close}
            className={`py-2.5 rounded-full text-sm text-white/80 bg-white/10 hover:bg-white/15 ${mode === 'native' ? 'px-5' : 'flex-1'}`}
          >
            {mode === 'native' ? 'Not now' : 'Got it'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallPrompt;
