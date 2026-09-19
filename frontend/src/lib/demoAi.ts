const demoCustomers = [
  { name: 'Target Corp', status: 'active', contact: 'ap@target.demo', phone: '612-304-6073', notes: 'High-volume shipper; prefers email PDF invoices.' },
  { name: 'Amazon Logistics', status: 'active', contact: 'billing@amazon.demo', phone: '206-266-1000', notes: 'Frequent dry van lanes.' },
  { name: 'Midwest Goods Inc', status: 'on hold', contact: 'accounting@mwg.demo', phone: '312-555-0199', notes: 'Credit utilization over limit.' },
];

const demoLoads = [
  { load: 'LD-004521', customer: 'Target Corp', route: 'Chicago Terminal → Target Columbus DC', status: 'Invoiced', driver: 'Marcus Williams', revenue: 1039.78 },
  { load: 'LD-004520', customer: 'Amazon Logistics', route: 'Walmart DC #6029 → Target Columbus DC', status: 'Paid', driver: 'Sarah Peterson', revenue: 1247.50 },
  { load: 'LD-004523', customer: 'Midwest Goods Inc', route: 'Chicago Terminal → Walmart DC #6029', status: 'Created', driver: 'Unassigned', revenue: 1450.00 },
];

const demoInvoices = [
  { invoice: 'INV-1001', load: 'LD-004521', customer: 'Target Corp', amount: 1039.78, status: 'open' },
  { invoice: 'INV-1002', load: 'LD-004520', customer: 'Amazon Logistics', amount: 1247.50, status: 'paid' },
];

function money(value: number) {
  return value.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}

export function demoAiAnswer(question: string, backendOffline = false) {
  const q = question.toLowerCase();
  const prefix = backendOffline
    ? 'The backend is not reachable right now, so I am answering from the built-in demo GridTMS data. Start the FastAPI backend on port 8081 to use live Supabase data.\n\n'
    : '';

  if (q.includes('customer') || q.includes('client') || q.includes('target') || q.includes('amazon')) {
    return prefix + 'Demo customers:\n' + demoCustomers.map((c) => `- ${c.name}: ${c.status}, ${c.contact}, ${c.phone}. ${c.notes}`).join('\n');
  }

  if (q.includes('invoice') || q.includes('revenue') || q.includes('paid') || q.includes('money')) {
    const invoiceTotal = demoInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);
    const openTotal = demoInvoices.filter((invoice) => invoice.status !== 'paid').reduce((sum, invoice) => sum + invoice.amount, 0);
    const loadRevenue = demoLoads.reduce((sum, load) => sum + load.revenue, 0);
    return prefix + `Demo financial summary:\n- Recent load revenue: ${money(loadRevenue)}\n- Invoice total: ${money(invoiceTotal)}\n- Open invoices: ${money(openTotal)}\n\nInvoices:\n` + demoInvoices.map((i) => `- ${i.invoice}: ${i.customer}, ${money(i.amount)}, ${i.status}`).join('\n');
  }

  if (q.includes('load') || q.includes('dispatch') || q.includes('driver')) {
    return prefix + 'Demo loads:\n' + demoLoads.map((l) => `- ${l.load}: ${l.customer}, ${l.route}, ${l.status}, driver: ${l.driver}, revenue: ${money(l.revenue)}`).join('\n');
  }

  if (q.includes('compliance') || q.includes('audit') || q.includes('dot')) {
    return prefix + 'Demo compliance summary:\n- DOT audit readiness: 95%\n- Driver qualification files: current\n- HOS/ELD audit: no critical issues shown in demo data\n- Maintenance records: demo account appears audit-ready';
  }

  return prefix + 'I can help with customers, loads, invoices, revenue, dispatch, settlements, and compliance. Try asking: “Who are my customers?”, “Which loads are open?”, or “What revenue do I have?”';
}
