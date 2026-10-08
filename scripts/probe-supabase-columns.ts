import { supabase } from '../frontend/src/lib/supabase';

async function probeTables() {
  if (!supabase) {
    console.error('No supabase client');
    process.exit(1);
  }

  const tables = [
    'tms_customers',
    'tms_locations',
    'tms_drivers',
    'tms_trucks',
    'tms_loads',
    'tms_invoices',
    'tms_settlements',
    'tms_recurring_rules',
    'tms_company_settings'
  ];

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`Table ${table} error:`, error.message);
    } else {
      console.log(`Table ${table} sample record keys:`, data && data.length > 0 ? Object.keys(data[0]) : '(empty table)');
    }
  }
}

probeTables();
