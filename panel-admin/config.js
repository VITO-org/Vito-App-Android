// Configuración de Supabase para el panel de testing
// ⚠️ Estas credenciales son las mismas que usa la app VITO
const SUPABASE_URL = 'https://rkgbedehkfpiylaubjbo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrZ2JlZGVoa2ZwaXlsYXViamJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NjE1NzYsImV4cCI6MjA5MTMzNzU3Nn0.8f9CewFjP6dtTbxAvmj5nCNn8JipXJpQWHjM7k_oeQo';

const REST_BASE = `${SUPABASE_URL}/rest/v1`;

// Headers comunes para las llamadas a Supabase REST
function getHeaders() {
  return {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };
}
