
/**
 * Helpers functions such as formatters or extensions
 * to libraries.
 */
define('helpers', ['jquery', 'underscore'],
  function($, _) {

  var helpers = {};

  /**
   * Override Backbone's ajax call to use JSONP by default as well
   * as force a specific callback to ensure that server side
   * caching is effective.
   */
  helpers.overrideBackboneAJAX = function() {
    Backbone.ajax = function() {
      var options = arguments;

      if (options[0].dataTypeForce !== true) {
        options[0].dataType = 'jsonp';
        options[0].jsonpCallback = 'mpServerSideCachingHelper' +
          _.hash(options[0].url);
      }
      return Backbone.$.ajax.apply(Backbone.$, options);
    };
  };

  /**
   * Returns version of MSIE.
   */
  helpers.isMSIE = function() {
    var match = /(msie) ([\w.]+)/i.exec(navigator.userAgent);
    return match ? parseInt(match[2], 10) : false;
  };

  /**
   * Wrapper for a JSONP request, the first set of options are for
   * the AJAX request, while the other are from the application.
   */
  helpers.jsonpRequest = function(requestOptions, appOptions) {
    options.dataType = 'jsonp';
    options.jsonpCallback = 'mpServerSideCachingHelper' +
      _.hash(options.url);

    if (appOptions.remoteProxy) {
      options.url = options.url + '&callback=mpServerSideCachingHelper';
      options.url = appOptions.remoteProxy + encodeURIComponent(options.url);
      options.cache = true;
    }

    return $.ajax.apply($, [options]);
  };

  /**
   * Data source handling.  For development, we can call
   * the data directly from the JSON file, but for production
   * we want to proxy for JSONP.
   *
   * `name` should be relative path to dataset
   * `options` are app options
   *
   * Returns jQuery's defferred object.
   */
  helpers.getLocalData = function(name, options) {
    var useJSONP = false;
    var defers = [];
    name = (_.isArray(name)) ? name : [ name ];

    // If the data path is not relative, then use JSONP
    if (options && options.paths && options.paths.data.indexOf('http') === 0) {
      useJSONP = true;
    }

    // Go through each file and add to defers
    _.each(name, function(d) {
      var defer;

      if (useJSONP) {
        defer = helpers.jsonpRequest({
          url: proxyPrefix + encodeURI(options.paths.data + d)
        }, options);
      }
      else {
        defer = $.getJSON(options.paths.data + d);
      }
      defers.push(defer);
    });

    return $.when.apply($, defers);
  };

  /**
   * Reads query string and turns into object.
   */
  helpers.parseQueryString = function() {
    var assoc  = {};
    var decode = function(s) {
      return decodeURIComponent(s.replace(/\+/g, " "));
    };
    var queryString = location.search.substring(1);
    var keyValues = queryString.split('&');

    _.each(keyValues, function(v, vi) {
      var key = v.split('=');
      if (key.length > 1) {
        assoc[decode(key[0])] = decode(key[1]);
      }
    });

    return assoc;
  };

  return helpers;
});


define('text!templates/application.underscore',[],function () { return '<div class="application-container">\n  <div class="message-container"></div>\n\n  <div class="content-container">\n\n    <div class="pick">\n      <button class="refresh button primary large" title="Pick another Bingo card."><i class="fa fa-refresh"></i></button>\n      <button class="print button primary large" title="Print out card."><i class="fa fa-print"></i></button>\n    </div>\n\n    <div class="card">\n      <div class="loading-container">\n        <i class="loading"></i> Loading...\n      </div>\n\n      <img src="<%= card %>" alt="Bingo card" />\n    </div>\n\n    <p class="caption">If you are having trouble printing using the button above, <a class="manual-print" href="<%= card %>" target="_blank">open the bingo card</a> in a separate window and print from there.</p>\n\n  </div>\n\n  <div class="footnote-container">\n    <div class="footnote">\n      <p>Some code, techniques, and data on <a href="https://github.com/minnpost/minnpost-state-fair-bingo-2015" target="_blank">Github</a>.</p>\n\n    </div>\n  </div>\n</div>\n';});


