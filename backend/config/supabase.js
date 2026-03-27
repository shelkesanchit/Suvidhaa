const { createClient } = require('@supabase/supabase-js');
require('./loadEnv');

// Use service role key on the backend so storage uploads and bucket operations work
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

module.exports = supabase;
