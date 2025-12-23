/**
 * API Key Manager Component
 * Quick-access panel for swapping API keys when rate limits hit
 */

import React, { useState, useEffect } from 'react';

interface ApiKeyManagerProps {
  onClose?: () => void;
}

export const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({ onClose }) => {
  const [geminiKey, setGeminiKey] = useState('');
  const [currentKeyPreview, setCurrentKeyPreview] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    // Load current key preview (last 4 chars only for security)
    const storedKey = localStorage.getItem('TEMP_GEMINI_KEY') || import.meta.env.VITE_GEMINI_API_KEY;
    if (storedKey) {
      setCurrentKeyPreview(`••••${storedKey.slice(-4)}`);
    }
  }, []);

  const handleSaveKey = () => {
    if (!geminiKey.trim()) return;

    // Store in localStorage for temporary use
    localStorage.setItem('TEMP_GEMINI_KEY', geminiKey);

    // Update preview
    setCurrentKeyPreview(`••••${geminiKey.slice(-4)}`);

    // Show success feedback
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);

    // Clear input
    setGeminiKey('');

    console.log('[API KEY] Temporary key updated');
  };

  const handleClearKey = () => {
    localStorage.removeItem('TEMP_GEMINI_KEY');
    const envKey = import.meta.env.VITE_GEMINI_API_KEY;
    setCurrentKeyPreview(envKey ? `••••${envKey.slice(-4)}` : 'Not set');
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0a1222] border border-cyan-500/20 rounded-2xl p-8 max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-black uppercase tracking-widest text-cyan-50">API Key Manager</h2>
            <p className="text-xs text-slate-500 mt-1">Hot-swap keys when rate limits hit</p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-cyan-400 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Current Key Status */}
        <div className="mb-6 p-4 bg-[#050a15] rounded-xl border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[9px] font-black uppercase text-slate-600 tracking-widest block mb-1">
                Current Key
              </span>
              <span className="text-sm font-mono text-cyan-400">
                {currentKeyPreview || 'Not configured'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${currentKeyPreview ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-red-500'}`} />
              <span className="text-[9px] font-bold uppercase text-slate-400">
                {currentKeyPreview ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {showSuccess && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
            <p className="text-sm text-emerald-400 font-medium">✓ Key updated successfully</p>
          </div>
        )}

        {/* Input Section */}
        <div className="space-y-4">
          <div>
            <label className="text-[9px] font-black uppercase text-slate-600 tracking-widest block mb-2">
              Gemini API Key
            </label>
            <input
              type="password"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full bg-[#050a15] border border-slate-700 focus:border-cyan-500 rounded-lg px-4 py-3 text-sm text-cyan-400 font-mono outline-none transition-colors placeholder:text-slate-700"
              onKeyDown={(e) => e.key === 'Enter' && handleSaveKey()}
            />
            <p className="text-[10px] text-slate-600 mt-2">
              Enter a new Gemini API key to temporarily override the default
            </p>
          </div>

          {/* Actions */}
          <div className="flex space-x-3">
            <button
              onClick={handleSaveKey}
              disabled={!geminiKey.trim()}
              className="flex-1 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-black uppercase text-xs tracking-wider py-3 rounded-lg transition-all shadow-[0_0_20px_rgba(0,242,255,0.3)]"
            >
              Update Key
            </button>
            <button
              onClick={handleClearKey}
              className="px-6 bg-slate-700 hover:bg-slate-600 text-slate-300 font-black uppercase text-xs tracking-wider py-3 rounded-lg transition-colors"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-cyan-500/5 border border-cyan-500/10 rounded-lg">
          <h3 className="text-[10px] font-black uppercase text-cyan-600 tracking-widest mb-2">
            💡 Quick Tips
          </h3>
          <ul className="text-[11px] text-slate-400 space-y-1">
            <li>• Keys are stored temporarily in browser storage</li>
            <li>• Refresh page to revert to environment key</li>
            <li>• Get keys at: <span className="text-cyan-400">ai.google.dev</span></li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyManager;
