
// Hack around existing jQuery.  This method globbers old version.  :(
if (typeof window.jQuery != 'undefined') {
  window._prevjQuery = window.jQuery.noConflict();
}
