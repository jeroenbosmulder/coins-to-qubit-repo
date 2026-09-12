/* relay-config.js — fill in once. Same values as your earlier QR-code setup
 * (Supabase dashboard → Settings → API). The anon key is meant to be public;
 * the room uses Realtime *broadcast* only — no tables are read or written,
 * nothing is stored.
 *
 * Leave SUPABASE_URL empty to run "local mode": everything still works
 * between windows of one browser (useful with fake-phones.html), just not
 * across devices.
 */
window.PF_RELAY_CONFIG = {
  SUPABASE_URL: '',          // e.g. 'https://abcdefgh.supabase.co'
  SUPABASE_ANON_KEY: '',     // the long 'anon public' key

  /* Where the QR code sends participants. Empty = ../next/index.html
   * relative to the presenter page (works on GitHub Pages).                */
  PARTICIPANT_URL: '',

  /* Topic prefix on the wire; change it if you run several rooms on one
   * Supabase project.                                                       */
  TOPIC_PREFIX: 'pf-qubit',
};
