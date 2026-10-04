import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mjxptvjrgsjefklmpprx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qeHB0dmpyZ3NqZWZrbG5wcHJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwNDYzNDQsImV4cCI6MjEwNjYyMjM0NH0.8ZT0Yq-Wyaqx-fhrAbMBiJHIN5Fr5FRSkNfrAPuc1CU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
