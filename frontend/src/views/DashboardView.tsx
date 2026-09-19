import React from 'react';
import { 
  Users, 
  Truck, 
  MapPin, 
  DollarSign, 
  TrendingUp, 
  AlertCircle,
  FileText,
  LayoutDashboard,
  ArrowUpRight,
  CheckCircle2
} from 'lucide-react';
import { motion } from 'motion/react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { useData } from '../context/DataContext';

const StatCard = ({ icon: Icon, label, value, subtext, trend, color }: any) => (
  <motion.div 
    whileHover={{ y: -2 }}
    className="tms-card p-5"
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{label}</p>
        <h3 className="font-head text-3xl font-extrabold text-navy-dark">{value}</h3>
        <p className="text-xs text-slate-400 mt-1">{subtext}</p>
      </div>
      <div className={`p-2 rounded-lg bg-opacity-10 ${color}`}>
        <Icon size={20} className={color.replace('bg-', 'text-')} />
      </div>
    </div>
    {trend && (
      <div className="mt-4 pt-4 border-t border-slate-50 flex items-center gap-2">
        <TrendingUp size={14} className={trend.startsWith('+') ? "text-teal" : "text-orange"} />
        <span className={`text-[10px] font-bold ${trend.startsWith('+') ? "text-teal" : "text-orange"}`}>{trend} vs last month</span>
      </div>
    )}
  </motion.div>
);

