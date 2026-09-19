import React, { useState } from 'react';
import { MapPin, ChevronLeft, ChevronRight, CheckCircle2, Navigation, AlertCircle } from 'lucide-react';
import { useData } from '../context/DataContext';

type ScheduleBlock = {
  id: string;
  driverId: string;
  day: number;
  startHour: number;
  duration: number;
  type: "trip" | "sleeper" | "off_duty";
  label: string;
  color: "active" | "sleeper" | "off";
};

// Generate schedules from real loads synced with the given week
function generateSchedules(drivers: any[], loads: any[], currentWeekStart: Date): ScheduleBlock[] {
  const currentWeekEnd = new Date(currentWeekStart);
  currentWeekEnd.setDate(currentWeekStart.getDate() + 7);
  
  const schedules: ScheduleBlock[] = [];
  
  drivers.forEach((d) => {
    // Find loads assigned to this driver that fall during this week
    const driverLoads = loads.filter((l) => l.driverId === d.id);
    
    driverLoads.forEach((load) => {
      const pDate = new Date(load.pickupDate);
      const dDate = new Date(load.deliveryDate);
      
      // Check if it overlaps with the week
      if (dDate >= currentWeekStart && pDate < currentWeekEnd) {
        // Adjust for start of week
        const blockStart = pDate < currentWeekStart ? currentWeekStart : pDate;
        const blockEnd = dDate > currentWeekEnd ? currentWeekEnd : dDate;
        
        let startHour = blockStart.getHours();
        let endHour = blockEnd.getHours() === 0 && blockEnd > blockStart ? 24 : blockEnd.getHours();
        let diffHours = Math.abs(blockEnd.getTime() - blockStart.getTime()) / 36e5;
        
        if (diffHours < 2) diffHours = 4; // minimum visual block height
        
        // Find which day of the week this starts on (0=Mon, ..., 6=Sun)
        // JS getDay() is 0=Sun.
        let dayOfWeek = blockStart.getDay() - 1;
        if (dayOfWeek === -1) dayOfWeek = 6;
        
        // If diffHours spans multiple days, we can split them or we let CSS overflow.
        // It's a calendar block system, the component expects duration < 24 for a single day usually, 
        // but if it spans multiple days, we'll slice it up into daily pieces.
        
        let remainingHours = diffHours;
        let currentDay = dayOfWeek;
        let currentStart = startHour;
        
        while (remainingHours > 0 && currentDay < 7) {
          const maxHoursToday = 24 - currentStart;
          const chunkHours = Math.min(remainingHours, maxHoursToday);
          
          schedules.push({
            id: `load__${load.id}__${currentDay}`,
            driverId: d.id,
            day: currentDay,
            startHour: currentStart,
            duration: chunkHours,
            type: 'trip',
            label: load.loadNumber,
            color: 'active'
          });
          
          remainingHours -= chunkHours;
          currentDay++;
          currentStart = 0;
        }
      }
    });

    // Mock inactive/sleeper blocks for realism only if they don't have loads
    if (!driverLoads.length) {
      if (parseInt(d.id.replace(/\D/g,'') || '0') % 2 === 0) {
        schedules.push({ id: `s-off-${d.id}`, driverId: d.id, day: 0, startHour: 0, duration: 24, type: 'off_duty', label: 'Off Duty', color: 'off' });
      }
    }
  });

  return schedules;
}

