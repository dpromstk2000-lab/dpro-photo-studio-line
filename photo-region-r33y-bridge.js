/* DPRO PHOTO R33G — opt-in REGION owner view bridge.
 * RELEASE CANDIDATE. Deployment requires explicit approval and a reviewed live Gateway.
 * Requires explicit stageEnabled=true; never mounts or sends without caller consent.
 * Reuses R33F hardened read-only region component; no writes, LINE/email, or recipient selection.
 */
(function (root) {
  'use strict';
  const instances = new WeakMap();
  function bind({view, container, apiBase, getOwnerToken, getOwnerRole, getFeatureFlags, fetchImpl,
    productEnabled = false, component = root.DPRO_PHOTO_R33F_REGION} = {}) {
    if (productEnabled !== true || !view || !container || typeof getOwnerToken !== 'function' ||
        typeof getOwnerRole !== 'function' || typeof getFeatureFlags !== 'function' ||
        typeof fetchImpl !== 'function' || !component || typeof component.mount !== 'function' ||
        component.sendEnabled !== false || component.autoMount !== false) {
      throw new Error('R33G_STAGING_BRIDGE_DENIED');
    }
    if (instances.has(container)) return instances.get(container);
    let mounted = null, disposed = false, active = false, lastToken = null;
    const safe = () => {
      try {
        const flags = getFeatureFlags();
        return getOwnerRole() === 'owner' && !!getOwnerToken() &&
          flags?.customer_followup === true && flags?.customer_region_search === true;
      } catch (_) { return false; }
    };
    const clear = () => { if (mounted) mounted.clear(); };
    function sync({viewActive = active} = {}) {
      if (disposed) return false;
      active = viewActive === true;
      const valid = active && safe();
      const token = valid ? String(getOwnerToken()) : null;
      if (!valid || (lastToken && lastToken !== token)) {
        clear();
        container.hidden = true;
        lastToken = token;
        if (!valid) return false;
      }
      if (!mounted) {
        // Mount is explicit; server-side feature flags and ownerSession guard remain authoritative.
        mounted = component.mount(container, {apiBase, getOwnerToken, fetchImpl, productEnabled:true});
      }
      lastToken = token;
      container.hidden = false;
      return true;
    }
    function leave() { active = false; clear(); container.hidden = true; lastToken = null; }
    function dispose() {
      if (disposed) return;
      leave(); disposed = true;
      if (mounted) mounted.destroy();
      container.hidden = true;
      instances.delete(container);
    }
    container.hidden = true;
    const api = Object.freeze({sync, leave, dispose, get active() {return !disposed && active && !container.hidden;},
      get installed() {return !disposed && !!mounted;} });
    instances.set(container, api);
    return api;
  }
  root.DPRO_PHOTO_R33G_REGION_VIEW = Object.freeze({bind, autoMount:false, sendEnabled:false, stagingOnly:false,releaseCandidate:true});
})(window);
