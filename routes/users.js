var request = require('request');
var fs = require('fs');
var express = require('express');
var router = express.Router();
var schedule = require('node-schedule');
var thedb = require('monk')('0.0.0.0:27017/assistant');
var csv = require('csv');
var pg = require('pg');
var conString = 'postgres://postgres:_(PI-9pi_(PI@0.0.0.0/assistant';

// init scheduled jobs
var j = schedule.scheduleJob('* * * * *', function(){
    console.log('running job');
    grabSVXY();
});


/*
 * GET userlist.
 */
router.get('/userlist', function(req, res) {
    var db = req.db;
    var collection = db.get('userlist');
    collection.find({},{},function(e,docs){
        res.json(docs);
    });
});

/*
 * POST to adduser.
 */
router.post('/adduser', function(req, res) {
    var db = req.db;
    var collection = db.get('userlist');
    collection.insert(req.body, function(err, result){
        res.send(
            (err === null) ? { msg: '' } : { msg: err }
        );
    });
});

/*
 * DELETE to deleteuser.
 */
router.delete('/deleteuser/:id', function(req, res) {
    var db = req.db;
    var collection = db.get('userlist');
    var userToDelete = req.params.id;
    collection.remove({ '_id' : userToDelete }, function(err) {
        res.send((err === null) ? { msg: '' } : { msg:'error: ' + err });
    });
});

router.get('/getsvxy', function(req, res) {
       grabSVXY();
       processSVXYResults();
       writeToPosgres();
       res.send('');
});


// grabs the data from the Proshares website and stuffs it in a mongo collection
function grabSVXY() {
    console.log('Reading data from proshares');
    
    //make a HTTP GET request to Proshares
    request('https://accounts.profunds.com/etfdata/ByFund/SVXY-psdlyhld.csv', function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var collect = thedb.get('svxy_holdings_results');
            collect.insert({body: body, processed: false }, function (err, result) {
                console.log ( (err === null ) ? {msg:''} : {msg:err} );
            });
        }
        else {
            console.error("HTTP get to proshares failed with response " + response.statusCode + " " + error);
        }
        
    });
}

// processes the data from mongo collection into database
function processSVXYResults() {
    var collect = thedb.get('svxy_holdings_results');
    var num_blobs_processed = 0;
    var num_blobs_failed = 0;
    
    collect.find({processed: false})
    .each ( function(blob) {
        var err = null;
        parseResultBlob(err,blob)
        if ( err === null ) {
            num_blobs_processed++;
            blob.processed = true;
        }
        else {
            console.error('parse failed with error ' + err + ' for blob ' + blob.body);
            num_blobs_failed++;
        }
    })
    .error(function(err){
        // handle error
        console.error('read from svxy_holdings_results table failed with error: ' + err)
    })
    .success(function(){
    // final callback
        console.log('raw data read, processed ' + num_blobs_processed + ' failed ' + num_blobs_failed);
    });    
    
}

function parseResultBlob(err, blob) {
    
    var date = scanDate(blob.body);

    // split into lines and grab the effective lines
    var lines = blob.body.match(/[^\r\n]+/g).splice(3,3);
    
    // rejoin lines
    var csv_blob = lines.join('\n');
    
    csv.parse(csv_blob, {columns: true, trim: true }, function (err, record ) {
        if (err === null) {
            
            // add the date to each record
            for ( var i = 0; i < record.length; i++ ) {
                record[i]['date'] = date;    
            }
            //console.log(record);
            return record;
        }
        else {
            console.error(err);
            this.err = err;
        }
    });
}


function scanDate(body) {

    // split into lines
    var lines = body.match(/[^\r\n]+/g);
        
    // grab the date
    var date = lines[1].split(/[ ,]+/)[2];

    return date;

}

function writeToPosgres() {
  // get a pg client from the connection pool
  pg.connect(conString, function(err, client, done) {

    var handleError = function(err) {
      // no error occurred, continue with the request
      if(!err) return false;

      // An error occurred, remove the client from the connection pool.
      // A truthy value passed to done will remove the connection from the pool
      // instead of simply returning it to be reused.
      // In this case, if we have successfully received a client (truthy)
      // then it will be removed from the pool.
      if(client){
        done(client);
      }
      //res.writeHead(500, {'content-type': 'text/plain'});
      console.log('Posgres error ' + err);
      return true;
    };

    // handle an error from the connection
    if(handleError(err)) return;

    // record the visit
    client.query('INSERT INTO visit (date) VALUES ($1)', [new Date()], function(err, result) {

      // handle an error from the query
      if(handleError(err)) return;

      // get the total number of visits today (including the current visit)
      client.query('SELECT COUNT(date) AS count FROM visit', function(err, result) {

        // handle an error from the query
        if(handleError(err)) return;

        // return the client to the connection pool for other requests to reuse
        done();
        //res.writeHead(200, {'content-type': 'text/plain'});
        console.log('You are visitor number ' + result.rows[0].count);
      });
    });
  });
}

function writeBodyToFile(body) {
 
        var date = scanDate(body);
 
        // replace / with -
        date = date.replace(/\//g ,"-");
        
        console.log(__dirname);
        
        var filename = 'SVXY-holdings-' + date + '.csv';
        fs.writeFile('../files/'+filename, body, function(err) {
            if(err) {
                console.log(err);
                return err;
            }
        })
        
        console.log("wrote file to" +  filename);
}

module.exports = router;
