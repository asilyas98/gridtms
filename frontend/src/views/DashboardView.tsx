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
  ArrowUpRight
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
        <TrendingUp size={14} className="text-teal" />
        <span className="text-[10px] font-bold text-teal">{trend} vs last month</span>
      </div>
    )}
  </motion.div>
);

export default function DashboardView() {
  const { loads, customers } = useData();
  const activeLoads = loads.length;
  const needsInvoicing = loads.filter(l => l.status === 'Delivered').length;
  const totalRevenue = loads.reduce((acc, curr) => acc + (Number.isNaN(curr.rate) ? 0 : curr.rate), 0);

  // Group revenue by customer for the bar chart
  const revenueByCustomer = customers.map(c => ({
    name: c.name,
    value: loads.filter(l => l.customerId === c.id).reduce((acc, curr) => acc + (Number.isNaN(curr.rate) ? 0 : curr.rate), 0)
  })).sort((a, b) => b.value - a.value).slice(0, 5);

  // Mock trend data based on current loads (distributing current loads across mock dates)
  const trendData = [
    { name: 'Mon', revenue: 4200, volume: 3 },
    { name: 'Tue', revenue: 3800, volume: 2 },
    { name: 'Wed', revenue: 5100, volume: 4 },
    { name: 'Thu', revenue: 4700, volume: 3 },
    { name: 'Fri', revenue: 6200, volume: 5 },
    { name: 'Sat', revenue: 2100, volume: 1 },
    { name: 'Sun', revenue: 1800, volume: 1 }
  ];

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
          trend="+12%" 
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
          trend="+8.4%" 
          color="bg-teal" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 tms-card p-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h4 className="font-head text-lg font-bold text-navy-dark">Revenue Trend</h4>
              <p className="text-[10px] text-slate-400 uppercase font-bold">Weekly Performance</p>
            </div>
            <div className="flex items-center gap-1 text-teal font-bold text-xs">
              <TrendingUp size={14} /> 12.5% Up
            </div>
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
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                  {revenueByCustomer.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
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
            {loads.slice(0, 4).map((load, index) => (
              <div key={load.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                <div className="flex items-center gap-4">
                   <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 
                     ${load.status === 'Delivered' ? 'bg-teal/10 text-teal' : 'bg-orange/10 text-orange'}`}>
                     {load.status === 'Delivered' ? <FileText size={14} /> : <Truck size={14} />}
                   </div>
                   <div>
                     <p className="text-xs font-bold text-navy-dark group-hover:text-orange transition-colors">
                       Load {load.loadNumber} {load.status === 'Delivered' ? 'delivered to consignee' : 'is currently in transit'}
                     </p>
                     <p className="text-[10px] text-slate-400 mt-0.5">2 hours ago · Automated TMS Bridge</p>
                   </div>
                </div>
                <button className="p-2 text-slate-300 hover:text-navy transition-colors opacity-0 group-hover:opacity-100">
                  <ArrowUpRight size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="tms-card p-6">
          <h4 className="font-head text-lg font-bold text-navy-dark mb-6">Fleet Integrity</h4>
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-600">Active Carrier Verification</span>
                <span className="font-mono text-teal">100%</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-teal" style={{ width: '100%' }} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-600">Insurance Compliance</span>
                <span className="font-mono text-orange">94.8%</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-orange" style={{ width: '94.8%' }} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-600">Safety Rating (DOT)</span>
                <span className="font-mono text-blue-500">Satisfactory</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500" style={{ width: '100%' }} />
              </div>
            </div>
          </div>
          
          <div className="mt-8 p-4 bg-orange/5 border border-orange/10 rounded-xl">
             <h5 className="text-[10px] font-bold text-orange uppercase tracking-widest mb-1 flex items-center gap-1.5">
               <AlertCircle size={12} /> Compliance Notice
             </h5>
             <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
               2 drivers have expiring medical certificates within 30 days. Action required to maintain dispatch eligibility.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}