function CalendarSection({ 
  drivers, 
  trucks,
  loads,
  assigningLoad,
  schedules, 
  selectedDriver, 
  setSelectedDriver,
  currentWeekStart,
  setCurrentWeekStart,
  isAssigningLoad,
  onAssignDriver,
  navigate
}: any) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const [hoveredDriverId, setHoveredDriverId] = React.useState<string | null>(null);
  
  const handlePrevWeek = () => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() - 7);
    setCurrentWeekStart(d);
  };
  
  const handleNextWeek = () => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + 7);
    setCurrentWeekStart(d);
  };

  const weekStr = `${currentWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric'})} – ${
    new Date(currentWeekStart.getTime() + 6 * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric'})
  }`;

  return (
    <div className="w-full flex flex-col h-full bg-white dark:bg-[#1C1C1E]">
      <div className="p-4 border-b border-slate-200 dark:border-[#2C2C2E] flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">Driver Schedule & Board</h2>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">Week of {weekStr}</p>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-blue-500 rounded-full"></div><span className="text-xs font-medium text-slate-600 dark:text-slate-300">On Trip</span></div>
            <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></div><span className="text-xs font-medium text-slate-600 dark:text-slate-300">Sleeper/Rest</span></div>
            <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full"></div><span className="text-xs font-medium text-slate-600 dark:text-slate-300">Off Duty</span></div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={handlePrevWeek} className="p-1.5 hover:bg-slate-100 dark:hover:bg-[#2C2C2E] rounded-md text-slate-500 transition-colors"><ChevronLeft size={18}/></button>
            <button onClick={handleNextWeek} className="p-1.5 hover:bg-slate-100 dark:hover:bg-[#2C2C2E] rounded-md text-slate-500 transition-colors"><ChevronRight size={18}/></button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-slate-50/50 dark:bg-transparent">
        <div className="min-w-[1000px] h-full flex flex-col">
          {/* Header Row */}
          <div className="flex border-b border-slate-200 dark:border-[#2C2C2E] sticky top-0 bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur z-30">
            <div className="w-[180px] md:w-[220px] shrink-0 border-r border-slate-200 dark:border-[#2C2C2E] p-4 flex items-end">
              <span className="text-[11px] font-semibold tracking-widest text-slate-400 uppercase">Driver Info</span>
            </div>
            {days.map((day, i) => {
              const d = new Date(currentWeekStart);
              d.setDate(d.getDate() + i);
              return (
                <div key={day} className="flex-1 flex flex-col px-3 py-3 border-r border-slate-200 dark:border-[#2C2C2E] last:border-r-0">
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{day}</span>
                  <span className="text-xs font-medium text-slate-500">{d.getMonth()+1}/{d.getDate()}</span>
                </div>
              );
            })}
          </div>

          {/* Grid Rows */}
          <div className="flex-1 pb-12 relative z-10">
            {drivers.map((driver: any) => {
              const rowSchedules = schedules.filter((s: ScheduleBlock) => s.driverId === driver.id);
              
              let hasConflict = false;
              if (isAssigningLoad && assigningLoad && hoveredDriverId === driver.id) {
                const driverLoads = loads.filter((l: any) => l.driverId === driver.id && l.id !== assigningLoad.id);
                const pDate = new Date(assigningLoad.pickupDate);
                const dDate = new Date(assigningLoad.deliveryDate);
                
                for (const dl of driverLoads) {
                  const dlP = new Date(dl.pickupDate);
                  const dlD = new Date(dl.deliveryDate);
                  if (dlP <= dDate && dlD >= pDate) {
                    hasConflict = true;
                    break;
                  }
                }
                
                const phantomSchedules = generateSchedules([{id: driver.id}], [{...assigningLoad, driverId: driver.id}], currentWeekStart);
                phantomSchedules.forEach((p: any) => {
                  p.isPhantom = true;
                  p.hasConflict = hasConflict;
                  p.id = `phantom__${p.id}`;
                });
                
                rowSchedules.push(...phantomSchedules);
              }
              const isSelected = selectedDriver === driver.id;
              const unit = trucks.find((t: any) => t.id === driver.truckId);
              
              const hosObj = driver.hosAvailable && typeof driver.hosAvailable === 'string' ? parseFloat(driver.hosAvailable.replace('h', '')) : 0;
              const hosDisplay = !Number.isNaN(hosObj) ? hosObj : 0;

              return (
                <div 
                  key={driver.id}
                  onMouseEnter={() => setHoveredDriverId(driver.id)}
                  onMouseLeave={() => setHoveredDriverId(null)}
                  onClick={() => {
                    if (isAssigningLoad) {
                      onAssignDriver(driver.id, unit?.id);
                    } else {
                      setSelectedDriver(isSelected ? null : driver.id);
                    }
                  }}
                  className={`flex h-[110px] border-b border-slate-200 dark:border-[#2C2C2E] cursor-pointer transition-colors relative group
                    ${isSelected ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'hover:bg-slate-50 dark:hover:bg-[#2C2C2E]/30 bg-white dark:bg-transparent'}
                    ${isAssigningLoad ? 'hover:ring-2 hover:ring-inset hover:ring-blue-500 bg-blue-50/10' : ''}`}
                >
                  {/* Selection Highlight */}
                  {isSelected && <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-blue-500 z-20" />}

                  {/* Sidebar Info */}
                  <div className={`w-[180px] md:w-[220px] shrink-0 border-r border-slate-200 dark:border-[#2C2C2E] p-4 flex flex-col justify-center transition-transform z-20 bg-inherit
                      ${isSelected ? 'pl-5' : 'pl-4'}`}>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate flex items-center gap-2">
                      {driver.name}
                      {isAssigningLoad && <span className="opacity-0 group-hover:opacity-100 px-1.5 py-0.5 bg-blue-500 text-white text-[9px] rounded uppercase">Assign</span>}
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

                  {/* Days */}
                  {days.map((day, dIdx) => {
                    const dayBlocks = rowSchedules.filter((s: ScheduleBlock) => s.day === dIdx);
                    
                    // Calculate horizontal positions to prevent overlapping
                    dayBlocks.sort((a, b) => a.startHour - b.startHour);
                    const columns: ScheduleBlock[][] = [];
                    dayBlocks.forEach(block => {
                      let placed = false;
                      for (const col of columns) {
                        const overlaps = col.some(b => {
                          const bStart = b.startHour;
                          const bEnd = b.startHour + b.duration;
                          const start = block.startHour;
                          const end = block.startHour + block.duration;
                          return (start < bEnd && end > bStart);
                        });
                        if (!overlaps) {
                          col.push(block);
                          placed = true;
                          break;
                        }
                      }
                      if (!placed) {
                        columns.push([block]);
                      }
                    });
                    
                    const layoutMap = new Map();
                    columns.forEach((col, colIndex) => {
                      col.forEach(block => {
                        layoutMap.set(block.id, { colIndex, colCount: columns.length });
                      });
                    });
                    
                    return (
                      <div key={`${driver.id}-${dIdx}`} className="flex-1 border-r border-slate-200 dark:border-[#2C2C2E] last:border-r-0 relative overflow-hidden" 
                           style={{ backgroundColor: dIdx % 2 === 0 ? 'transparent' : 'rgba(148, 163, 184, 0.03)' }}>
                        <div className="absolute inset-0 flex pointer-events-none opacity-20 dark:opacity-10">
                           {[...Array(6)].map((_, i) => (
                             <div key={i} className="flex-1 border-r border-slate-300 dark:border-[#2C2C2E]"></div>
                           ))}
                        </div>
                        {dayBlocks.map((block: ScheduleBlock) => {
                          const topPct = (block.startHour / 24) * 100;
                          const heightPct = (block.duration / 24) * 100;
                          
                          const layout = layoutMap.get(block.id) || { colIndex: 0, colCount: 1 };
                          const leftPct = (layout.colIndex / layout.colCount) * 100;
                          const widthPct = (1 / layout.colCount) * 100;
                          let bgClass = block.color === 'active' ? 'bg-blue-500 border-blue-600 text-white shadow-sm' 
                                      : block.color === 'sleeper' ? 'bg-emerald-500 border-emerald-600 text-white shadow-sm' 
                                      : 'bg-slate-200 dark:bg-slate-700/50 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300';
                          
                          if ((block as any).isPhantom) {
                            bgClass = (block as any).hasConflict 
                              ? 'bg-red-500/40 border-red-500/50 text-red-900 shadow-sm border-dashed backdrop-blur-sm dark:bg-red-500/30 dark:text-red-200'
                              : 'bg-blue-500/40 border-blue-500/50 text-blue-900 shadow-sm border-dashed backdrop-blur-sm dark:bg-blue-500/30 dark:text-blue-200';
                          }
                          return (
                            <div 
                               key={block.id}
                               className={`absolute rounded-md transition-all duration-200 hover:scale-[1.02] hover:z-30 flex flex-col justify-center overflow-hidden z-20 border ${bgClass} ${block.id.startsWith('load__') ? 'cursor-pointer' : ''}`}
                               style={{ 
                                 top: `${topPct}%`, 
                                 height: `${heightPct}%`,
                                 left: `calc(${leftPct}% + 1px)`,
                                 width: `calc(${widthPct}% - 2px)`
                               }}
                               title={`${block.startHour}:00 - ${block.duration}hrs`}
                               onClick={(e) => {
                                 if (block.id.startsWith('load__')) {
                                   e.stopPropagation();
                                   const loadId = block.id.split('__')[1];
                                   navigate('loads', loadId);
                                 }
                               }}
                            >
                               {heightPct > 15 && (
                                 <span className="text-[10px] sm:text-xs font-semibold truncate px-2 text-center drop-shadow-sm">
                                   {block.label}
                                 </span>
                               )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DispatchView({ navigate, selectedLoadId }: any) {
  const { drivers, trucks, loads, updateLoad, updateDriver, updateTruck } = useData();
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [conflictPrompt, setConflictPrompt] = useState<{driverId: string, truckId?: string, conflictDesc: string} | null>(null);
  
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(today.setDate(diff));
  });

  const schedules = React.useMemo(() => generateSchedules(drivers, loads, currentWeekStart), [drivers, loads, currentWeekStart]);
  const assigningLoad = loads.find(l => l.id === selectedLoadId);

  const executeAssignment = (driverId: string, truckId?: string) => {
    if (!selectedLoadId) return;
    updateLoad(selectedLoadId, { driverId, truckId, status: 'Dispatched' });
    updateDriver(driverId, { status: 'On Load' });
    if (truckId) {
       updateTruck(truckId, { status: 'In Use', driverId });
    }
    setConflictPrompt(null);
    navigate('loads', selectedLoadId);
  };

  const handleAssignDriver = (driverId: string, truckId?: string) => {
    if (!selectedLoadId || !assigningLoad) return;
    
    const driverLoads = loads.filter((l: any) => l.driverId === driverId && l.id !== selectedLoadId);
    let hasConflict = false;
    let conflictDesc = "";
    
    const pDate = new Date(assigningLoad.pickupDate);
    const dDate = new Date(assigningLoad.deliveryDate);
    
    for (const dl of driverLoads) {
      const dlP = new Date(dl.pickupDate);
      const dlD = new Date(dl.deliveryDate);
      if (dlP <= dDate && dlD >= pDate) {
        hasConflict = true;
        conflictDesc = `Driver is already scheduled for Load ${dl.loadNumber} from ${dlP.toLocaleDateString()} to ${dlD.toLocaleDateString()}, which conflicts with this load (${pDate.toLocaleDateString()} - ${dDate.toLocaleDateString()}).`;
        break;
      }
    }

    if (hasConflict) {
      setConflictPrompt({ driverId, truckId, conflictDesc });
    } else {
      executeAssignment(driverId, truckId);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 dark:bg-black gap-6">
      
      {conflictPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1C1C1E] rounded-xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-[#2C2C2E] overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 text-red-600 dark:text-red-400 mb-4">
                <div className="p-2 bg-red-100 dark:bg-red-500/20 rounded-full">
                  <svg xmlns="http://www.3000.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                </div>
                <h2 className="text-xl font-bold">Time Conflict Detected</h2>
              </div>
              <p className="text-slate-600 dark:text-slate-300 mb-6">
                {conflictPrompt.conflictDesc}
                <br/><br/>
                Are you sure you want to override and assign this load anyway?
              </p>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setConflictPrompt(null)} 
                  className="px-4 py-2 font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-[#2C2C2E] hover:bg-slate-200 dark:hover:bg-[#3A3A3C] rounded-lg transition-colors"
                >
                  Cancel Assignment
                </button>
                <button 
                  onClick={() => executeAssignment(conflictPrompt.driverId, conflictPrompt.truckId)} 
                  className="px-4 py-2 font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-lg shadow-red-600/20"
                >
                  Override & Assign
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {selectedLoadId && assigningLoad && !conflictPrompt && (
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
          assigningLoad={assigningLoad}
          schedules={schedules}
          selectedDriver={selectedDriver}
          setSelectedDriver={setSelectedDriver}
          currentWeekStart={currentWeekStart}
          setCurrentWeekStart={setCurrentWeekStart}
          isAssigningLoad={!!selectedLoadId}
          onAssignDriver={handleAssignDriver}
          navigate={navigate}
        />
      </div>
    </div>
  );
}
