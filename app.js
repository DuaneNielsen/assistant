var express = require('express');
var config = require('config')[process.env.NODE_ENV];
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var schedule = require('node-schedule');
var https = require('https');
var fs = require('fs');

console.log(__dirname);

var serveropts = {
  key: fs.readFileSync(path.join(__dirname,'private.key' )),
  cert: fs.readFileSync(path.join(__dirname,'certificate.pem')),
  ca: fs.readFileSync(path.join(__dirname,'cert.csr'))
};

console.log(serveropts);

//var secureServer = https.createServer(options, app).listen(443);


// print config
console.log("env is " + process.env.NODE_ENV);
console.log("mongo ip: " + config.mongo.ip);

// Database
var mongo = require('mongodb');
var db = require('monk')(config.mongo.ip+':27017/assistant');


var routes = require('./routes/index');
var users = require('./routes/users');

var app = express();

app.set(process.env.PORT, process.env.IP);
console.log("server will listen on " + process.env.PORT + ":" + process.env.IP);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

app.use('/files',express.static(path.join(__dirname, 'files')));
app.use(express.static(path.join(__dirname, 'public')));

// Make our db accessible to our router
app.use(function(req,res,next){
    req.db = db;
    next();
});

app.get('/', function(req, res){
  res.render('index', { title: 'Express', scripts: ['javascripts/global.js']});
});

app.use('/', routes);
app.use('/users', users);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

var httpsServer = https.createServer(serveropts, app);
//var io = require('socket.io').listen(httpsServer);
httpsServer.listen(8000);

module.exports = app;
