var express = require('express');
var svxy = express.Router();
var config = require('config')[process.env.NODE_ENV];
var request = require('request');
var fs = require('fs');
var schedule = require('node-schedule');
var thedb = require('monk')(config.mongo.ip + ':27017/assistant');
var csv = require('csv');
var pg = require('pg');
var promise = require('bluebird');
var pgp = require('pg-promise')({promiseLib: promise});
var conString = config.postgres.connectstring;
var db = pgp(conString);
var scheduled_jobs = require('scheduled_jobs');

/* GET home page. */
svxy.get('/', function(req, res, next) {
  res.render('svxy', { title: 'SVXY' , scripts: ['javascripts/global.js']});
});

/*
 *  GET SVXY Data
 */

svxy.get('/getsvxy', function(req, res) {
    scheduled_jobs.grabSVXY();
    scheduled_jobs.processSVXYResults();
    
    var err;
    var mydata;
    
    db.query('select * from d_hld_svxy where date > date - interval \'7 days\'', true)
    .then ( function(data) {
        res.json(data);
    })
    .catch ( function (err) {
        console.log(err);
    });

});




var handlePostgresError = function(err) {
    // no error occurred, continue with the request
    if (!err) return false;

    // An error occurred, remove the client from the connection pool.
    if (this.client) {
        this.done(this.client);
    }
    console.log('Postgres: ' + err);
    return true;
};

function setResult(err, opts, result) {
    res.json(result);
}


//
function printResult(err, opts, result) {
    if (err) { console.log('error running query ' + err); };
    console.log(result);
}

// var t = schedule.scheduleJob('0 0 0 0 0', function() {
//     console.log('inserting test data');
//   var content;
//   var collection = thedb.get('svxy_holdings_results');
//   fs.readFile('../SVXY-holdings-1-8-2016.csv', 'utf-8', function read(err, data) {
//         if (err) { throw err;}
//         content = data;
//         console.log(typeof content);
//         collection.insert({body: content, processed:false});
//   });
//   console.log('inserted test data');
// });

module.exports = svxy;