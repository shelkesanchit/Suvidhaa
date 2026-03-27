const { createClient } = require('@supabase/supabase-js');
require('./loadEnv');

let supabase = null;

// Only create Supabase client if credentials are configured
if (process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
  );
} else {
  console.warn('⚠️  Supabase not configured - municipal module features will be disabled');
}

module.exports = supabase;
