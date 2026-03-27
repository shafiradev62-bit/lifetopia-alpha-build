import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zncsppfwdjfbifzllpuj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_cxmBCjLO2UhV-8CU8Za7gw_q7dl563N';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkLogin() {
  console.log("Checking Supabase for last logins...");
  const { data, error } = await supabase
    .from('players')
    .select('wallet_address, last_seen, gold')
    .order('last_seen', { ascending: false })
    .limit(5);

  if (error) {
    console.error("Error querying Supabase:", error.message);
    return;
  }

  if (data && data.length > 0) {
    console.log("Found recent logins:");
    data.forEach(p => console.log(`- ${p.wallet_address} (Last seen: ${p.last_seen}, Gold: ${p.gold})`));
  } else {
    console.log("No logins found in 'players' table.");
  }
}

checkLogin();
