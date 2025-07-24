'use strict';

var express = require('express'),
  fs = require('fs'),
  https = require('https'),
  jwt = require('express-jwt'),
  config, secretKey;

process.env.NODE_ENV = process.env.NODE_ENV || 'localdev';

config = require('./server/config/config');

secretKey = process.env.NODEJS_KEY;

if (!secretKey) {
  throw new Error(`Provide NODEJS_KEY as environment variable.
    Required for signing authorization tokens.`)
}

let app = express();

// todo: uncomment below after implementing authorization
/* app.use('/api', jwt({ secret: secretKey, algorithms: ['HS256'] }));
app.use(function (err, req, res, next) {
  if (err.name === 'UnauthorizedError') {
    res.sendStatus(401);
    return;
  }
  next();
})
*/

require('./server/config/express')(app);
require('./server/routes')(app);

// ssl server for localdev, to support various security related headers in browser
// production should handle this differently
if (process.env.NODE_ENV === 'localdev') {
  let sslOpts = {
    key: fs.readFileSync('./ssl/localhost-key.pem', 'utf-8'),
    cert: fs.readFileSync('./ssl/localhost.pem', 'utf-8')
  }
  https.createServer(sslOpts, app).listen(config.port);
}
else {
  app.listen(config.port, config.ip, function () {
    console.log(`Express server listening on ${config.ip}:${config.port},
      in ${app.get('env')} mode.`)
  });
}

module.exports = app;
