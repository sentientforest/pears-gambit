'use strict';

var express = require('express'),
    favicon = require('serve-favicon'),
    compression = require('compression'),
    bodyParser = require('body-parser'),
    errorHandler = require('errorhandler'),
    path = require('path'),
    config = require('./config');

/**
 * Express configuration
 */
module.exports = function(app) {
  var env = app.get('env');

  if (env === 'localdev') {
    // Disable caching of scripts for easier testing
    app.use(function noCache(req, res, next) {
      if (req.url.endsWith('.js') || req.url.endsWith('.css') === 0) {
        res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.header('Pragma', 'no-cache');
        res.header('Expires', 0);
      }
      next();
    });
  }

  if (env === 'production' || env === 'localprod') {
    app.use(compression());
    app.use('/', favicon(path.join(
      config.root, '/ng-chess-ui/dist/ng-chess-ui', 'favicon.ico'
    )));
  }

  /*
  https://developer.chrome.com/blog/enabling-shared-array-buffer/#cross-origin-isolation
  stockfish.js requires SharedArrayBuffer.
  This requires enabling cross-origin-isolation in Chrome 92+.
  */
  const staticOpts = {
    setHeaders: (res) => {
      res.set('Cross-Origin-Embedder-Policy', 'require-corp');
      res.set('Cross-Origin-Opener-Policy', 'same-origin');
    }
  };
  app.use('/', express.static(
    path.join(config.root, '/ng-chess-ui/dist/ng-chess-ui'),
    staticOpts
  ));

  /*
  uncomment if view engine needed in future.
  app.set('views', [
    config.root + '/ng-chess-ui/dist/ng-chess-ui'
  ]);

  app.set('view engine', 'pug');
  */
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json({ extended: false }));

  // Error handler - has to be last
  if (env === 'localdev' || env === 'localprod') {
    app.use(errorHandler());
  }
};
