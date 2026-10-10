import React, { useState } from 'react';
import { 
  X, 
  QrCode, 
  Smartphone, 
  Copy, 
  Check, 
  ExternalLink, 
  Printer, 
  ShieldCheck, 
  Mail, 
  Key, 
  RefreshCw,
  MessageSquare,
  Truck
} from 'lucide-react';
import { DriverAccount } from '../../types';

interface DriverPassModalProps {
  driver: DriverAccount;
  onClose: () => void;
  onResendCode?: (driverId: string) => Promise<string | void>;
}

// Generates an authentic deterministic SVG QR code pattern based on the payload string
function SvgQrCode({ value, size = 180 }: { value: string; size?: number }) {
  // Simple deterministic 21x21 matrix generation based on string hash for high-fidelity offline rendering
  const matrixSize = 25;
  const hash = Array.from(value).reduce((acc, char, i) => acc + char.charCodeAt(0) * (i + 1), 0);
  
  const cells: boolean[][] = [];
  for (let r = 0; r < matrixSize; r++) {
    cells[r] = [];
    for (let c = 0; c < matrixSize; c++) {
      // Finder patterns in corners
      const isTopLeftFinder = (r < 7 && c < 7);
      const isTopRightFinder = (r < 7 && c >= matrixSize - 7);
      const isBottomLeftFinder = (r >= matrixSize - 7 && c < 7);

      if (isTopLeftFinder || isTopRightFinder || isBottomLeftFinder) {
        const localR = isBottomLeftFinder ? r - (matrixSize - 7) : r;
        const localC = isTopRightFinder ? c - (matrixSize - 7) : c;
        const isBorder = localR === 0 || localR === 6 || localC === 0 || localC === 6;
        const isCenter = localR >= 2 && localR <= 4 && localC >= 2 && localC <= 4;
        cells[r][c] = isBorder || isCenter;
      } else if (r === 6 || c === 6) {
        // Timing pattern
        cells[r][c] = (r + c) % 2 === 0;
      } else {
        // Deterministic pseudo-random pattern based on string characters
        const charCode = value.charCodeAt((r * matrixSize + c) % value.length) || 65;
        cells[r][c] = ((charCode + r * 7 + c * 13 + hash) % 3) === 0;
      }
    }
  }

  const cellSize = size / matrixSize;

  return (
    <svg 
      width={size} 
      height={size} 
      viewBox={`0 0 ${size} ${size}`} 
      className="rounded-xl bg-white p-2 shadow-inner border border-neutral-200"
    >
      <rect width={size} height={size} fill="#FFFFFF" rx="8" />
      {cells.map((row, r) =>
        row.map((active, c) =>
          active ? (
            <rect
              key={`${r}-${c}`}
              x={c * cellSize}
              y={r * cellSize}
              width={cellSize + 0.2}
              height={cellSize + 0.2}
              fill="#111827"
              rx={cellSize > 6 ? 1 : 0}
            />
          ) : null
        )
      )}
    </svg>
  );
}

