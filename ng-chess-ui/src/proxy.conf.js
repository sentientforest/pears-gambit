module.exports = {
  "/": {
    "secure": false,
    "bypass": function(req, res, proxyOptions) {
      req.headers["X-Custom-Header"] = "yes";
      res.headers["X-Custom-Header"] = "yes";
    }
  }
};
