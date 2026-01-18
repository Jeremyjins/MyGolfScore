#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Read environment variables
const envContent = readFileSync('.dev.vars', 'utf-8');
const SUPABASE_URL = envContent.match(/SUPABASE_URL=(.*)/)[1].trim();
const SERVICE_ROLE_KEY = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

// Create Supabase client with service role
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// SQL to execute
const sql = `
-- Add total_score and score_to_par columns to round_players table
ALTER TABLE public.round_players
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS total_score INTEGER,
  ADD COLUMN IF NOT EXISTS score_to_par INTEGER;

-- Create index for efficient user-based queries
CREATE INDEX IF NOT EXISTS idx_round_players_user ON public.round_players(user_id);
`;

console.log('Applying migration to Supabase...\n');
console.log('SQL to execute:');
console.log(sql);
console.log('\nExecuting...');

// Execute the SQL
try {
  const { data, error } = await supabase.rpc('exec_sql', { sql });

  if (error) {
    console.error('\nError:', error);
    process.exit(1);
  }

  console.log('\n✓ Migration applied successfully!');
  console.log('Data:', data);
} catch (err) {
  console.error('\nFailed to apply migration:', err.message);
  console.log('\nTrying direct approach via Postgres connection...');

  // Try using SQL editor approach via Supabase API
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/query`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });

  if (!response.ok) {
    console.error('API error:', await response.text());
    console.log('\n⚠️  Automatic application failed.');
    console.log('\nPlease apply the migration manually:');
    console.log('1. Go to: https://supabase.com/dashboard/project/qtishtqonwsokovvabpe/sql/new');
    console.log('2. Paste and run the following SQL:\n');
    console.log(sql);
  } else {
    console.log('\n✓ Migration applied successfully!');
  }
}

process.exit(0);
