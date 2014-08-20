/**
 * Main application file for: minnpost-state-fair-bingo
 *
 * This pulls in all the parts
 * and creates the main object for the application.
 */

// Create main application
define('minnpost-state-fair-bingo', [
  'jquery', 'underscore', 'helpers',
  'text!templates/application.underscore',
  'text!templates/print-window.underscore'
], function(
  $, _, helpers, tApplication, tPrint
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
      this.card = this.newCard();

      // Create main application view
      this.$el.html(_.template(tApplication, {
        card: this.card
      }));

      // Switch out
      this.$('.pick .refresh').on('click', function(e) {
        e.preventDefault();
        thisApp.$('.card img').attr('src', thisApp.newCard());
      });

      // Print
      this.$('.pick .print').on('click', function(e) {
        e.preventDefault();
        thisApp.printImage();
      });
    },

    // Get new card
    newCard: function() {
      var card;
      var oldCard = this.card;

      do {
        card = _.sample(this.options.cards);
      }
      while (card === oldCard);

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
      projectName: 'minnpost-state-fair-bingo',
      cards: [
        'http://fillmurray.com/g/990/800',
        'http://fillmurray.com/g/991/800',
        'http://fillmurray.com/g/992/800',
        'http://fillmurray.com/g/993/800',
        'http://fillmurray.com/g/994/800'
      ],
      remoteProxy: null,
      el: '.minnpost-state-fair-bingo-container',
      availablePaths: {
        local: {
          css: ['.tmp/css/main.css'],
          images: 'images/',
          data: 'data/'
        },
        build: {
          css: [
            '//netdna.bootstrapcdn.com/font-awesome/4.0.3/css/font-awesome.css',
            'dist/minnpost-state-fair-bingo.libs.min.css',
            'dist/minnpost-state-fair-bingo.latest.min.css'
          ],
          ie: [
            'dist/minnpost-state-fair-bingo.libs.min.ie.css',
            'dist/minnpost-state-fair-bingo.latest.min.ie.css'
          ],
          images: 'dist/images/',
          data: 'dist/data/'
        },
        deploy: {
          css: [
            '//netdna.bootstrapcdn.com/font-awesome/4.0.3/css/font-awesome.css',
            'https://s3.amazonaws.com/data.minnpost/projects/minnpost-state-fair-bingo/minnpost-state-fair-bingo.libs.min.css',
            'https://s3.amazonaws.com/data.minnpost/projects/minnpost-state-fair-bingo/minnpost-state-fair-bingo.latest.min.css'
          ],
          ie: [
            'https://s3.amazonaws.com/data.minnpost/projects/minnpost-state-fair-bingo/minnpost-state-fair-bingo.libs.min.ie.css',
            'https://s3.amazonaws.com/data.minnpost/projects/minnpost-state-fair-bingo/minnpost-state-fair-bingo.latest.min.ie.css'
          ],
          images: 'https://s3.amazonaws.com/data.minnpost/projects/minnpost-state-fair-bingo/images/',
          data: 'https://s3.amazonaws.com/data.minnpost/projects/minnpost-state-fair-bingo/data/'
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
require(['jquery', 'minnpost-state-fair-bingo'], function($, App) {
  $(document).ready(function() {
    var app = new App();
  });
});