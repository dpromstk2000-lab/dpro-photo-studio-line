/* DPRO PHOTO R33H - candidate wiring for existing owner.html.
   RELEASE CANDIDATE. Inert unless an active owner
   session AND BOTH server-origin feature flags are true. Never sends LINE/email.
   Must be approved and paired with the deployed R33Y API contract.
*/
(function (root) {
  'use strict';
  let bridge = null;
  let disposed = false;
  const API_BASE = 'https://cbknucemarcpbscirzyv.supabase.co/functions/v1/dpro-photo-product-ready-gateway-v5';
  const byId = id => root.document?.getElementById(id) ?? null;
  function token() {
    try { return String(root.DPRO_STUDIO?.getSessionToken?.('owner') || ''); }
    catch (_) { return ''; }
  }
  function flags() {
    try {
      const obj = root.DPRO_PHOTO_FEATURES?.getFlags?.();
      return obj && typeof obj === 'object' ? obj : {};
    } catch (_) { return {}; }
  }
  function isOwner() {
    const gate = byId('authGate');
    const app = byId('ownerApp');
    return token() !== '' && !!app && app.hidden === false && !!gate && gate.hidden === true;
  }
  function enabled() {
    const f = flags();
    return isOwner() &&
      f.customer_followup === true && f.customer_region_search === true;
  }
  function activeView() {
    const view = byId('view-followup');
    return !!view && view.classList.contains('active') &&
      byId('ownerApp')?.hidden === false;
  }
  function hide() {
    if (bridge) bridge.leave();
    const panel = byId('r33hRegionPanel');
    if (panel) panel.hidden = true;
  }
  function sync() {
    if (disposed) return false;
    const panel = byId('r33hRegionPanel');
    const container = byId('r33hRegionMount');
    const view = byId('view-followup');
    if (!panel || !container || !view || !enabled() || !activeView()) {
      hide(); return false;
    }
    if (!bridge) {
      const impl = root.DPRO_PHOTO_R33G_REGION_VIEW;
      if (!impl || typeof impl.bind !== 'function' || impl.sendEnabled !== false) { hide(); return false; }
      bridge = impl.bind({
        view, container, apiBase: API_BASE,
        getOwnerToken: token,
        getOwnerRole: () => isOwner() ? 'owner' : 'unauthorized',
        getFeatureFlags: flags,
        fetchImpl: (...args) => root.fetch(...args),
        productEnabled: true
      });
    }
    const ok = bridge.sync({viewActive:true});
    panel.hidden = !ok;
    return ok;
  }
  function logout() { hide(); }
  function destroy() {
    if (disposed) return;
    logout(); disposed = true;
    if (bridge) bridge.dispose();
    bridge = null;
  }
  // Feature changes require immediate hide; do not depend on navigation.
  root.addEventListener('dpro:photo-features-applied', sync);
  root.DPRO_PHOTO_R33H = Object.freeze({ sync, logout, destroy,
    get stagingOnly(){return false;}, get releaseCandidate(){return true;}, get sendEnabled(){return false;},
    get active(){return !disposed && !!bridge && bridge.active;} });
})(window);
