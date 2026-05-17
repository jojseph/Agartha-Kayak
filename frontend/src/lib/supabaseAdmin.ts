// src/lib/supabaseAdmin.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nsbfnxgyzbyewasqfxoa.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zYmZueGd5emJ5ZXdhc3FmeG9hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Nzg4ODMxMCwiZXhwIjoyMDkzNDY0MzEwfQ.wppiAXENwR3cH0d3zeGFTYY_3Z-bbltpxDbTc_ZMtZU';

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase environment variables!");
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);