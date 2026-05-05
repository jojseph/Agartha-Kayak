'use client';

import React, { useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 'network' | 'cardano_testnet' | 'bitcoin_testnet' | 'midnight_testnet' | 'confirm';

interface Selection {
  blockchain: 'Cardano';
  environment: 'Mainnet' | 'Preprod' | 'Preview';
}

interface NetworkSelectModalProps {
  isDark: boolean;
  onConfirm: (selection: Selection) => void;
  onClose: () => void;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepIndicator({ current, total, isDark }: { current: number; total: number; isDark: boolean }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1 flex-1 rounded-full transition-all duration-500 ${
            i < current
              ? 'bg-gradient-to-r from-[#681CFF] to-[#FD3F83]'
              : isDark
              ? 'bg-white/10'
              : 'bg-gray-200'
          }`}
        />
      ))}
    </div>
  );
}

function OptionCard({
  label,
  sublabel,
  recommended,
  icon,
  isDark,
  onClick,
}: {
  label: string;
  sublabel?: string;
  recommended?: boolean;
  icon: React.ReactNode;
  isDark: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`group w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all duration-200 hover:scale-[1.02] hover:border-[#681CFF]/60 active:scale-[0.99] ${
        isDark
          ? 'bg-white/5 border-white/10 hover:bg-[#681CFF]/10'
          : 'bg-white border-gray-200 hover:bg-[#681CFF]/5 shadow-sm'
      }`}
    >
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#681CFF] to-[#FD3F83] flex items-center justify-center shrink-0 shadow-md shadow-[#681CFF]/30 transition-transform group-hover:scale-110">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{label}</span>
          {recommended && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r from-[#681CFF] to-[#FD3F83] text-white">
              Recommended
            </span>
          )}
        </div>
        {sublabel && (
          <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{sublabel}</p>
        )}
      </div>
      <svg className={`w-4 h-4 shrink-0 transition-transform group-hover:translate-x-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const IconCardano = () => (
  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="12" r="2.5" />
    <circle cx="12" cy="4" r="1.5" opacity="0.8" />
    <circle cx="12" cy="20" r="1.5" opacity="0.8" />
    <circle cx="4" cy="8" r="1.5" opacity="0.6" />
    <circle cx="20" cy="8" r="1.5" opacity="0.6" />
    <circle cx="4" cy="16" r="1.5" opacity="0.6" />
    <circle cx="20" cy="16" r="1.5" opacity="0.6" />
    <circle cx="7" cy="5.5" r="1" opacity="0.5" />
    <circle cx="17" cy="5.5" r="1" opacity="0.5" />
    <circle cx="7" cy="18.5" r="1" opacity="0.5" />
    <circle cx="17" cy="18.5" r="1" opacity="0.5" />
  </svg>
);

const IconGlobe = () => (
  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const IconFlask = () => (
  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
  </svg>
);

const IconCheck = () => (
  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
  </svg>
);

const IconLace = () => (
  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-4-4 1.41-1.41L11 14.17l6.59-6.59L19 9l-8 8z" />
  </svg>
);

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function NetworkSelectModal({ isDark, onConfirm, onClose }: NetworkSelectModalProps) {
  const [step, setStep] = useState<Step>('network');
  const [selection, setSelection] = useState<Partial<Selection>>({ blockchain: 'Cardano' });

  const totalSteps = step === 'confirm' ? 3 : step === 'network' ? 3 : 3;
  const currentStep = step === 'network' ? 1 : step === 'cardano_testnet' ? 2 : step === 'confirm' ? 3 : 2;

  const handleNetworkChoice = (env: 'Mainnet' | 'testnet') => {
    if (env === 'Mainnet') {
      setSelection({ blockchain: 'Cardano', environment: 'Mainnet' });
      setStep('confirm');
    } else {
      setStep('cardano_testnet');
    }
  };

  const handleCardanoTestnet = (env: 'Preprod' | 'Preview') => {
    setSelection({ blockchain: 'Cardano', environment: env });
    setStep('confirm');
  };

  const handleConfirm = () => {
    if (selection.blockchain && selection.environment) {
      onConfirm(selection as Selection);
    }
  };

  const getEnvBadgeColor = (env?: string) => {
    if (env === 'Mainnet') return 'from-emerald-500 to-green-400';
    if (env === 'Preprod') return 'from-[#681CFF] to-[#FD3F83]';
    return 'from-amber-500 to-orange-400';
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div
        className={`relative z-10 w-full max-w-sm rounded-3xl border shadow-2xl overflow-hidden transition-all duration-300 animate-in fade-in zoom-in-95 ${
          isDark
            ? 'bg-[#0C0A1E] border-white/10 shadow-[#681CFF]/20'
            : 'bg-white border-gray-200 shadow-xl'
        }`}
      >
        {/* Gradient top bar */}
        <div className="h-1 w-full bg-gradient-to-r from-[#681CFF] to-[#FD3F83]" />

        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {step === 'network' && 'Select Network'}
                {step === 'cardano_testnet' && 'Cardano Testnet'}
                {step === 'confirm' && 'Ready to Connect'}
              </h2>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {step === 'network' && 'Choose your operating network'}
                {step === 'cardano_testnet' && 'Pick a Cardano testnet environment'}
                {step === 'confirm' && 'Review your selection below'}
              </p>
            </div>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-gray-500 hover:text-white hover:bg-white/10' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <StepIndicator current={currentStep} total={3} isDark={isDark} />

          {/* ── STEP 1: Mainnet vs Testnet ── */}
          {step === 'network' && (
            <div className="space-y-3 animate-in slide-in-from-right-4 fade-in duration-300">
              <OptionCard
                label="Mainnet"
                sublabel="Real ADA — live blockchain transactions"
                icon={<IconGlobe />}
                isDark={isDark}
                onClick={() => handleNetworkChoice('Mainnet')}
              />
              <OptionCard
                label="Testnet"
                sublabel="Cardano has 2 options to choose from"
                recommended
                icon={<IconFlask />}
                isDark={isDark}
                onClick={() => handleNetworkChoice('testnet')}
              />
            </div>
          )}

          {/* ── STEP 2: Cardano Testnet Options ── */}
          {step === 'cardano_testnet' && (
            <div className="space-y-3 animate-in slide-in-from-right-4 fade-in duration-300">
              <div className={`text-xs font-semibold uppercase tracking-widest mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                Cardano · 2 options
              </div>
              <OptionCard
                label="Preprod"
                sublabel="Pre-production — mirrors mainnet behavior"
                recommended
                icon={<IconCardano />}
                isDark={isDark}
                onClick={() => handleCardanoTestnet('Preprod')}
              />
              <OptionCard
                label="Preview"
                sublabel="Preview — earliest protocol features"
                icon={<IconFlask />}
                isDark={isDark}
                onClick={() => handleCardanoTestnet('Preview')}
              />

              <button
                onClick={() => setStep('network')}
                className={`w-full mt-2 py-2.5 text-xs font-medium rounded-xl transition-colors ${isDark ? 'text-gray-500 hover:text-white hover:bg-white/5' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}
              >
                ← Back
              </button>
            </div>
          )}

          {/* ── STEP 3: Confirm ── */}
          {step === 'confirm' && (
            <div className="space-y-5 animate-in slide-in-from-right-4 fade-in duration-300">
              {/* Summary card */}
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${getEnvBadgeColor(selection.environment)} flex items-center justify-center shadow-md`}>
                    <IconCheck />
                  </div>
                  <div>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Selected Network</p>
                    <p className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Cardano · {selection.environment}
                    </p>
                  </div>
                </div>
              </div>

              {/* Lace wallet info */}
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#681CFF]/10 border-[#681CFF]/20' : 'bg-[#681CFF]/5 border-[#681CFF]/20'}`}>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#681CFF] to-[#FD3F83] flex items-center justify-center shrink-0">
                    <IconLace />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#681CFF] mb-0.5">Lace Wallet</p>
                    <p className={`text-xs leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      Make sure Lace is set to <span className="font-bold text-[#FD3F83]">{selection.environment}</span> before connecting. Check your Lace extension settings.
                    </p>
                  </div>
                </div>
              </div>

              {/* Confirm button */}
              <button
                onClick={handleConfirm}
                className="w-full py-4 bg-gradient-to-r from-[#681CFF] to-[#FD3F83] text-white rounded-full font-bold text-sm transition-all hover:scale-105 shadow-lg shadow-[#FD3F83]/20 active:scale-100"
              >
                Connect Lace Wallet
              </button>

              <button
                onClick={() => setStep(selection.environment === 'Mainnet' ? 'network' : 'cardano_testnet')}
                className={`w-full py-2.5 text-xs font-medium rounded-xl transition-colors ${isDark ? 'text-gray-500 hover:text-white hover:bg-white/5' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}
              >
                ← Change Network
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
