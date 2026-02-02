/**
 * Update admin user credentials
 * Run with: ADMIN_EMAIL=tommy32sch@gmail.com ADMIN_PASSWORD=Papito123$ npx tsx scripts/update-admin.ts
 */

import { createClient } from '@supabase/supabase-js';
import { hash } from 'bcryptjs';

async function updateAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const newEmail = process.env.ADMIN_EMAIL;
  const newPassword = process.env.ADMIN_PASSWORD;

  if (!newEmail || !newPassword) {
    console.error('Please provide ADMIN_EMAIL and ADMIN_PASSWORD');
    process.exit(1);
  }

  console.log(`Updating admin credentials...`);

  // Hash the new password
  const passwordHash = await hash(newPassword, 12);

  // Get the first admin user (or you can specify by email)
  const { data: admins } = await supabase
    .from('admin_users')
    .select('id, email')
    .limit(1);

  if (!admins || admins.length === 0) {
    console.error('No admin user found. Creating new admin...');
    const { data, error } = await supabase
      .from('admin_users')
      .insert({
        email: newEmail,
        password_hash: passwordHash,
        name: 'Admin User',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating admin:', error);
      process.exit(1);
    }

    console.log('✅ New admin user created successfully!');
    console.log(`Email: ${newEmail}`);
    process.exit(0);
  }

  const adminId = admins[0].id;

  // Update the admin user
  const { error } = await supabase
    .from('admin_users')
    .update({
      email: newEmail,
      password_hash: passwordHash,
    })
    .eq('id', adminId);

  if (error) {
    console.error('Error updating admin:', error);
    process.exit(1);
  }

  console.log('✅ Admin credentials updated successfully!');
  console.log(`Email: ${newEmail}`);
}

updateAdmin().catch(console.error);