define('text!templates/print-window.underscore',[],function () { return '<html>\n<head>\n  <title>Temporary Printing Window</title>\n\n  <script>\n    function step1() {\n      setTimeout(\'step2()\', 100);\n    }\n    function step2() {\n      window.print();\n      window.close();\n    }\n  </script>\n\n  <style>\n    * { margin: 0 !important; padding: 0 !important; }\n    html, body {\n      height:100%;\n      overflow: hidden;\n      background: #FFF;\n      font-size: 9.5pt;\n    }\n    img {\n      display: block;\n      max-width: 99%;\n      max-height: 99%;\n      margin: 0 auto !important;\n    }\n  </style>\n</head>\n<body onLoad="step1()">\n  <img src="<%= card %>"/>\n</body>\n</html>\n';});

/**
 * Main application file for: minnpost-state-fair-bingo
 *
 * This pulls in all the parts
 * and creates the main object for the application.
 */

// Create main application
define('minnpost-state-fair-bingo-2015', [
  'jquery', 'underscore', 'imagesLoaded', 'helpers',
  'text!templates/application.underscore',
  'text!templates/print-window.underscore'
], function(
  $, _, imagesLoaded, helpers, tApplication, tPrint
  ) {

  // Constructor for app
  var App = function(options) {
    this.options = _.extend(this.defaultOptions, options);
    this.el = this.options.el;
    this.$el = $(this.el);
    this.$ = function(selector) { return this.$el.find(selector); };
    this.loadApp();
  };

  // Extend with custom methods
  _.extend(App.prototype, {
    // Start function
    start: function() {
      var thisApp = this;

      // For whatever reason imagesloaded is not finding jQuery
      // when used in build, so we use it without jQuery

      // Add (absolute) paths to cards
      this.options.cards = _.map(this.options.cards, function(c, ci) {
        var path = (_.isObject(window.location)) ? window.location.protocol + '//' + window.location.host + window.location.pathname : 'http://localhost:8802/';

        c = thisApp.options.paths.images + c;
        if (c.indexOf('http') !== 0 && c.indexOf('//') !== 0) {
          c = path + c;
        }
        return c;
      });

      // Get initial card
      this.card = this.newCard();

      // Create main application view
      this.$el.html(_.template(tApplication, {
        card: this.card,
        options: this.options
      }));

      // Handle image loading
      this.imageLoaded();

      // Switch out
      this.$('.pick .refresh').on('click', function(e) {
        e.preventDefault();
        thisApp.readyImageLoad();
        thisApp.$('.card img').fadeOut().attr('src', thisApp.newCard());
        thisApp.$('.manual-print').attr('href', thisApp.$('.card img').attr('src'));
        thisApp.imageLoaded();
      });

      // Print
      this.$('.pick .print').on('click', function(e) {
        e.preventDefault();
        thisApp.printImage();
      });
    },

    // Handle image loading.  We need to attach this each time
    imageLoaded: function() {
      var thisApp = this;

      imagesLoaded(this.$('.card img'), function(i) {
        thisApp.$('.card img').fadeIn('fast');
        thisApp.$('.card .loading-container').slideUp('fast');
      });
    },
    readyImageLoad: function() {
      var thisApp = this;
      this.$('.card img').fadeOut('fast');
      this.$('.card .loading-container').slideDown('fast');
    },

    // Get new card
    newCard: function() {
      var card;
      var oldCard = this.card || this.options.cards[0];
      // iOS has a hard image size limit
      var extension = (this.options.capabilities.cannotLoadLargeImages) ?
        '-small.png' : '.png';

      if (this.options.cards.length > 1) {
        do {
          card = _.sample(this.options.cards);
        }
        while (card === oldCard);
      }
      else {
        card = oldCard;
      }

      card = card + extension;
      this.card = card;
      return card;
    },

    // Print image.  Some serious hackery here
    // http://progrower.coffeecup.com/printing.html
    printImage: function() {
      var pw = window.open('about:blank', '_new');
      pw.document.open();
      pw.document.write(_.template(tPrint, {
        card: this.card
      }));
      pw.document.close();
    },

    // Default options
    defaultOptions: {
      projectName: 'minnpost-state-fair-bingo-2015',
      cards: [
        'minnpost-state-fair-bingo-card-01',
        'minnpost-state-fair-bingo-card-02',
        'minnpost-state-fair-bingo-card-03',
        'minnpost-state-fair-bingo-card-04'
      ],
      remoteProxy: null,
      el: '.minnpost-state-fair-bingo-2015-container',
      capabilities: {
        cannotLoadLargeImages: _.isObject(navigator) ?
          /(iPad|iPhone|iPod)/g.test(navigator.userAgent) : false
      },
      availablePaths: {
        local: {
          css: ['.tmp/css/main.css'],
          images: 'images/',
          data: 'data/'
        },
        build: {
          css: [
            '//netdna.bootstrapcdn.com/font-awesome/4.0.3/css/font-awesome.css',
            'dist/minnpost-state-fair-bingo-2015.libs.min.css',
            'dist/minnpost-state-fair-bingo-2015.latest.min.css'
          ],
          ie: [
            'dist/minnpost-state-fair-bingo-2015.libs.min.ie.css',
            'dist/minnpost-state-fair-bingo-2015.latest.min.ie.css'
          ],
          images: 'dist/images/',
          data: 'dist/data/'
        },
        deploy: {
          css: [
            '//netdna.bootstrapcdn.com/font-awesome/4.0.3/css/font-awesome.css',
            'https://s3.amazonaws.com/data.minnpost/projects/minnpost-state-fair-bingo-2015/minnpost-state-fair-bingo-2015.libs.min.css',
            'https://s3.amazonaws.com/data.minnpost/projects/minnpost-state-fair-bingo-2015/minnpost-state-fair-bingo-2015.latest.min.css'
          ],
          ie: [
            'https://s3.amazonaws.com/data.minnpost/projects/minnpost-state-fair-bingo-2015/minnpost-state-fair-bingo-2015.libs.min.ie.css',
            'https://s3.amazonaws.com/data.minnpost/projects/minnpost-state-fair-bingo-2015/minnpost-state-fair-bingo-2015.latest.min.ie.css'
          ],
          images: 'https://s3.amazonaws.com/data.minnpost/projects/minnpost-state-fair-bingo-2015/images/',
          data: 'https://s3.amazonaws.com/data.minnpost/projects/minnpost-state-fair-bingo-2015/data/'
        }
      }
    },

    // Load up app
    loadApp: function() {
      this.determinePaths();
      this.getLocalAssests(function(map) {
        this.renderAssests(map);
        this.start();
      });
    },

    // Determine paths.  A bit hacky.
    determinePaths: function() {
      var query;
      this.options.deployment = 'deploy';

      if (window.location.host.indexOf('localhost') !== -1) {
        this.options.deployment = 'local';

        // Check if a query string forces something
        query = helpers.parseQueryString();
        if (_.isObject(query) && _.isString(query.mpDeployment)) {
          this.options.deployment = query.mpDeployment;
        }
      }

      this.options.paths = this.options.availablePaths[this.options.deployment];
    },

    // Get local assests, if needed
    getLocalAssests: function(callback) {
      var thisApp = this;

      // If local read in the bower map
      if (this.options.deployment === 'local') {
        $.getJSON('bower.json', function(data) {
          callback.apply(thisApp, [data.dependencyMap]);
        });
      }
      else {
        callback.apply(this, []);
      }
    },

    // Rendering tasks
    renderAssests: function(map) {
      var isIE = (helpers.isMSIE() && helpers.isMSIE() <= 8);

      // Add CSS from bower map
      if (_.isObject(map)) {
        _.each(map, function(c, ci) {
          if (c.css) {
            _.each(c.css, function(s, si) {
              s = (s.match(/^(http|\/\/)/)) ? s : 'bower_components/' + s + '.css';
              $('head').append('<link rel="stylesheet" href="' + s + '" type="text/css" />');
            });
          }
          if (c.ie && isIE) {
            _.each(c.ie, function(s, si) {
              s = (s.match(/^(http|\/\/)/)) ? s : 'bower_components/' + s + '.css';
              $('head').append('<link rel="stylesheet" href="' + s + '" type="text/css" />');
            });
          }
        });
      }

      // Get main CSS
      _.each(this.options.paths.css, function(c, ci) {
        $('head').append('<link rel="stylesheet" href="' + c + '" type="text/css" />');
      });
      if (isIE) {
        _.each(this.options.paths.ie, function(c, ci) {
          $('head').append('<link rel="stylesheet" href="' + c + '" type="text/css" />');
        });
      }

      // Add a processed class
      this.$el.addClass('processed');
    }
  });

  return App;
});


/**
 * Run application
 */
require(['jquery', 'minnpost-state-fair-bingo-2015'], function($, App) {
  $(document).ready(function() {
    var app = new App();
  });
});

