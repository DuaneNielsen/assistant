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

// init scheduled jobs
var grab_job = schedule.scheduleJob('30 11,16,20 * * *', function() {
    console.log('running grabber job');
    grabSVXY();
    console.log('grabber job completed');
});

// init process jobs
var process_job = schedule.scheduleJob('31 11,16,20 * * *', function() {
    console.log('running processor job');
    processSVXYResults();
    console.log('processor job completed');
});


/* GET home page. */
svxy.get('/', function(req, res, next) {
  res.render('svxy', { title: 'SVXY' , scripts: ['javascripts/global.js']});
});

/*
 *  GET SVXY Data
 */

svxy.get('/getsvxy', function(req, res) {
    grabSVXY();
    processSVXYResults();
    
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



// grabs the data from the Proshares website and stuffs it in a mongo collection
function grabSVXY() {
    console.log('Reading data from proshares');

    var url = 'https://accounts.profunds.com/etfdata/ByFund/SVXY-psdlyhld.csv';

    //make a HTTP GET request to Proshares
    request(url, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            var collect = thedb.get('svxy_holdings_results');
            collect.insert({
                body: body,
                processed: false
            }, function(err, result) {
                if (err !== null) {
                    console.log(err);
                };
            });
        }
        else {
            if (typeof response !== 'undefined') {
                console.error('HTTP get to ' + url + ' failed with response ' + response.statusCode + ' Error: ' + error);
            }
            else {
                console.error('HTTP request to ' + url + ' failed. Error: ' + error);
            }
        }

    });
}

// processes the data from mongo collection into database
function processSVXYResults() {
    var collect = thedb.get('svxy_holdings_results');
    var num_blobs_processed = 0;
    var num_blobs_failed = 0;

    collect.find({
            processed: false
        })
        .each(function(blob) {
            //var records;
            parseResultBlob(blob);
            //console.log(records);
            num_blobs_processed++;
            blob.processed = true;
            collect.updateById(blob._id, blob);
        })
        .error(function(err) {
            // handle error
            console.error('read from svxy_holdings_results table failed with error: ' + err)
        })
        .success(function() {
            // final callback
            console.log('raw data read, processed ' + num_blobs_processed + ' failed ' + num_blobs_failed);
        });

}

function parseResultBlob(blob, output) {

    var date = scanDate(blob.body);

    // split into lines and grab the effective lines
    var lines = blob.body.match(/[^\r\n]+/g).splice(3, 4);

    // rejoin lines
    var csv_blob = lines.join('\n');

    //console.log(csv_blob);

    csv.parse(csv_blob, {
        columns: true,
        trim: true
    }, function(err, record) {
        if (err) {
            console.error(err);
            output = null;
        }
        else {
            // add the date to each record
            for (var i = 0; i < record.length; i++) {
                record[i]['date'] = date;
                record[i]['type'] = i; //dirty hack to identify cash/near future/far future
                if (record[i]['Market Value'] === '') {
                    record[i]['Market Value'] = '0';
                }
                if (record[i]['Shares/Contracts'] === '') {
                    record[i]['Shares/Contracts'] = '0';
                }
                if (record[i]['Exposure Value (Notional + G/L)'] === '') {
                    record[i]['Exposure Value (Notional + G/L)'] = '0';
                }
            }

            for (var i = 0; i < record.length; i++) {
                writeToPostgres(record[i]);
            }

        }
    });

    //return record;
}


function scanDate(body) {

    // split into lines
    var lines = body.match(/[^\r\n]+/g);

    // grab the date
    var date = lines[1].split(/[ ,]+/)[2];

    return date;

}


function writeToPostgres(record) {
    // get a pg client from the connection pool
    pg.connect(conString, function(err, client, done) {

        var handleError = function(err) {
            // no error occurred, continue with the request
            if (!err) return false;

            // An error occurred, remove the client from the connection pool.
            if (client) {
                done(client);
            }
            console.log('Postgres: ' + err);
            return true;
        };

        // handle an error from the connection
        if (handleError(err)) return;

        // check if this record has already been recorded
        client.query('SELECT COUNT (*) FROM d_hld_svxy WHERE (typeid) = $1 AND date = $2', [record['type'], new Date(record['date'])], function(err, result) {
            if (handleError(err)) return;
            // if it hasn't, record it
            if (result.rows[0].count <= 0) {
                client.query('INSERT INTO d_hld_svxy (date, security, typeid, shares, exposure, marketvalue) VALUES ($1, $2, $3, $4, $5, $6) ', [new Date(record['date']), record['Security Description'], record['type'], record['Shares/Contracts'], record['Exposure Value (Notional + G/L)'], record['Market Value']],
                    function(err, result) {
                        if (handleError(err)) return;
                        console.log('new record written')
                    }
                );
            }
        });

        done();

    });
}

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


//processresult is a callback to process the result
// function selectSVXY(err, processResult) {
//         handlePostgresError(err);
//         pg.connect(conString, function(err, client, done) {
//         handlePostgresError(err);
//         var result;
//         client.query('SELECT * FROM d_hld_svxy', processResult);
//         handlePostgresError(err);
//         done();
//     });
// }

function selectSVXY() {

    var client = pg.Client;
    client.on('drain', client.end.bind(client)); //disconnect client when all queries are finished
    client.connect();

    var query = client.query({
      text: 'SELECT * FROM d_hld_svxy',
      values: ['brianc@example.com']
    });

    query.on('row', function(row) {
      //do something w/ yer row data
      assert.equal('brianc', row.name);
    });
    
}


function writeBodyToFile(body) {

    var date = scanDate(body);

    // replace / with -
    date = date.replace(/\//g, "-");

    console.log(__dirname);

    var filename = 'SVXY-holdings-' + date + '.csv';
    fs.writeFile('../files/' + filename, body, function(err) {
        if (err) {
            console.log(err);
            return err;
        }
    })

    console.log("wrote file to" + filename);
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