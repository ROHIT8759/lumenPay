/**
 * Apply Supabase migrations programmatically
 * Run with: node apply-migrations.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv/config');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyMigrations() {
  console.log('🔄 Applying migrations to Supabase...\n');

  const migrationsDir = path.join(__dirname, 'supabase', 'migrations');
  const migrationFiles = [
    '001_create_tables.sql',
    '002_update_transactions_table.sql'
  ];

  for (const file of migrationFiles) {
    const filePath = path.join(migrationsDir, file);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Skipping ${file} - file not found`);
      continue;
    }

    console.log(`📝 Applying ${file}...`);
    const sql = fs.readFileSync(filePath, 'utf8');

    try {
      const { data, error } = await supabase.rpc('exec_sql', { 
        sql_query: sql 
      });

      if (error) {
        // If rpc method doesn't exist, we need to use the dashboard
        console.log(`❌ Error applying ${file}:`);
        console.log(error.message);
        console.log('\n⚠️  Please apply migrations manually via Supabase Dashboard:');
        console.log(`1. Go to: ${process.env.NEXT_PUBLIC_SUPABASE_URL}/project/${process.env.NEXT_PUBLIC_SUPABASE_URL.split('.')[0].split('//')[1]}/sql`);
        console.log(`2. Copy the SQL from: ${filePath}`);
        console.log(`3. Paste and run in SQL Editor\n`);
        return false;
      }

      console.log(`✅ Successfully applied ${file}\n`);
    } catch (err) {
      console.error(`❌ Error applying ${file}:`, err.message);
      return false;
    }
  }

  console.log('✅ All migrations applied successfully!');
  return true;
}

// Test database connection
async function testConnection() {
  console.log('🔌 Testing database connection...\n');
  
  const { data, error } = await supabase
    .from('wallets')
    .select('count')
    .limit(1);

  if (error) {
    if (error.code === 'PGRST205') {
      console.log('❌ Wallets table does not exist - migrations need to be applied\n');
      return false;
    }
    console.log('❌ Database error:', error.message);
    return false;
  }

  console.log('✅ Database connection successful!\n');
  return true;
}

async function main() {
  const connected = await testConnection();
  
  if (!connected) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 MANUAL MIGRATION STEPS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('1. Open Supabase Dashboard:');
    console.log(`   ${process.env.NEXT_PUBLIC_SUPABASE_URL.replace('supabase.co', 'supabase.co/dashboard')}\n`);
    console.log('2. Navigate to: SQL Editor (left sidebar)\n');
    console.log('3. Copy and paste the contents of these files in order:\n');
    console.log('   📄 supabase/migrations/001_create_tables.sql');
    console.log('   📄 supabase/migrations/002_update_transactions_table.sql\n');
    console.log('4. Click "Run" to execute each migration\n');
    console.log('5. Refresh schema cache: Settings > API > Reload schema cache\n');
    console.log('6. Restart your Next.js dev server: npm run dev\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('💡 Quick Link to SQL Editor:');
    const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL.split('//')[1].split('.')[0];
    console.log(`   https://supabase.com/dashboard/project/${projectRef}/sql\n`);
  }
}

main().catch(console.error);
