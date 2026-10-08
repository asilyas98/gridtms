import { supabase } from '../frontend/src/lib/supabase';
import crypto from 'crypto';

async function testInsert() {
  if (!supabase) return;

  const id1 = crypto.randomUUID();
  console.log('Testing tms_locations insert with UUID id:', id1);
  const res1 = await supabase.from('tms_locations').insert([{
    id: id1,
    name: 'Test Location',
    address: '123 Main St',
    city: 'Chicago',
    state: 'IL',
    zip: '60601'
  }]);
  console.log('Without owner_id result:', res1.error ? res1.error.message : 'SUCCESS');

  const id2 = crypto.randomUUID();
  const ownerId = crypto.randomUUID();
  const res2 = await supabase.from('tms_locations').insert([{
    id: id2,
    name: 'Test Location 2',
    address: '123 Main St',
    city: 'Chicago',
    state: 'IL',
    zip: '60601',
    owner_id: ownerId
  }]);
  console.log('With owner_id uuid result:', res2.error ? res2.error.message : 'SUCCESS');

  // Also test tms_customers with exact columns from gridtms_backend_setup.sql
  const id3 = crypto.randomUUID();
  const res3 = await supabase.from('tms_customers').insert([{
    id: id3,
    company_name: 'Test Customer',
    email: 'test@example.com',
    phone: '555-1234',
    address: '100 Test Way',
    city: 'Chicago',
    state: 'IL',
    zip: '60601'
  }]);
  console.log('tms_customers result:', res3.error ? res3.error.message : 'SUCCESS');

  // Clean up
  await supabase.from('tms_locations').delete().in('id', [id1, id2]);
  await supabase.from('tms_customers').delete().eq('id', id3);
}

testInsert();
