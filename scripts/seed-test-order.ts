/**
 * Seed script to create a test order for customer lookup testing
 * Run with: npx tsx scripts/seed-test-order.ts
 */

import { createClient } from '@supabase/supabase-js';

async function seedTestOrder() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Test order details - use these to look up the order
  const testOrder = {
    order_number: '1001',
    customer_name: 'Test Customer',
    customer_email: 'test@example.com',
    customer_phone: '(555) 123-4567',
    customer_phone_normalized: '+15551234567',
    items_description: 'Blue Jacket (M)',
    quantity: 1,
    is_cancelled: false,
    is_delayed: false,
  };

  console.log('Creating test order...');

  // Check if order already exists
  const { data: existing } = await supabase
    .from('orders')
    .select('id')
    .eq('order_number', testOrder.order_number)
    .single();

  if (existing) {
    console.log('Test order #1001 already exists');
    console.log('\n📱 Test lookup with:');
    console.log('   Order Number: #1001');
    console.log('   Phone: (555) 123-4567');
    process.exit(0);
  }

  // Insert the test order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert(testOrder)
    .select()
    .single();

  if (orderError) {
    console.error('Error creating order:', orderError);
    process.exit(1);
  }

  console.log('Test order created!');

  // Get all stages
  const { data: stages } = await supabase
    .from('stages')
    .select('*')
    .order('sort_order', { ascending: true });

  if (stages && stages.length > 0) {
    // Create progress records for each stage
    const progressRecords = stages.map((stage, index) => ({
      order_id: order.id,
      stage_id: stage.id,
      status: index === 0 ? 'completed' : index === 1 ? 'in_progress' : 'not_started',
      started_at: index <= 1 ? new Date().toISOString() : null,
      completed_at: index === 0 ? new Date().toISOString() : null,
    }));

    const { error: progressError } = await supabase
      .from('order_progress')
      .insert(progressRecords);

    if (progressError) {
      console.error('Error creating progress:', progressError);
    } else {
      console.log('Progress records created (Stage 1 completed, Stage 2 in progress)');
    }
  }

  console.log('\n✅ Test order ready!');
  console.log('\n📱 Test lookup with:');
  console.log('   Order Number: #1001');
  console.log('   Phone: (555) 123-4567');
}

seedTestOrder().catch(console.error);
