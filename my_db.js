//var db = require('monk')(process.env.IP+':27017/assistant');

var mongo = require('mongodb');
var db = require('monk')('0.0.0.0:27017/assistant');

function my_db() {
    console.log('grabbin db');
    console.log(require('monk')(process.env.IP+':27017/assistant'));
    return require('monk')('0.0.0.0:27017/assistant');
}

module.exports.my_db = my_db;