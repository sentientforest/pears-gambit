'use strict';

var express = require('express'),
  bodyParser = require('body-parser');

module.exports = function(app) {
  app.route('/api/*')
    .get(function (req, res) {
      res.status(404).send('Not found - work in progress.\n');
    });
}
