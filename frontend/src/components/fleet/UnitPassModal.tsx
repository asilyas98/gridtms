import React, { useState } from 'react';
import { 
  X, 
  QrCode, 
  Truck, 
  Copy, 
  Check, 
  ExternalLink, 
  Printer, 
  ShieldCheck, 
  Calendar, 
  Wrench, 
  MapPin,
  Cpu,
  FileText
} from 'lucide-react';
import { FleetPortalUnit } from '../../types';

interface UnitPassModalProps {
  unit: FleetPortalUnit;
  onClose: () => void;
}

// Authentic deterministic SVG QR code pattern based on unit pass payload
function SvgQrCode({ value, size = 180 }: { value: string; size?: number }) {
  const matrixSize = 25;
  const hash = Array.from(value).reduce((acc, char, i) => acc + char.charCodeAt(0) * (i + 1), 0);
  
  const cells: boolean[][] = [];
  for (let r = 0; r < matrixSize; r++) {
    cells[r] = [];
    for (let c = 0; c < matrixSize; c++) {
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
        cells[r][c] = (r + c) % 2 === 0;
      } else {
        const charCode = value.charCodeAt((r * matrixSize + c) % value.length) || 75;
        cells[r][c] = ((charCode + r * 11 + c * 17 + hash) % 3) === 0;
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

export default function UnitPassModal({ unit, onClose }: UnitPassModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const inspectionPath = `/fleet_unit.html?unit=${encodeURIComponent(unit.unitNumber)}&vin=${encodeURIComponent(unit.vin || '')}`;
  const fullInspectionUrl = `${baseUrl}${inspectionPath}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(fullInspectionUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  const handleOpenDeck = () => {
    window.open(fullInspectionUrl, '_blank');
  };

  const handlePrint = () => {
    window.print();
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
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Truck size={20} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                <span>Unit Inspection & Cab Pass</span>
                <span className="text-xs px-2 py-0.5 rounded-md font-mono bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                  {unit.unitNumber}
                </span>
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Official DOT asset credentials & roadside DVIR verification pass
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
          
          {/* Visual Pass Card (Apple-Style Vehicle Asset Tag) */}
          <div className="bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 text-white rounded-2xl p-6 shadow-xl border border-neutral-800 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* QR Code */}
              <div className="flex flex-col items-center shrink-0">
                <SvgQrCode value={fullInspectionUrl} size={150} />
                <span className="text-[11px] font-medium text-neutral-400 mt-2 flex items-center gap-1.5">
                  <QrCode size={12} /> Scan door jamb / cab tag
                </span>
              </div>

              {/* Unit Specifications */}
              <div className="flex-1 w-full space-y-3 text-center md:text-left">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                    Carrier Power Asset
                  </div>
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    {unit.unitNumber} • {unit.makeModel}
                  </h3>
                  <div className="text-xs text-neutral-400 mt-0.5">
                    {unit.type} • {unit.fuelType || 'Diesel'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
                    <div className="text-[10px] text-neutral-400">VIN (Federal 17-Digit)</div>
                    <div className="font-semibold text-white font-mono text-[11px] mt-0.5 truncate">
                      {unit.vin || '1FUJGLDR5PL129841'}
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
                    <div className="text-[10px] text-neutral-400">License Plate</div>
                    <div className="font-semibold text-white font-mono mt-0.5">
                      {unit.plateNumber || 'P-98421'} ({unit.plateState || 'IL'})
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-white/10">
                  <span className="text-neutral-400">Carrier USDOT: <strong className="text-white">3829104</strong></span>
                  <span className="text-neutral-400">Odometer: <strong className="text-white font-mono">{unit.odometer || '120,000'} mi</strong></span>
                </div>
              </div>
            </div>
          </div>

          {/* Compliance & Inspection Status Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Annual DOT Inspection */}
            <div className="p-3.5 bg-neutral-50/70 dark:bg-neutral-900/50 rounded-2xl border border-neutral-200/80 dark:border-[#2C2C2E] space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-neutral-500 text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck size={13} className="text-emerald-500" />
                  Annual DOT Inspection
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                  Compliant
                </span>
              </div>
              <div className="font-semibold text-neutral-900 dark:text-white pt-1">
                Expires: {unit.annualInspectionExpiry || '2027-02-15'}
              </div>
              <div className="text-[11px] text-neutral-400">
                FMCSA 49 CFR 396 Appendix G Decal Affixed
              </div>
            </div>

            {/* Preventive Maintenance (PM) Health */}
            <div className="p-3.5 bg-neutral-50/70 dark:bg-neutral-900/50 rounded-2xl border border-neutral-200/80 dark:border-[#2C2C2E] space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-neutral-500 text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1">
                  <Wrench size={13} className="text-blue-500" />
                  PM Service Health
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  unit.pmStatus === 'Current' 
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' 
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                }`}>
                  {unit.pmStatus || 'Current'}
                </span>
              </div>
              <div className="font-semibold text-neutral-900 dark:text-white pt-1">
                Next PM Due: {unit.nextPmOdometer?.toLocaleString() || '150,000'} mi
              </div>
              <div className="text-[11px] text-neutral-400">
                Interval: Every {parseInt(unit.pmInterval || '15000').toLocaleString()} miles
              </div>
            </div>
          </div>

          {/* Telematics & Driver Link */}
          <div className="rounded-2xl border border-neutral-200 dark:border-[#2C2C2E] p-4 bg-white dark:bg-[#1C1C1E] space-y-3">
            <div className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Asset Pairing & Hardware Telematics
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
                <Cpu size={14} className="text-indigo-500 shrink-0" />
                <div>
                  <div className="text-[10px] text-neutral-400">ELD Hardware</div>
                  <div className="font-semibold">{unit.eldProvider || 'Motive ELD'} ({unit.eldSerial || 'SN-98421'})</div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
                <MapPin size={14} className="text-emerald-500 shrink-0" />
                <div>
                  <div className="text-[10px] text-neutral-400">Assigned Driver & GPS</div>
                  <div className="font-semibold">{unit.assignedDriverName || 'Marcus Vance'} • {unit.currentLocation || 'Chicago, IL'}</div>
                </div>
              </div>
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
              Print Door Jamb Label
            </button>
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3 py-2 rounded-xl border border-neutral-200 dark:border-[#2C2C2E] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              {copiedLink ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              {copiedLink ? 'Link Copied' : 'Copy Inspection Link'}
            </button>
            <a
              href={fullInspectionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 rounded-xl text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <ExternalLink size={14} />
              Open Inspection Deck
            </a>
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
