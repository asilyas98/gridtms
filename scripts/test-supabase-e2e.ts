import { supabase } from '../frontend/src/lib/supabase';
import crypto from 'crypto';

interface TestResult {
  table: string;
  insert: boolean;
  select: boolean;
  update: boolean;
  delete: boolean;
  error?: string;
  notes?: string;
}

async function runE2ECRUDTests() {
  console.log('=== Starting Isolated Supabase Live E2E CRUD Verification ===\n');

  if (!supabase) {
    console.error('Supabase client is not configured.');
    process.exit(1);
  }

  const results: TestResult[] = [];

  // Helper to ensure test record deletion regardless of test outcome
  const cleanup = async (table: string, id: string) => {
    try {
      await supabase.from(table).delete().eq('id', id);
    } catch (e) {}
  };

  // 1. tms_customers
  {
    const id = crypto.randomUUID();
    try {
      const testRecord = {
        id,
        company_name: 'E2E Test Shipper Corp',
        email: 'test@shippercorp.io',
        phone: '(555) 019-2831',
        credit_limit: 50000,
        payment_terms: 'Net 30 Days',
        status: 'Active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error: insErr } = await supabase.from('tms_customers').insert([testRecord]);
      if (insErr) throw new Error('Insert failed: ' + insErr.message);

      const { data: selData, error: selErr } = await supabase.from('tms_customers').select('*').eq('id', id).single();
      if (selErr || !selData) throw new Error('Select failed: ' + (selErr?.message || 'Not found'));

      const { error: updErr } = await supabase.from('tms_customers').update({ company_name: 'E2E Updated Corp' }).eq('id', id);
      if (updErr) throw new Error('Update failed: ' + updErr.message);

      const { error: delErr } = await supabase.from('tms_customers').delete().eq('id', id);
      if (delErr) throw new Error('Delete failed: ' + delErr.message);

      results.push({ table: 'tms_customers', insert: true, select: true, update: true, delete: true });
      console.log('✓ tms_customers: Full CRUD verified & cleaned up');
    } catch (err: any) {
      results.push({ table: 'tms_customers', insert: false, select: false, update: false, delete: false, error: err.message });
      console.error('✗ tms_customers failed:', err.message);
    } finally {
      await cleanup('tms_customers', id);
    }
  }

  // 2. tms_locations
  {
    const id = crypto.randomUUID();
    try {
      const testRecord = {
        id,
        name: 'E2E Chicago Terminal Hub',
        location_type: 'Shipper',
        address: '700 S Desplaines St',
        city: 'Chicago',
        state: 'IL',
        zip: '60607',
        country: 'USA',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error: insErr } = await supabase.from('tms_locations').insert([testRecord]);
      if (insErr) throw new Error('Insert failed: ' + insErr.message);

      const { data: selData, error: selErr } = await supabase.from('tms_locations').select('*').eq('id', id).single();
      if (selErr || !selData) throw new Error('Select failed: ' + (selErr?.message || 'Not found'));

      const { error: updErr } = await supabase.from('tms_locations').update({ name: 'E2E Chicago Hub Updated' }).eq('id', id);
      if (updErr) throw new Error('Update failed: ' + updErr.message);

      const { error: delErr } = await supabase.from('tms_locations').delete().eq('id', id);
      if (delErr) throw new Error('Delete failed: ' + delErr.message);

      results.push({ table: 'tms_locations', insert: true, select: true, update: true, delete: true });
      console.log('✓ tms_locations: Full CRUD verified & cleaned up');
    } catch (err: any) {
      results.push({ table: 'tms_locations', insert: false, select: false, update: false, delete: false, error: err.message });
      console.error('✗ tms_locations failed:', err.message);
    } finally {
      await cleanup('tms_locations', id);
    }
  }

  // 3. tms_drivers
  {
    const id = crypto.randomUUID();
    try {
      const testRecord = {
        id,
        full_name: 'E2E Test Driver',
        phone: '(555) 444-3322',
        license_number: 'CDL-TEST-9921',
        cdl_state: 'IL',
        status: 'Available',
        hos_duty_status: 'Off Duty',
        hos_available: '11h 00m',
        hos_violations: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error: insErr } = await supabase.from('tms_drivers').insert([testRecord]);
      if (insErr) throw new Error('Insert failed: ' + insErr.message);

      const { data: selData, error: selErr } = await supabase.from('tms_drivers').select('*').eq('id', id).single();
      if (selErr || !selData) throw new Error('Select failed: ' + (selErr?.message || 'Not found'));

      const { error: updErr } = await supabase.from('tms_drivers').update({ full_name: 'E2E Driver Updated' }).eq('id', id);
      if (updErr) throw new Error('Update failed: ' + updErr.message);

      const { error: delErr } = await supabase.from('tms_drivers').delete().eq('id', id);
      if (delErr) throw new Error('Delete failed: ' + delErr.message);

      results.push({ table: 'tms_drivers', insert: true, select: true, update: true, delete: true });
      console.log('✓ tms_drivers: Full CRUD verified & cleaned up');
    } catch (err: any) {
      results.push({ table: 'tms_drivers', insert: false, select: false, update: false, delete: false, error: err.message });
      console.error('✗ tms_drivers failed:', err.message);
    } finally {
      await cleanup('tms_drivers', id);
    }
  }

  // 4. tms_trucks
  {
    const id = crypto.randomUUID();
    try {
      const testRecord = {
        id,
        unit_number: 'TRK-9901',
        make_model: 'Freightliner Cascadia 2024',
        truck_type: 'Sleeper',
        vin: '1FUJGLDR5PLBP1234',
        status: 'Available',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error: insErr } = await supabase.from('tms_trucks').insert([testRecord]);
      if (insErr) throw new Error('Insert failed: ' + insErr.message);

      const { data: selData, error: selErr } = await supabase.from('tms_trucks').select('*').eq('id', id).single();
      if (selErr || !selData) throw new Error('Select failed: ' + (selErr?.message || 'Not found'));

      const { error: updErr } = await supabase.from('tms_trucks').update({ status: 'Maintenance' }).eq('id', id);
      if (updErr) throw new Error('Update failed: ' + updErr.message);

      const { error: delErr } = await supabase.from('tms_trucks').delete().eq('id', id);
      if (delErr) throw new Error('Delete failed: ' + delErr.message);

      results.push({ table: 'tms_trucks', insert: true, select: true, update: true, delete: true });
      console.log('✓ tms_trucks: Full CRUD verified & cleaned up');
    } catch (err: any) {
      results.push({ table: 'tms_trucks', insert: false, select: false, update: false, delete: false, error: err.message });
      console.error('✗ tms_trucks failed:', err.message);
    } finally {
      await cleanup('tms_trucks', id);
    }
  }

  // 5. tms_loads
  {
    const id = crypto.randomUUID();
    try {
      const testRecord = {
        id,
        load_number: 'LD-E2E-1001',
        status: 'Created',
        revenue: 2450.00,
        miles: 450,
        commodity: 'General Freight',
        equipment: "Dry Van 53'",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error: insErr } = await supabase.from('tms_loads').insert([testRecord]);
      if (insErr) throw new Error('Insert failed: ' + insErr.message);

      const { data: selData, error: selErr } = await supabase.from('tms_loads').select('*').eq('id', id).single();
      if (selErr || !selData) throw new Error('Select failed: ' + (selErr?.message || 'Not found'));

      const { error: updErr } = await supabase.from('tms_loads').update({ status: 'Dispatched' }).eq('id', id);
      if (updErr) throw new Error('Update failed: ' + updErr.message);

      const { error: delErr } = await supabase.from('tms_loads').delete().eq('id', id);
      if (delErr) throw new Error('Delete failed: ' + delErr.message);

      results.push({ table: 'tms_loads', insert: true, select: true, update: true, delete: true });
      console.log('✓ tms_loads: Full CRUD verified & cleaned up');
    } catch (err: any) {
      results.push({ table: 'tms_loads', insert: false, select: false, update: false, delete: false, error: err.message });
      console.error('✗ tms_loads failed:', err.message);
    } finally {
      await cleanup('tms_loads', id);
    }
  }

  // 6. tms_invoices
  {
    const id = crypto.randomUUID();
    try {
      const testRecord = {
        id,
        invoice_number: 'INV-E2E-501',
        amount: 2450.00,
        status: 'Draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error: insErr } = await supabase.from('tms_invoices').insert([testRecord]);
      if (insErr) throw new Error('Insert failed: ' + insErr.message);

      const { data: selData, error: selErr } = await supabase.from('tms_invoices').select('*').eq('id', id).single();
      if (selErr || !selData) throw new Error('Select failed: ' + (selErr?.message || 'Not found'));

      const { error: updErr } = await supabase.from('tms_invoices').update({ status: 'Sent' }).eq('id', id);
      if (updErr) throw new Error('Update failed: ' + updErr.message);

      const { error: delErr } = await supabase.from('tms_invoices').delete().eq('id', id);
      if (delErr) throw new Error('Delete failed: ' + delErr.message);

      results.push({ table: 'tms_invoices', insert: true, select: true, update: true, delete: true });
      console.log('✓ tms_invoices: Full CRUD verified & cleaned up');
    } catch (err: any) {
      results.push({ table: 'tms_invoices', insert: false, select: false, update: false, delete: false, error: err.message });
      console.error('✗ tms_invoices failed:', err.message);
    } finally {
      await cleanup('tms_invoices', id);
    }
  }

  // 7. tms_settlements
  {
    const id = crypto.randomUUID();
    try {
      const testRecord = {
        id,
        settlement_number: 'SET-E2E-201',
        pay_method: 'CPM',
        pay_rate: 0.65,
        net_pay: 1450.00,
        status: 'PENDING',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error: insErr } = await supabase.from('tms_settlements').insert([testRecord]);
      if (insErr) throw new Error('Insert failed: ' + insErr.message);

      const { data: selData, error: selErr } = await supabase.from('tms_settlements').select('*').eq('id', id).single();
      if (selErr || !selData) throw new Error('Select failed: ' + (selErr?.message || 'Not found'));

      const { error: updErr } = await supabase.from('tms_settlements').update({ status: 'PAID' }).eq('id', id);
      if (updErr) throw new Error('Update failed: ' + updErr.message);

      const { error: delErr } = await supabase.from('tms_settlements').delete().eq('id', id);
      if (delErr) throw new Error('Delete failed: ' + delErr.message);

      results.push({ table: 'tms_settlements', insert: true, select: true, update: true, delete: true });
      console.log('✓ tms_settlements: Full CRUD verified & cleaned up');
    } catch (err: any) {
      results.push({ table: 'tms_settlements', insert: false, select: false, update: false, delete: false, error: err.message });
      console.error('✗ tms_settlements failed:', err.message);
    } finally {
      await cleanup('tms_settlements', id);
    }
  }

  // 8. tms_recurring_rules
  {
    const id = crypto.randomUUID();
    try {
      const testRecord = {
        id,
        rule_name: 'Weekly Escrow Reserve',
        rule_type: 'DEDUCTION',
        amount: 150.00,
        frequency: 'WEEKLY',
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error: insErr } = await supabase.from('tms_recurring_rules').insert([testRecord]);
      if (insErr) throw new Error('Insert failed: ' + insErr.message);

      const { data: selData, error: selErr } = await supabase.from('tms_recurring_rules').select('*').eq('id', id).single();
      if (selErr || !selData) throw new Error('Select failed: ' + (selErr?.message || 'Not found'));

      const { error: updErr } = await supabase.from('tms_recurring_rules').update({ amount: 175.00 }).eq('id', id);
      if (updErr) throw new Error('Update failed: ' + updErr.message);

      const { error: delErr } = await supabase.from('tms_recurring_rules').delete().eq('id', id);
      if (delErr) throw new Error('Delete failed: ' + delErr.message);

      results.push({ table: 'tms_recurring_rules', insert: true, select: true, update: true, delete: true });
      console.log('✓ tms_recurring_rules: Full CRUD verified & cleaned up');
    } catch (err: any) {
      results.push({ table: 'tms_recurring_rules', insert: false, select: false, update: false, delete: false, error: err.message });
      console.error('✗ tms_recurring_rules failed:', err.message);
    } finally {
      await cleanup('tms_recurring_rules', id);
    }
  }

  // 9. tms_company_settings
  {
    const id = 'company-test-settings-' + Date.now();
    try {
      const testRecord = {
        id,
        carrier_name: 'Apex Logistics Freight LLC',
        dot_number: '3829104',
        mc_number: '1192842',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error: upsErr } = await supabase.from('tms_company_settings').upsert([testRecord]);
      if (upsErr) throw new Error('Upsert failed: ' + upsErr.message);

      const { data: selData, error: selErr } = await supabase.from('tms_company_settings').select('*').eq('id', id).single();
      if (selErr || !selData) throw new Error('Select failed: ' + (selErr?.message || 'Not found'));

      const { error: updErr } = await supabase.from('tms_company_settings').update({ carrier_name: 'Apex Updated Corp' }).eq('id', id);
      if (updErr) throw new Error('Update failed: ' + updErr.message);

      const { error: delErr } = await supabase.from('tms_company_settings').delete().eq('id', id);
      if (delErr) throw new Error('Delete failed: ' + delErr.message);

      results.push({ table: 'tms_company_settings', insert: true, select: true, update: true, delete: true });
      console.log('✓ tms_company_settings: Full CRUD verified & cleaned up');
    } catch (err: any) {
      results.push({ table: 'tms_company_settings', insert: false, select: false, update: false, delete: false, error: err.message });
      console.error('✗ tms_company_settings failed:', err.message);
    } finally {
      await cleanup('tms_company_settings', id);
    }
  }

  console.log('\n=== E2E Test Summary ===');
  const passed = results.filter(r => r.insert && r.select && r.update && r.delete).length;
  console.log(`Passed: ${passed} / ${results.length} tables verified with complete test isolation.`);

  if (passed < results.length) {
    console.log('\nRLS Policy Notice:');
    console.log('Tables encountering RLS policy restrictions require running SUPABASE_ENABLE_ACCESS.sql in your Supabase SQL editor to grant anon access.');
  }
}

runE2ECRUDTests();
