import React, { useState } from 'react';
import { MapPin, ChevronLeft, ChevronRight, CheckCircle2, Navigation, AlertCircle } from 'lucide-react';
import { useData } from '../context/DataContext';

type ScheduleBlock = {
  id: string;
  driverId: string;
  day: number;
  startHour: number;
  duration: number;
  type: "trip" | "sleeper" | "off_duty" | "ghost";
  label: string;
  color: "active" | "sleeper" | "off" | "ghost" | "error_ghost";
  overlapLevel?: number;
};

// Generate schedules from real loads synced with the given view period
function generateSchedules(drivers: any[], loads: any[], currentWeekStart: Date, viewMode: 'day' | 'week'): ScheduleBlock[] {
  const currentWeekEnd = new Date(currentWeekStart);
  currentWeekEnd.setDate(currentWeekStart.getDate() + (viewMode === 'day' ? 1 : 7));
  
  const schedules: ScheduleBlock[] = [];
  
  drivers.forEach((d) => {
    // Find loads assigned to this driver that fall during this period
    const driverLoads = loads.filter((l) => l.driverId === d.id);
    
    const blocks: ScheduleBlock[] = [];
    
    driverLoads.forEach((load) => {
      const pDate = new Date(load.pickupDate);
      const dDate = new Date(load.deliveryDate);
      
      // Check if it overlaps with the period
      if (dDate >= currentWeekStart && pDate < currentWeekEnd) {
        // Adjust for start of period
        const blockStart = pDate < currentWeekStart ? currentWeekStart : pDate;
        const blockEnd = dDate > currentWeekEnd ? currentWeekEnd : dDate;
        
        // Find which relative day this starts on (0 to 6 for week, 0 for day)
        const millisInDay = 86400000;
        const startDiff = blockStart.getTime() - currentWeekStart.getTime();
        let relativeDayOffset = Math.floor(startDiff / millisInDay);
        // Correct timezone edge cases by recalculating via Date boundaries
        const startOfDayStart = new Date(currentWeekStart);
        startOfDayStart.setHours(0,0,0,0);
        const blockStartDay = new Date(blockStart);
        blockStartDay.setHours(0,0,0,0);
        relativeDayOffset = Math.round((blockStartDay.getTime() - startOfDayStart.getTime()) / millisInDay);
        
        let startHour = blockStart.getHours() + (blockStart.getMinutes() / 60);
        
        let diffHours = Math.abs(blockEnd.getTime() - blockStart.getTime()) / 36e5;
        if (diffHours < 2) diffHours = 4; // minimum visual block height/width
        
        blocks.push({
          id: `load__${load.id}`,
          driverId: d.id,
          day: relativeDayOffset,
          startHour: startHour,
          duration: diffHours,
          type: 'trip',
          label: load.loadNumber,
          color: 'active',
          overlapLevel: 0
        });
      }
    });

    // Mock inactive/sleeper blocks for realism only if they don't have loads
    if (!driverLoads.length) {
      if (parseInt(d.id.replace(/\D/g,'') || '0') % 2 === 0) {
        blocks.push({ 
          id: `s-off-${d.id}`, driverId: d.id, day: 0, 
          startHour: 0, duration: viewMode === 'day' ? 24 : 168, type: 'off_duty', 
          label: 'Off Duty', color: 'off', overlapLevel: 0 
        });
      }
    }

    // Assign overlap/stack levels
    blocks.sort((a, b) => (a.day * 24 + a.startHour) - (b.day * 24 + b.startHour));
    const levels: { start: number, end: number }[] = [];
    
    blocks.forEach(b => {
       const start = viewMode === 'week' ? Math.floor(b.day) : b.day * 24 + b.startHour;
       const endTotalHours = b.day * 24 + b.startHour + b.duration;
       const end = viewMode === 'week' ? Math.floor((endTotalHours - 0.01) / 24) + 1 : start + b.duration;
       let level = 0;
       
       for (let i = 0; i < levels.length; i++) {
         if (levels[i].end <= start) {
           break;
         }
         level++;
       }
       
       if (levels[level]) {
         levels[level].start = Math.min(levels[level].start, start);
         levels[level].end = Math.max(levels[level].end, end);
       } else {
         levels[level] = { start, end };
       }
       b.overlapLevel = level;
    });

    schedules.push(...blocks);
  });

  return schedules;
}

