import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zncsppfwdjfbifzllpuj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_cxmBCjLO2UhV-8CU8Za7gw_q7dl563N';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
