var config = require('config')[process.env.NODE_ENV];
var request = require('request');
var fs = require('fs');
var express = require('express');
var router = express.Router();
var schedule = require('node-schedule');
var thedb = require('monk')(config.mongo.ip+':27017/assistant');
var csv = require('csv');
var pg = require('pg');
var conString = config.postgres.connectstring;

console.log(config);

// init scheduled jobs
var grab_job = schedule.scheduleJob('30 11,16,20 * * *', function(){
    console.log('running grabber job');
    grabSVXY();
    console.log('grabber job completed');
});

// init process jobs
var process_job = schedule.scheduleJob('31 11,16,20 * * *', function(){
    console.log('running processor job');
    processSVXYResults();
    console.log('processor job completed');
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
       //writeToPostgres();
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
                if  (err !== null ) { console.log(err); };
            });
        }
        else {
            if ( typeof response != undefined ) {
                console.error("HTTP get to proshares failed with response " + response.statusCode + " " + error);
            }
            else {
                console.error('HTTP request failed, probably because we dont have network acesss to https://accounts.profunds.com/etfdata/ByFund/SVXY-psdlyhld.csv');
            }
        }
        
    });
}

// processes the data from mongo collection into database
function processSVXYResults() {
    var collect = thedb.get('svxy_holdings_results');
    var num_blobs_processed = 0;
    var num_blobs_failed = 0;
    
    collect.find({processed: false})
    .each (function(blob) {
        //var records;
        parseResultBlob(blob);
        //console.log(records);
            num_blobs_processed++;
            blob.processed = true;
        collect.updateById(blob._id,blob);
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

function parseResultBlob(blob, output) {
    
    var date = scanDate(blob.body);

    // split into lines and grab the effective lines
    var lines = blob.body.match(/[^\r\n]+/g).splice(3,4);
    
    // rejoin lines
    var csv_blob = lines.join('\n');
    
    //console.log(csv_blob);
    
    csv.parse(csv_blob, {columns: true, trim: true }, function (err, record ) {
        if (err) {
            console.error(err);
            output = null;
        }
        else {
            // add the date to each record
            for ( var i = 0; i < record.length; i++ ) {
                record[i]['date'] = date;    
                record[i]['type'] = i;  //dirty hack to identify cash/near future/far future
                if ( record[i]['Market Value'] === '' ) { record[i]['Market Value'] = '0'; }
                if ( record[i]['Shares/Contracts'] === '' ) { record[i]['Shares/Contracts'] = '0'; }
                if ( record[i]['Exposure Value (Notional + G/L)'] === '' ) { record[i]['Exposure Value (Notional + G/L)'] = '0'; }
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
      if(!err) return false;

      // An error occurred, remove the client from the connection pool.
      if(client){
        done(client);
      }
      console.log('Postgres: ' + err);
      return true;
    };

    // handle an error from the connection
    if(handleError(err)) return;
    
    // check if this record has already been recorded
    client.query('SELECT COUNT (*) FROM d_hld_svxy WHERE (typeid) = $1 AND date = $2', [record['type'], new Date(record['date'])], function(err, result) {
        if (handleError(err)) return;
        // if it hasn't, record it
        if ( result.rows[0].count <= 0 ) {
            client.query('INSERT INTO d_hld_svxy (date, security, typeid, shares, exposure, marketvalue) VALUES ($1, $2, $3, $4, $5, $6) ',
                [new Date(record['date']), record['Security Description'], record['type'], record['Shares/Contracts'], record['Exposure Value (Notional + G/L)'], record['Market Value'] ],
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


module.exports = router;