function CalendarSection({ 
  drivers, 
  trucks,
  loads,
  schedules, 
  selectedDriver, 
  setSelectedDriver,
  currentDate,
  setCurrentDate,
  viewStart,
  isAssigningLoad,
  assigningLoad,
  onAssignDriver,
  navigate,
  viewMode,
  setViewMode
}: any) {
  const { checkDispatchCompliance } = useData();
  const [hoveredDriverId, setHoveredDriverId] = useState<string | null>(null);
  const [overrideModal, setOverrideModal] = useState<{driverId: string, truckId?: string} | null>(null);
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const sortedDrivers = React.useMemo(() => {
    if (!isAssigningLoad || !assigningLoad) return drivers;
    
    const pDate = new Date(assigningLoad.pickupDate);
    const dDate = new Date(assigningLoad.deliveryDate || assigningLoad.pickupDate);
    
    return [...drivers].sort((a: any, b: any) => {
       // Check overlap conflicts
       const checkConflict = (driverId: string, driverStatus: string) => {
         const driverLoads = loads.filter((l: any) => l.driverId === driverId && l.id !== assigningLoad.id && l.status !== 'Cancelled');
         const timeConflict = driverLoads.some((l: any) => {
            const lPDate = new Date(l.pickupDate);
            const lDDate = new Date(l.deliveryDate || l.pickupDate);
            return pDate <= lDDate && dDate >= lPDate;
         });
         const statusConflict = driverStatus !== 'Available';
         return timeConflict || statusConflict;
       };
       
       const aConflict = checkConflict(a.id, a.status);
       const bConflict = checkConflict(b.id, b.status);
       
       if (aConflict && !bConflict) return 1;
       if (!aConflict && bConflict) return -1;
       
       // Sort by HOS if no overlap conflicts OR both have conflicts
       const aHos = parseFloat((typeof a.hosAvailable === 'string' ? a.hosAvailable.replace('h', '') : a.hosAvailable) || '0');
       const bHos = parseFloat((typeof b.hosAvailable === 'string' ? b.hosAvailable.replace('h', '') : b.hosAvailable) || '0');
       return bHos - aHos;
    });
  }, [drivers, loads, isAssigningLoad, assigningLoad]);

  
  const handlePrev = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - (viewMode === 'day' ? 1 : 7));
    setCurrentDate(d);
  };
  
  const handleNext = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + (viewMode === 'day' ? 1 : 7));
    setCurrentDate(d);
  };

  const dateStr = viewMode === 'week' 
    ? `Week of ${viewStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric'})} – ${new Date(viewStart.getTime() + 6 * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric'})}`
    : `${currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric'})}`;

  return (
    <div className="w-full flex flex-col h-full bg-white dark:bg-[#1C1C1E]">
      <div className="p-4 border-b border-slate-200 dark:border-[#2C2C2E] flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">Driver Schedule & Board</h2>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">{dateStr}</p>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-4 border-r border-slate-200 dark:border-slate-700 pr-6">
             <div className="flex bg-slate-100 dark:bg-[#2C2C2E] p-1 rounded-lg">
               <button 
                 onClick={() => setViewMode('day')}
                 className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${viewMode === 'day' ? 'bg-white dark:bg-[#1C1C1E] text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
               >
                 Day View
               </button>
               <button 
                 onClick={() => setViewMode('week')}
                 className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${viewMode === 'week' ? 'bg-white dark:bg-[#1C1C1E] text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
               >
                 Week View
               </button>
             </div>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-blue-500 rounded-full"></div><span className="text-xs font-medium text-slate-600 dark:text-slate-300">On Trip</span></div>
            <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></div><span className="text-xs font-medium text-slate-600 dark:text-slate-300">Sleeper/Rest</span></div>
            <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full"></div><span className="text-xs font-medium text-slate-600 dark:text-slate-300">Off Duty</span></div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={handlePrev} className="p-1.5 hover:bg-slate-100 dark:hover:bg-[#2C2C2E] rounded-md text-slate-500 transition-colors"><ChevronLeft size={18}/></button>
            <button onClick={handleNext} className="p-1.5 hover:bg-slate-100 dark:hover:bg-[#2C2C2E] rounded-md text-slate-500 transition-colors"><ChevronRight size={18}/></button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-slate-50/50 dark:bg-transparent tracking-tight">
        <div className="min-w-[1000px] h-full flex flex-col">
          {/* Header Row */}
          <div className="flex border-b border-slate-200 dark:border-[#2C2C2E] sticky top-0 bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur z-30">
            <div className="w-[180px] md:w-[220px] shrink-0 border-r border-slate-200 dark:border-[#2C2C2E] p-4 flex items-end">
              <span className="text-[11px] font-semibold tracking-widest text-slate-400 uppercase">Driver Info</span>
            </div>
            {viewMode === 'week' ? days.map((day, i) => {
              const d = new Date(viewStart);
              d.setHours(12, 0, 0, 0);
              d.setDate(d.getDate() + i);
              return (
                <div key={day} className="flex-1 flex flex-col px-3 py-3 border-r border-slate-200 dark:border-[#2C2C2E] last:border-r-0">
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{day}</span>
                  <span className="text-xs font-medium text-slate-500">{d.getMonth()+1}/{d.getDate()}</span>
                </div>
              );
            }) : [...Array(24)].map((_, i) => {
               const ampm = i < 12 ? 'am' : 'pm';
               const hour = i === 0 ? 12 : (i > 12 ? i - 12 : i);
               return (
                 <div key={i} className="flex-1 px-1 flex flex-col items-center justify-end pb-2 border-r border-slate-200 dark:border-[#2C2C2E] last:border-r-0">
                    <span className="text-[10px] sm:text-xs font-semibold text-slate-500 whitespace-nowrap">{hour}{ampm}</span>
                 </div>
               );
            })}
          </div>

          {/* Grid Rows */}
          <div className="flex-1 pb-12 relative z-10">
            {sortedDrivers.map((driver: any) => {
              let rowSchedules = schedules.filter((s: ScheduleBlock) => s.driverId === driver.id);
              let hasOverlapWarning = false;
              let isCompliant = true;
              let complianceBlocks: any[] = [];
              const unit = trucks.find((t: any) => t.id === driver.truckId);
              
              if (isAssigningLoad && assigningLoad) {
                 const compCheck = checkDispatchCompliance(driver.id, unit?.id);
                 isCompliant = compCheck.canDispatch;
                 complianceBlocks = compCheck.hardBlocks;

                 const pDate = new Date(assigningLoad.pickupDate);
                 const dDate = new Date(assigningLoad.deliveryDate || assigningLoad.pickupDate);
                 const driverLoads = loads.filter((l: any) => l.driverId === driver.id && l.id !== assigningLoad.id && l.status !== 'Cancelled');
                 const timeConflict = driverLoads.some((l: any) => {
                    const lPDate = new Date(l.pickupDate);
                    const lDDate = new Date(l.deliveryDate || l.pickupDate);
                    return pDate <= lDDate && dDate >= lPDate;
                 });
                 const statusConflict = driver.status !== 'Available';
                 hasOverlapWarning = timeConflict || statusConflict;
              }
              
              if (isAssigningLoad && assigningLoad && hoveredDriverId === driver.id) {
                 const pDate = new Date(assigningLoad.pickupDate);
                 const dDate = new Date(assigningLoad.deliveryDate || assigningLoad.pickupDate);
                 const currentWeekStart = viewStart;
                 const currentWeekEnd = new Date(viewStart);
                 currentWeekEnd.setDate(viewStart.getDate() + (viewMode === 'day' ? 1 : 7));
                 
                 if (dDate >= currentWeekStart && pDate < currentWeekEnd) {
                    const blockStart = pDate < currentWeekStart ? currentWeekStart : pDate;
                    const blockEnd = dDate > currentWeekEnd ? currentWeekEnd : dDate;
                    
                    const millisInDay = 86400000;
                    const startOfDayStart = new Date(currentWeekStart);
                    startOfDayStart.setHours(0,0,0,0);
                    const blockStartDay = new Date(blockStart);
                    blockStartDay.setHours(0,0,0,0);
                    const relativeDayOffset = Math.round((blockStartDay.getTime() - startOfDayStart.getTime()) / millisInDay);
                    
                    let startHour = blockStart.getHours() + (blockStart.getMinutes() / 60);
                    let diffHours = Math.abs(blockEnd.getTime() - blockStart.getTime()) / 36e5;
                    if (diffHours < 2) diffHours = 4;
                    
                    const maxExistingLevel = rowSchedules.reduce((max: number, s: ScheduleBlock) => Math.max(max, s.overlapLevel || 0), -1);
                    
                    rowSchedules.push({
                       id: `ghost__${assigningLoad.id}`,
                       driverId: driver.id,
                       day: relativeDayOffset,
                       startHour: startHour,
                       duration: diffHours,
                       type: 'ghost',
                       label: `Assigning Load ${assigningLoad.loadNumber}...`,
                       color: hasOverlapWarning ? 'error_ghost' : 'ghost',
                       overlapLevel: maxExistingLevel + 1
                    });
                 }
              }

              const isSelected = selectedDriver === driver.id;
              
              const hosObj = driver.hosAvailable && typeof driver.hosAvailable === 'string' ? parseFloat(driver.hosAvailable.replace('h', '')) : 0;
              const hosDisplay = !Number.isNaN(hosObj) ? hosObj : 0;

              const maxLevel = rowSchedules.reduce((max: number, s: ScheduleBlock) => Math.max(max, s.overlapLevel || 0), 0);
              const rowHeight = Math.max(110, (maxLevel + 1) * 40);

              return (
                <div 
                  key={driver.id}
                  onClick={() => {
                    if (isAssigningLoad) {
                      if (!isCompliant) {
                        alert(`Cannot assign: \n- ${complianceBlocks.map((b: any) => b.reason).join('\n- ')}`);
                        return;
                      }
                      if (hasOverlapWarning) {
                        setOverrideModal({ driverId: driver.id, truckId: unit?.id });
                      } else {
                        onAssignDriver(driver.id, unit?.id);
                      }
                    } else {
                      setSelectedDriver(isSelected ? null : driver.id);
                    }
                  }}
                  onMouseEnter={() => setHoveredDriverId(driver.id)}
                  onMouseLeave={() => setHoveredDriverId(null)}
                  className={`flex border-b border-slate-200 dark:border-[#2C2C2E] cursor-pointer transition-colors relative group
                    ${isSelected ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'hover:bg-slate-50 dark:hover:bg-[#2C2C2E]/30 bg-white dark:bg-transparent'}
                    ${isAssigningLoad ? 'hover:ring-2 hover:ring-inset hover:ring-blue-500 bg-blue-50/10' : ''}`}
                  style={{ minHeight: `${rowHeight}px` }}
                >
                  {/* Selection Highlight */}
                  {isSelected && <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-blue-500 z-20" />}

                  {/* Sidebar Info */}
                  <div className={`w-[180px] md:w-[220px] shrink-0 border-r border-slate-200 dark:border-[#2C2C2E] p-4 flex flex-col justify-center transition-transform z-20 bg-inherit
                      ${isSelected ? 'pl-5' : 'pl-4'}`}>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate flex items-center flex-wrap gap-2">
                      {driver.name}
                      {!isCompliant && isAssigningLoad && <span className="px-1.5 py-0.5 bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400 text-[9px] rounded uppercase font-bold border border-red-200 dark:border-red-500/30" title={complianceBlocks.map((b: any) => b.reason).join(', ')}>Not Compliant</span>}
                      {isCompliant && isAssigningLoad && hasOverlapWarning && <span className="px-1.5 py-0.5 bg-orange/20 text-orange dark:bg-orange/20 dark:text-orange text-[9px] rounded uppercase font-bold border border-orange/30 dark:border-orange/30">Conflict</span>}
                      {isCompliant && isAssigningLoad && !hasOverlapWarning && <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 text-[9px] rounded uppercase font-bold border border-emerald-200 dark:border-emerald-500/30">Eligible</span>}
                      {isAssigningLoad && <span className="opacity-0 group-hover:opacity-100 px-1.5 py-0.5 bg-blue-500 text-white text-[9px] rounded uppercase font-bold shrink-0">Assign</span>}
                    </span>
                    <div className="flex items-center gap-1.5 mt-1.5 text-slate-500 dark:text-slate-400">
                      <MapPin size={12} className="shrink-0" />
                      <span className="text-xs truncate font-medium">{driver.currentLocation || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                       <span className="text-[10px] font-mono font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-sm">
                         {unit ? `Unit ${unit.unitNumber}` : 'No Truck'}
                       </span>
                       <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-sm 
                          ${hosDisplay < 5 ? 'text-red-600 bg-red-100 dark:bg-red-500/20 dark:text-red-400' 
                                            : 'text-emerald-600 bg-emerald-100 dark:bg-emerald-500/20 dark:text-emerald-400'}`}>
                         {driver.hosAvailable} HOS
                       </span>
                    </div>
                  </div>

                  {/* Days Background Grid and Horizontal Timeline Overlays */}
                  <div className="flex-1 relative flex">
                     {/* Background Day Columns */}
                     {viewMode === 'week' ? days.map((day, dIdx) => (
                       <div key={`${driver.id}-bg-${dIdx}`} className="flex-1 border-r border-slate-200 dark:border-[#2C2C2E] last:border-r-0 relative"
                            style={{ backgroundColor: dIdx % 2 === 0 ? 'transparent' : 'rgba(148, 163, 184, 0.03)' }}>
                          {/* Inner hour markers */}
                          <div className="absolute inset-0 flex pointer-events-none opacity-20 dark:opacity-10">
                            {[...Array(6)].map((_, i) => (
                              <div key={i} className="flex-1 border-r border-slate-300 dark:border-[#2C2C2E]"></div>
                            ))}
                          </div>
                       </div>
                     )) : [...Array(24)].map((_, i) => (
                       <div key={`${driver.id}-bg-${i}`} className="flex-1 border-r border-slate-200 dark:border-[#2C2C2E] last:border-r-0 relative"
                            style={{ backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(148, 163, 184, 0.03)' }}>
                       </div>
                     ))}
                     
                     {/* Overlay Blocks */}
                     {rowSchedules.map((block: ScheduleBlock) => {
                        let leftPct, widthPct;
                        if (viewMode === 'week') {
                          leftPct = (Math.floor(block.day) / 7) * 100;
                          const endTotalHours = block.day * 24 + block.startHour + block.duration;
                          const endDay = Math.floor((endTotalHours - 0.01) / 24);
                          widthPct = Math.min(((endDay - Math.floor(block.day) + 1) / 7) * 100, 100 - leftPct);
                        } else {
                          leftPct = (block.startHour / 24) * 100;
                          widthPct = Math.min((block.duration / 24) * 100, 100 - leftPct);
                        }
                        
                        let bgClass = block.color === 'active'
                                  ? 'bg-blue-500 dark:bg-blue-600 border-blue-600 dark:border-blue-500 text-white shadow-md hover:!bg-blue-600 dark:hover:!bg-blue-500'
                                  : block.color === 'sleeper'
                                  ? 'bg-emerald-500 dark:bg-emerald-600 border-emerald-600 dark:border-emerald-500 text-white shadow-md'
                                  : block.color === 'ghost'
                                  ? 'bg-blue-400/80 dark:bg-blue-500/70 border-dashed border-2 border-blue-300 dark:border-blue-400 text-white opacity-80 shadow-md animate-pulse'
                                  : block.color === 'error_ghost'
                                  ? 'bg-red-400/80 dark:bg-red-500/70 border-dashed border-2 border-red-300 dark:border-red-400 text-white opacity-90 shadow-md animate-pulse'
                                  : 'bg-slate-300 dark:bg-slate-600 border-slate-400 dark:border-slate-500 text-slate-700 dark:text-slate-200';
                                  
                        const heightPct = 100 / (maxLevel + 1);
                        const topPct = (block.overlapLevel || 0) * heightPct;
                        
                        return (
                          <div 
                             key={block.id}
                             className={`absolute transition-all p-0.5 duration-200 hover:scale-[1.01] hover:z-30 z-20 ${block.id.startsWith('load__') ? 'cursor-pointer' : ''}`}
                             style={{ left: `${leftPct}%`, width: `${widthPct}%`, top: `${topPct}%`, height: `${heightPct}%` }}
                             onClick={(e) => {
                               if (block.id.startsWith('load__')) {
                                 e.stopPropagation();
                                 const loadId = block.id.split('__')[1];
                                 navigate('loads', loadId);
                               }
                             }}
                          >
                             <div className={`w-full h-full flex flex-col justify-center overflow-hidden rounded-md border px-2 whitespace-nowrap shadow-sm ${bgClass}`}>
                               <span className="text-[10px] sm:text-xs font-semibold truncate drop-shadow-sm pointer-events-none">
                                 {block.label}
                               </span>
                             </div>
                          </div>
                        );
                     })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {overrideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-xl border border-slate-200 dark:border-[#2C2C2E] max-w-md w-full overflow-hidden">
              <div className="p-6">
                 <div className="w-12 h-12 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-4">
                    <AlertCircle size={24} />
                 </div>
                 <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Schedule Conflict Detected</h3>
                 <p className="text-slate-500 dark:text-slate-400 text-sm">
                    This driver already has assigned loads or activities that overlap with this new assignment. Are you sure you want to proceed and override the schedule?
                 </p>
              </div>
              <div className="bg-slate-50 dark:bg-black/20 p-4 border-t border-slate-200 dark:border-[#2C2C2E] flex justify-end gap-3">
                 <button 
                   onClick={() => setOverrideModal(null)}
                   className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                 >
                   Cancel
                 </button>
                 <button 
                   onClick={() => {
                     onAssignDriver(overrideModal.driverId, overrideModal.truckId);
                     setOverrideModal(null);
                   }}
                   className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-red-600 hover:bg-red-500 transition-colors shadow-sm"
                 >
                   Force Assign
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

export default function DispatchView({ navigate, selectedLoadId }: any) {
  const { drivers, trucks, loads, updateLoad, updateDriver, updateTruck } = useData();
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'day' | 'week'>('week');
  
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });

  const viewStart = React.useMemo(() => {
    if (viewMode === 'day') return currentDate;
    const d = new Date(currentDate);
    d.setHours(12, 0, 0, 0); // Jump to noon internally to prevent DST boundary jumps
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [currentDate, viewMode]);

  const schedules = React.useMemo(() => generateSchedules(drivers, loads, viewStart, viewMode), [drivers, loads, viewStart, viewMode]);
  const assigningLoad = loads.find(l => l.id === selectedLoadId);

  React.useEffect(() => {
    if (selectedLoadId && assigningLoad && assigningLoad.pickupDate) {
      const pDate = new Date(assigningLoad.pickupDate);
      pDate.setHours(0, 0, 0, 0);
      setCurrentDate((prev) => {
        if (prev.getTime() !== pDate.getTime()) {
          return pDate;
        }
        return prev;
      });
      
      setViewMode('week');
    }
  }, [selectedLoadId, assigningLoad?.pickupDate, assigningLoad?.deliveryDate]);

  const handleAssignDriver = (driverId: string, truckId?: string) => {
    if (!selectedLoadId) return;
    
    updateLoad(selectedLoadId, { driverId, truckId, status: 'Dispatched' });
    updateDriver(driverId, { status: 'On Load' });
    if (truckId) {
       updateTruck(truckId, { status: 'In Use', driverId });
    }
    
    // Navigate back to the load view for this load
    navigate('loads', selectedLoadId);
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 dark:bg-black gap-6">
      
      {selectedLoadId && assigningLoad && (
         <div className="bg-blue-600 rounded-xl p-4 shadow-lg text-white flex flex-col sm:flex-row items-center justify-between animate-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-white/20 rounded-lg"><Navigation size={24} className="text-white" /></div>
               <div>
                  <h3 className="font-bold text-lg leading-tight">Assign Driver to Load {assigningLoad.loadNumber}</h3>
                  <p className="text-sm text-blue-100 mt-0.5">Select a driver from the board below to assign and dispatch this load.</p>
               </div>
            </div>
            <button onClick={() => navigate('loads', selectedLoadId)} className="mt-4 sm:mt-0 px-4 py-2 bg-black/20 hover:bg-black/40 rounded-lg text-sm font-bold transition-all">
               Cancel Assignment
            </button>
         </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#1C1C1E] rounded-xl border border-slate-200 dark:border-[#2C2C2E] shadow-sm">
        <CalendarSection
          drivers={drivers}
          trucks={trucks}
          loads={loads}
          schedules={schedules}
          selectedDriver={selectedDriver}
          setSelectedDriver={setSelectedDriver}
          currentDate={currentDate}
          setCurrentDate={setCurrentDate}
          viewStart={viewStart}
          isAssigningLoad={!!selectedLoadId}
          assigningLoad={assigningLoad}
          onAssignDriver={handleAssignDriver}
          navigate={navigate}
          viewMode={viewMode}
          setViewMode={setViewMode}
        />
      </div>
    </div>
  );
}
