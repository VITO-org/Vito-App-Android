const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rkgbedehkfpiylaubjbo.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrZ2JlZGVoa2ZwaXlsYXViamJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NjE1NzYsImV4cCI6MjA5MTMzNzU3Nn0.8f9CewFjP6dtTbxAvmj5nCNn8JipXJpQWHjM7k_oeQo';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function test() {
  try {
    console.log('Querying users...');
    const { data: users, error: userError } = await supabase
      .from('usuario')
      .select('*')
      .limit(5);
    
    if (userError) {
      console.error('Error fetching users:', userError);
      return;
    }
    console.log('Users found:', users);

    if (users && users.length > 0) {
      const firstUserId = users[0].id;
      console.log(`Querying profile for user ${firstUserId}...`);
      const { data: profile, error: profileError } = await supabase
        .from('perfil_usuario')
        .select('*')
        .eq('user_id', firstUserId)
        .maybeSingle();
      
      if (profileError) {
        console.error('Error fetching profile:', profileError);
      } else {
        console.log('Profile found:', profile);
      }
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

test();
