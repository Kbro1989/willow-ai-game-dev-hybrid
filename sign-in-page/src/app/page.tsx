"use client";

import { db } from "@/lib/db";
import React, { useState } from "react";

function App() {
  const { isLoading, user, error } = db.useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a1222] text-cyan-400 font-mono">
        <div className="animate-pulse">Initializing Neural Link...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a1222] text-red-500 font-mono">
        <div>Error: {error.message}</div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a1222] text-cyan-50 font-mono space-y-8">
        <h1 className="text-4xl font-black uppercase tracking-widest text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]">
          Pick of Gods
        </h1>
        <div className="p-8 border border-cyan-500/30 rounded-2xl bg-[#0f172a] max-w-md w-full text-center space-y-6">
          <div className="space-y-2">
            <p className="text-sm text-slate-400 uppercase tracking-widest">Welcome Back</p>
            <p className="text-xl font-bold">{user.email}</p>
          </div>
          <button
            onClick={() => db.auth.signOut()}
            className="px-8 py-3 bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/50 rounded-xl transition-all uppercase tracking-widest text-xs font-black"
          >
            Disconnect Link
          </button>
        </div>
      </div>
    );
  }

  return <SignIn />;
}

function SignIn() {
  const [sentEmail, setSentEmail] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSentEmail(email);
    await db.auth.sendMagicCode({ email });
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;
    await db.auth.signInWithMagicCode({ email: sentEmail, code });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a1222] text-cyan-50 font-mono space-y-8">
      <h1 className="text-5xl font-black uppercase tracking-[0.2em] text-cyan-400 drop-shadow-[0_0_25px_rgba(34,211,238,0.4)]">
        Pick of Gods
      </h1>

      <div className="w-full max-w-sm p-8 border border-cyan-500/20 rounded-3xl bg-[#0f172a]/80 backdrop-blur-xl shadow-2xl">
        {!sentEmail ? (
          <form onSubmit={handleSendCode} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-cyan-600 ml-1">Email Coordinates</label>
              <input
                className="w-full bg-[#020617] border border-slate-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 outline-none transition-colors text-sm placeholder:text-slate-600"
                placeholder="operative@pickofgods.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl uppercase tracking-widest text-xs font-black transition-all shadow-[0_0_20px_rgba(8,145,178,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)]"
            >
              Initialize Link
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-emerald-600 ml-1">Verification Code</label>
              <p className="text-[10px] text-slate-400 mb-2">Code sent to <span className="text-cyan-400">{sentEmail}</span></p>
              <input
                className="w-full bg-[#020617] border border-emerald-500/50 focus:border-emerald-400 rounded-xl px-4 py-3 outline-none transition-colors text-center text-2xl tracking-[0.5em] font-bold placeholder:text-slate-800 placeholder:tracking-normal placeholder:text-sm"
                placeholder="123456"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl uppercase tracking-widest text-xs font-black transition-all shadow-[0_0_20px_rgba(5,150,105,0.4)] hover:shadow-[0_0_30px_rgba(16,185,129,0.6)]"
            >
              Verify Identity
            </button>
            <button
              type="button"
              onClick={() => setSentEmail("")}
              className="w-full py-2 text-[10px] uppercase tracking-widest text-slate-500 hover:text-cyan-400 transition-colors"
            >
              Cancel
            </button>
          </form>
        )}
      </div>

      <div className="text-[10px] uppercase tracking-[0.3em] text-slate-600 opacity-50">
        System v13.f19 Secure Access
      </div>
    </div>
  );
}

export default App;
