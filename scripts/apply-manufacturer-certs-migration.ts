import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function applyMigration() {
  console.log('🚀 Applying manufacturer_certifications migration...\n');

  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260421_manufacturer_certifications.sql');
  
  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Migration file not found:', migrationPath);
    return;
  }

  const sql = fs.readFileSync(migrationPath, 'utf-8');
  
  console.log('📄 Migration SQL:');
  console.log('━'.repeat(80));
  console.log(sql);
  console.log('━'.repeat(80));
  console.log('');

  try {
    // Note: Supabase JS client doesn't support raw SQL execution for security
    // We need to use the database connection or Supabase SQL Editor
    console.log('⚠️  Cannot apply migration via JS client (security restriction)');
    console.log('');
    console.log('📋 To apply this migration, you have 2 options:');
    console.log('');
    console.log('Option 1: Supabase Dashboard (Recommended)');
    console.log('━'.repeat(80));
    console.log('1. Go to https://supabase.com/dashboard');
    console.log('2. Select your project');
    console.log('3. Navigate to SQL Editor');
    console.log('4. Paste the migration SQL above');
    console.log('5. Click "Run"');
    console.log('');
    console.log('Option 2: Supabase CLI');
    console.log('━'.repeat(80));
    console.log('1. Install: npm install -g supabase');
    console.log('2. Login: supabase login');
    console.log('3. Link project: supabase link --project-ref YOUR_PROJECT_REF');
    console.log('4. Apply: supabase db push');
    console.log('');
    console.log('💡 The migration file is ready at:');
    console.log('   ' + migrationPath);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

applyMigration().catch(console.error);