export default function DashboardView() {
  const { loads, customers, carrierCompliance, drivers, setNavigationIntent } = useData();
  
  const activeLoads = loads.filter(l => !['Delivered', 'Invoiced', 'Paid', 'Cancelled'].includes(l.status)).length;
  const needsInvoicing = loads.filter(l => l.status === 'Delivered').length;
  const totalRevenue = loads.reduce((acc, curr) => acc + (Number.isNaN(Number(curr.rate)) ? 0 : Number(curr.rate)), 0);

  // Group revenue by customer for the bar chart
  const revenueByCustomer = customers.map(c => ({
    name: c.name,
    value: loads.filter(l => l.customerId === c.id).reduce((acc, curr) => acc + (Number.isNaN(Number(curr.rate)) ? 0 : Number(curr.rate)), 0)
  })).sort((a, b) => b.value - a.value).slice(0, 5);

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const trendDataRaw = [0, 1, 2, 3, 4, 5, 6].map(i => ({ name: dayNames[i], revenue: 0, volume: 0 }));

  const now = new Date();
  const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  let loadsThisMonth = 0;
  let loadsLastMonth = 0;
  let revThisMonth = 0;
  let revLastMonth = 0;

  loads.forEach(load => {
    if (load.pickupDate) {
      const d = new Date(load.pickupDate);
      if (!isNaN(d.getTime())) {
        // Daily trend data
        const day = d.getDay();
        trendDataRaw[day].revenue += (Number.isNaN(Number(load.rate)) ? 0 : Number(load.rate));
        trendDataRaw[day].volume += 1;

        // Monthly trends
        const rate = (Number.isNaN(Number(load.rate)) ? 0 : Number(load.rate));
        if (d >= firstDayThisMonth) {
          loadsThisMonth++;
          revThisMonth += rate;
        } else if (d >= firstDayLastMonth && d < firstDayThisMonth) {
          loadsLastMonth++;
          revLastMonth += rate;
        }
      }
    }
  });

  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? '+100%' : null;
    const diff = current - previous;
    const percentage = (diff / previous) * 100;
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(1)}%`;
  };

  const loadTrend = calculateTrend(loadsThisMonth, loadsLastMonth);
  const revTrend = calculateTrend(revThisMonth, revLastMonth);

  const today = new Date().getDay();
  // Rotate array so it ends with today
  const trendData: {name: string, revenue: number, volume: number}[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = (today - i + 7) % 7;
    trendData.push(trendDataRaw[d]);
  }

  // Fleet Integrity Real Data
  const hasActiveCarrier = carrierCompliance?.mcNumber || carrierCompliance?.dotNumber;
  const carrierVerificationPercent = hasActiveCarrier ? 100 : 0;
  
  const hasInsurance = carrierCompliance?.insuranceExpiry ? new Date(carrierCompliance.insuranceExpiry) > new Date() : false;
  const insuranceCompliancePercent = hasInsurance ? 100 : 0;

  const safetyRating = carrierCompliance?.safetyRating || 'Not Rated';
  let safetyColor = 'bg-slate-300';
  let safetyTextColor = 'text-slate-500';
  if (safetyRating.toLowerCase() === 'satisfactory') {
    safetyColor = 'bg-blue-500';
    safetyTextColor = 'text-blue-500';
  } else if (safetyRating.toLowerCase() === 'conditional') {
    safetyColor = 'bg-orange';
    safetyTextColor = 'text-orange';
  } else if (safetyRating.toLowerCase() === 'unsatisfactory') {
    safetyColor = 'bg-red-500';
    safetyTextColor = 'text-red-500';
  }

  const nonCompliantDrivers = drivers.filter(d => {
    if (!d.complianceDocs || d.complianceDocs.length === 0) return true;
    return d.complianceDocs.some(doc => {
      if (!doc.expiryDate) return true;
      const expiry = new Date(doc.expiryDate);
      const daysUntilExpiry = (expiry.getTime() - new Date().getTime()) / (1000 * 3600 * 24);
      return daysUntilExpiry <= 30;
    });
  }).length;

  const COLORS = ['#FF6600', '#004A7C', '#009688', '#9C27B0', '#607D8B'];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-head font-extrabold text-navy-dark">Operational Overview</h2>
          <p className="text-sm text-slate-500">Real-time stats from the Grid backbone.</p>
        </div>
        <div className="flex gap-2">
           <button className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-lg text-xs font-bold text-navy hover:border-orange transition-all">
             <LayoutDashboard size={14} /> Full Export
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={Truck} 
          label="Active Loads" 
          value={activeLoads} 
          subtext="Loads currently in system" 
          trend={loadTrend} 
          color="bg-blue-500" 
        />
        <StatCard 
          icon={Users} 
          label="Active Customers" 
          value={customers.filter(c => c.status === 'Active').length} 
          subtext="Revenue-generating clients" 
          color="bg-orange" 
        />
        <StatCard 
          icon={AlertCircle} 
          label="Pending Invoicing" 
          value={needsInvoicing} 
          subtext="Action required items" 
          color="bg-red-500" 
        />
        <StatCard 
          icon={DollarSign} 
          label="Gross Revenue" 
          value={`$${totalRevenue.toLocaleString()}`} 
          subtext="Current period pipeline" 
          trend={revTrend} 
          color="bg-teal" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 tms-card p-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h4 className="font-head text-lg font-bold text-navy-dark">Revenue Trend</h4>
              <p className="text-[10px] text-slate-400 uppercase font-bold">Past 7 Days Performance</p>
            </div>
            {revTrend && (
              <div className={`flex items-center gap-1 font-bold text-xs ${revTrend.startsWith('+') ? "text-teal" : "text-orange"}`}>
                <TrendingUp size={14} /> {revTrend} This Month
              </div>
            )}
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF6600" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#FF6600" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                  formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'Revenue']}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#FF6600" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorRev)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="tms-card p-6">
          <h4 className="font-head text-lg font-bold text-navy-dark mb-8">Top Customers</h4>
          <div className="h-[300px] w-full">
            {revenueByCustomer.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueByCustomer} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#475569', fontWeight: 700 }}
                    width={80}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                    formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'Revenue']}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                    {revenueByCustomer.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
                No customer revenue data yet
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="tms-card overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h4 className="font-head text-lg font-bold text-navy-dark">Recent Activity</h4>
            <div className="flex gap-2">
               <span className="p-1.5 bg-slate-50 rounded-md text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Realtime Stream</span>
            </div>
          </div>
          <div className="divide-y divide-slate-50">
            {loads.slice(-4).reverse().map((load) => (
              <div key={load.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                <div className="flex items-center gap-4">
                   <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 
                     ${load.status === 'Delivered' ? 'bg-teal/10 text-teal' : 'bg-orange/10 text-orange'}`}>
                     {load.status === 'Delivered' ? <FileText size={14} /> : <Truck size={14} />}
                   </div>
                   <div>
                     <p className="text-xs font-bold text-navy-dark group-hover:text-orange transition-colors">
                       Load {load.loadNumber} {load.status === 'Delivered' ? 'delivered to consignee' : `is currently ${load.status.toLowerCase()}`}
                     </p>
                     <p className="text-[10px] text-slate-400 mt-0.5">
                       {load.pickupDate ? new Date(load.pickupDate).toLocaleDateString() : 'Recent'} · Automated TMS Bridge
                     </p>
                   </div>
                </div>
                <button className="p-2 text-slate-300 hover:text-navy transition-colors opacity-0 group-hover:opacity-100">
                  <ArrowUpRight size={16} />
                </button>
              </div>
            ))}
            {loads.length === 0 && (
              <div className="p-8 text-center text-sm text-slate-400">
                No recent loads found.
              </div>
            )}
          </div>
        </div>

        <div className="tms-card p-6">
          <h4 className="font-head text-lg font-bold text-navy-dark mb-6">Fleet Integrity</h4>
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-600">Active Carrier Verification</span>
                <span className={`font-mono ${hasActiveCarrier ? 'text-teal' : 'text-slate-500'}`}>{hasActiveCarrier ? '100%' : 'Not Configured'}</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${hasActiveCarrier ? 'bg-teal' : 'bg-slate-300'}`} style={{ width: `${hasActiveCarrier ? 100 : 0}%` }} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-600">Insurance Compliance</span>
                <span className={`font-mono ${insuranceCompliancePercent === 100 ? 'text-teal' : (carrierCompliance?.insuranceExpiry ? 'text-orange' : 'text-slate-500')}`}>
                  {insuranceCompliancePercent === 100 ? 'Active' : (carrierCompliance?.insuranceExpiry ? 'Expired' : 'Not Configured')}
                </span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${insuranceCompliancePercent === 100 ? 'bg-teal' : (carrierCompliance?.insuranceExpiry ? 'bg-orange' : 'bg-slate-300')}`} style={{ width: `${insuranceCompliancePercent === 100 ? 100 : 0}%` }} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-600">Safety Rating (DOT)</span>
                <span className={`font-mono ${safetyTextColor}`}>{safetyRating}</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${safetyColor}`} style={{ width: '100%' }} />
              </div>
            </div>
          </div>
          
          <div 
            className={`mt-8 p-4 ${nonCompliantDrivers > 0 ? 'bg-orange/5 border-orange/10 hover:bg-orange/10 cursor-pointer' : (drivers.length === 0 ? 'bg-slate-50 border-slate-100' : 'bg-teal/5 border-teal/10')} border rounded-xl transition-colors`}
            onClick={() => nonCompliantDrivers > 0 && setNavigationIntent({ view: 'compliance', tab: 'Drivers' })}
            role={nonCompliantDrivers > 0 ? "button" : undefined}
            tabIndex={nonCompliantDrivers > 0 ? 0 : undefined}
          >
             <div className="flex items-center justify-between mb-1">
               <h5 className={`text-[10px] font-bold ${nonCompliantDrivers > 0 ? 'text-orange' : (drivers.length === 0 ? 'text-slate-500' : 'text-teal')} uppercase tracking-widest flex items-center gap-1.5`}>
                 {nonCompliantDrivers > 0 ? <AlertCircle size={12} /> : (drivers.length === 0 ? <AlertCircle size={12} /> : <CheckCircle2 size={12} />)} 
                 Compliance Notice
               </h5>
               {nonCompliantDrivers > 0 && <ArrowUpRight size={14} className="text-orange" />}
             </div>
             <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
               {nonCompliantDrivers > 0 
                 ? `${nonCompliantDrivers} driver(s) have missing, expired, or expiring medical certificates/documents. Action required to maintain dispatch eligibility.`
                 : (drivers.length === 0 ? 'No drivers currently exist in the system to verify compliance.' : 'All driver compliance documents are up to date and verified.')}
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}


