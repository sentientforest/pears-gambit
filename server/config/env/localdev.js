'use strict';

var path = require('path');

module.exports = {
  env: 'localdev',
  ip: process.env.IP || '127.0.0.1',
  port: process.env.PORT || 9001,
  logPath: path.normalize(__dirname + '/../../logs/'),
  logLevel: process.env.NODEJS_LOG_LEVEL || 'debug',
};
