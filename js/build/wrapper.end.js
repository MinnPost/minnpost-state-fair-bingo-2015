
// Hack back in the original jQuery
if (typeof window._jQuery != 'undefined') {
  window.jQuery = window._prevjQuery;
  window.$ = window._prevjQuery;
}