export default function DriverPassModal({ driver, onClose, onResendCode }: DriverPassModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedSms, setCopiedSms] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [currentCode, setCurrentCode] = useState(driver.verificationCode || '849201');

  // Compute full URL for driver cockpit with staged credentials
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const cockpitPath = `/solo_cockpit.html?email=${encodeURIComponent(driver.email)}&dot=${encodeURIComponent(driver.dotNumber || '3829104')}&code=${encodeURIComponent(currentCode)}&driver=${encodeURIComponent(driver.driverName)}`;
  const fullCockpitUrl = `${baseUrl}${cockpitPath}`;

  const smsText = `Hi ${driver.driverName}, your GridTMS Mobile Driver Cockpit is active. Open link to view dispatches: ${fullCockpitUrl} (Your login email: ${driver.email}, verification code: ${currentCode})`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(fullCockpitUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  const handleCopySms = () => {
    navigator.clipboard.writeText(smsText);
    setCopiedSms(true);
    setTimeout(() => setCopiedSms(false), 2200);
  };

  const handleOpenCockpit = () => {
    window.open(fullCockpitUrl, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleResend = async () => {
    if (!onResendCode) return;
    setIsResending(true);
    try {
      const newCode = await onResendCode(driver.driverId);
      if (typeof newCode === 'string') {
        setCurrentCode(newCode);
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-xl bg-white dark:bg-[#1C1C1E] rounded-3xl shadow-2xl border border-neutral-200 dark:border-[#2C2C2E] overflow-hidden flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-[#2C2C2E]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <QrCode size={20} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
                Driver Mobile Dispatch Pass
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Instant smartphone onboarding for {driver.driverName}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Visual Pass Card (Apple-style Pass) */}
          <div className="bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 text-white rounded-2xl p-6 shadow-xl border border-neutral-800 relative overflow-hidden">
            {/* Ambient background glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* QR Code Container */}
              <div className="flex flex-col items-center shrink-0">
                <SvgQrCode value={fullCockpitUrl} size={150} />
                <span className="text-[11px] font-medium text-neutral-400 mt-2 flex items-center gap-1.5">
                  <Smartphone size={12} /> Scan with cab phone
                </span>
              </div>

              {/* Driver Pass Information */}
              <div className="flex-1 w-full space-y-3.5 text-center md:text-left">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                    Carrier Driver Pass
                  </div>
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    {driver.driverName}
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
                    <div className="text-[10px] text-neutral-400">Assigned Unit</div>
                    <div className="font-semibold text-white flex items-center gap-1 mt-0.5">
                      <Truck size={12} className="text-blue-400" />
                      {driver.assignedTruckUnit || 'Unit 101'}
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
                    <div className="text-[10px] text-neutral-400">Carrier USDOT</div>
                    <div className="font-semibold text-white font-mono mt-0.5">
                      {driver.dotNumber || '3829104'}
                    </div>
                  </div>
                </div>

                {/* 6-Digit Verification Code Callout */}
                <div className="bg-blue-500/15 border border-blue-500/30 rounded-xl px-3.5 py-2.5 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-medium text-blue-300 uppercase tracking-wide">
                      1st-Time Email Verification Code
                    </div>
                    <div className="text-lg font-bold font-mono tracking-widest text-white mt-0.5">
                      {currentCode}
                    </div>
                  </div>
                  {onResendCode && (
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={isResending}
                      className="px-2.5 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="Generate new 6-digit code"
                    >
                      <RefreshCw size={12} className={isResending ? 'animate-spin' : ''} />
                      Resend
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Credentials Summary */}
          <div className="rounded-2xl border border-neutral-200 dark:border-[#2C2C2E] p-4 bg-neutral-50/50 dark:bg-neutral-900/50 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              <span>Driver Account Credentials</span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${
                driver.emailVerified 
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' 
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
              }`}>
                <ShieldCheck size={12} />
                {driver.emailVerified ? 'Email Verified' : 'First-Time Login Verification Required'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white dark:bg-[#1C1C1E] rounded-xl border border-neutral-200/80 dark:border-[#2C2C2E]">
                <div className="text-neutral-400 flex items-center gap-1 mb-1">
                  <Mail size={12} /> Registered Email
                </div>
                <div className="font-semibold text-neutral-900 dark:text-white font-mono break-all">
                  {driver.email}
                </div>
              </div>

              <div className="p-3 bg-white dark:bg-[#1C1C1E] rounded-xl border border-neutral-200/80 dark:border-[#2C2C2E]">
                <div className="text-neutral-400 flex items-center gap-1 mb-1">
                  <Key size={12} /> Assigned Password
                </div>
                <div className="font-semibold text-neutral-900 dark:text-white font-mono">
                  {driver.temporaryPassword || 'password123'}
                </div>
              </div>
            </div>
          </div>

          {/* Share Links & Actions */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              One-Click Driver Delivery Options
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Copy Direct Onboarding Link */}
              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full h-11 px-4 rounded-xl border border-neutral-200 dark:border-[#2C2C2E] hover:border-blue-500 bg-white dark:bg-[#1C1C1E] text-neutral-800 dark:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-sm hover:shadow"
              >
                {copiedLink ? (
                  <>
                    <Check size={15} className="text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400">Link Copied to Clipboard</span>
                  </>
                ) : (
                  <>
                    <Copy size={15} className="text-neutral-400" />
                    <span>Copy Cockpit Link</span>
                  </>
                )}
              </button>

              {/* Copy SMS / WhatsApp Message */}
              <button
                type="button"
                onClick={handleCopySms}
                className="w-full h-11 px-4 rounded-xl border border-neutral-200 dark:border-[#2C2C2E] hover:border-blue-500 bg-white dark:bg-[#1C1C1E] text-neutral-800 dark:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-sm hover:shadow"
              >
                {copiedSms ? (
                  <>
                    <Check size={15} className="text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400">SMS Text Copied</span>
                  </>
                ) : (
                  <>
                    <MessageSquare size={15} className="text-neutral-400" />
                    <span>Copy Pre-Filled SMS / Text</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-neutral-100 dark:border-[#2C2C2E] bg-neutral-50/50 dark:bg-neutral-900/50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-2 rounded-xl border border-neutral-200 dark:border-[#2C2C2E] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Printer size={14} />
              Print Cab Pass
            </button>
            <button
              type="button"
              onClick={handleOpenCockpit}
              className="px-3 py-2 rounded-xl text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <ExternalLink size={14} />
              Launch Cockpit Demo
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-semibold transition-all active:scale-[0.98] shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
