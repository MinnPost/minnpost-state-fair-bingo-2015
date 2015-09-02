/**
 * RequireJS config which maps out where files are and shims
 * any non-compliant libraries.
 */
require.config({
  shim: {
    imagesLoaded: {
      deps: ['jquery']
    }
  },
  baseUrl: 'js',
  paths: {
    'requirejs': '../bower_components/requirejs/require',
    'almond': '../bower_components/almond/almond',
    'text': '../bower_components/text/text',
    'jquery': '../bower_components/jquery/dist/jquery',
    'underscore': '../bower_components/underscore/underscore',
    'imagesLoaded': '../bower_components/imagesloaded/imagesloaded.pkgd',
    'minnpost-state-fair-bingo-2015': 'app'
  }
});
