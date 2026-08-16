import React, { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

const InstallPrompt = () => {
  const [deferred, setDeferred] = useState(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault();
      setDeferred(e);
      setShow(true);
    };
    const onInstalled = () => {
      setShow(false);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    try {
      await deferred.userChoice;
    } catch (e) {
      // ignore
    }
    setShow(false);
    setDeferred(null);
  };

  if (!show) return null;

  return (
    <div className="flex items-center justify-between gap-3 bg-[#f0c33c] px-4 py-2 text-black" data-testid="install-banner">
      <div className="flex items-center gap-2 text-xs sm:text-sm font-bold">
        <Download className="h-4 w-4" /> Install 1gmPay for full-screen live rates
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={install}
          data-testid="install-app-btn"
          className="rounded-full bg-black px-3 py-1 text-xs font-bold text-[#f0c33c] active:scale-95 transition-transform"
        >
          INSTALL
        </button>
        <button onClick={() => setShow(false)} data-testid="install-dismiss" aria-label="Dismiss">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default InstallPrompt;
