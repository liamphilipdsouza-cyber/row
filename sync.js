// =============================================================
// Shared cloud-sync helper. Each page calls initCloudSync({...}).
// =============================================================
(function () {
  'use strict';
  const SUPABASE_URL = 'https://halrgscsvigciduvglta.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_loDrcUIUB6Ub4W11XwDrWw_riL3Zfq_';

  // How often to poll Supabase for changes from other devices (ms).
  // visibilitychange fires pullNow() immediately when you switch tabs,
  // so this is just a safety net for long-running sessions.
  var POLL_MS = 30000;

  window.initCloudSync = function (config) {
    var appKey        = config && config.appKey;
    var syncedKeys    = (config && config.syncedKeys)    || [];
    var syncedPrefixes= (config && config.syncedPrefixes)|| [];
    var onApplied     = config && config.onApplied;

    if (!appKey || !window.supabase) return;
    if (!SUPABASE_URL || !SUPABASE_KEY) return;
    if (SUPABASE_URL.indexOf('PASTE-') === 0 || SUPABASE_KEY.indexOf('PASTE-') === 0) return;

    var supa           = null;
    var pushTimer      = null;
    var pollTimer      = null;
    var suppressSync   = false;
    var lastSyncedJson = null;
    var lastPullJson   = null;   // tracks last pulled value to skip no-op pulls

    // ── key matching ─────────────────────────────────────────────
    function matches(k) {
      if (!k) return false;
      if (syncedKeys.indexOf(k) !== -1) return true;
      for (var i = 0; i < syncedPrefixes.length; i++) {
        if (k.indexOf(syncedPrefixes[i]) === 0) return true;
      }
      return false;
    }
    function listAllKeys() {
      var out = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (matches(k)) out.push(k);
      }
      return out;
    }
    function collect() {
      var out = {};
      listAllKeys().forEach(function (k) {
        var v = localStorage.getItem(k);
        if (v == null) return;
        try { out[k] = JSON.parse(v); } catch (e) { out[k] = v; }
      });
      return out;
    }

    // ── patch localStorage so writes auto-push ────────────────────
    var origSet    = localStorage.setItem.bind(localStorage);
    var origRemove = localStorage.removeItem.bind(localStorage);

    localStorage.setItem = function (k, v) {
      origSet(k, v);
      try { if (!suppressSync && matches(k)) schedulePush(); } catch (e) {}
    };
    localStorage.removeItem = function (k) {
      origRemove(k);
      try { if (!suppressSync && matches(k)) schedulePush(); } catch (e) {}
    };

    // ── apply remote data into localStorage ───────────────────────
    function applyRemote(remote) {
      if (!remote || typeof remote !== 'object') return false;
      suppressSync = true;
      var changed = false;
      try {
        Object.keys(remote).forEach(function (k) {
          if (!matches(k)) return;
          var incoming = JSON.stringify(remote[k]);
          var local    = localStorage.getItem(k);
          if (local !== incoming) {
            try { origSet(k, incoming); changed = true; } catch (e) {}
          }
        });
        // Never delete local keys remote doesn't know about.
        // If local has extras, push them up so cloud stays complete.
        var localHasExtra = listAllKeys().some(function (k) {
          return !(k in remote);
        });
        if (localHasExtra) schedulePush();
      } finally {
        suppressSync = false;
      }
      if (changed && typeof onApplied === 'function') {
        try { onApplied(); } catch (e) {}
      }
      return changed;
    }

    // ── push local state to Supabase ──────────────────────────────
    async function pushNow() {
      if (!supa) return;
      var state = collect();
      if (Object.keys(state).length === 0) return;
      var json = JSON.stringify(state);
      if (json === lastSyncedJson) return;
      try {
        var res = await supa.from('app_state').upsert(
          { key: appKey, data: state, updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        );
        if (!res.error) lastSyncedJson = json;
      } catch (e) {}
    }
    function schedulePush() {
      clearTimeout(pushTimer);
      pushTimer = setTimeout(pushNow, 250);
    }

    // ── pull remote state from Supabase ───────────────────────────
    async function pullNow() {
      if (!supa) return;
      try {
        var res = await supa
          .from('app_state')
          .select('data')
          .eq('key', appKey)
          .maybeSingle();
        if (res.error || !res.data || !res.data.data) return;
        var remoteData = res.data.data;
        if (Object.keys(remoteData).length === 0) return;
        var incoming = JSON.stringify(remoteData);
        // Skip if we just pushed this exact state, or if we already applied it
        if (incoming === lastSyncedJson && incoming === lastPullJson) return;
        lastPullJson = incoming;
        if (incoming !== lastSyncedJson) {
          lastSyncedJson = incoming;
          applyRemote(remoteData);
        }
      } catch (e) {}
    }

    // ── keep-alive polling + visibility pull ──────────────────────
    function startPolling() {
      clearInterval(pollTimer);
      pollTimer = setInterval(pullNow, POLL_MS);
    }

    // Pull immediately whenever the user comes back to this tab/window
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) pullNow();
    });
    window.addEventListener('focus', function () { pullNow(); });

    // ── flush on page exit ────────────────────────────────────────
    function flushOnUnload() {
      var state = collect();
      if (Object.keys(state).length === 0) return;
      var json = JSON.stringify(state);
      if (json === lastSyncedJson) return;
      try {
        fetch(SUPABASE_URL + '/rest/v1/app_state?on_conflict=key', {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': 'Bearer ' + SUPABASE_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates',
          },
          body: JSON.stringify({
            key: appKey,
            data: state,
            updated_at: new Date().toISOString()
          }),
          keepalive: true,
        }).catch(function () {});
        lastSyncedJson = json;
      } catch (e) {}
    }
    window.addEventListener('beforeunload', flushOnUnload);
    window.addEventListener('pagehide',     flushOnUnload);

    // ── init: pull on load, then subscribe to real-time ──────────
    (async function init() {
      supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

      // Initial pull
      try {
        var res = await supa
          .from('app_state')
          .select('data')
          .eq('key', appKey)
          .maybeSingle();
        if (!res.error && res.data && res.data.data &&
            Object.keys(res.data.data).length > 0) {
          lastSyncedJson = JSON.stringify(res.data.data);
          lastPullJson   = lastSyncedJson;
          applyRemote(res.data.data);
        } else if (Object.keys(collect()).length > 0) {
          schedulePush();
        }
      } catch (e) {}

      // Real-time subscription (bonus — polling is the reliable path)
      try {
        supa.channel('sync_' + appKey)
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'app_state',
            filter: 'key=eq.' + appKey,
          }, function (payload) {
            if (!payload.new || !payload.new.data) return;
            if (Object.keys(payload.new.data).length === 0) return;
            var incoming = JSON.stringify(payload.new.data);
            if (incoming === lastSyncedJson) return;
            lastSyncedJson = incoming;
            lastPullJson   = incoming;
            applyRemote(payload.new.data);
          })
          .subscribe();
      } catch (e) {}

      startPolling();
    })();

    // Cross-tab sync within the same browser
    window.addEventListener('storage', function (e) {
      if (e.key && matches(e.key)) schedulePush();
    });
  };
})();
