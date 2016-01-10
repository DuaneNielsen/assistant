var request = require('request');
var fs = require('fs');
var express = require('express');
var router = express.Router();

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
    console.log('getSVXY called');
    
    var db = req.db;
    
    //Lets try to make a HTTP GET request to Proshares
    request('https://accounts.profunds.com/etfdata/ByFund/SVXY-psdlyhld.csv', function (error, response, body) {
        if (!error && response.statusCode == 200) {
            console.log(body); // Show the HTML for the Modulus homepage.
        }
        
        res.send('');
    
        // split into lines
        var lines = body.match(/[^\r\n]+/g);
        
        // grab the date
        var date = lines[1].split(/[ ,]+/)[2];
        
        // replace / with -
        date = date.replace(/\//g ,"-");
        
        console.log(__dirname);
        
        var filename = 'SVXY-holdings-' + date + '.csv';
        fs.writeFile('../files/'+filename, body, function(err) {
            if(err) {
                return console.log(err);
            }
        })
        
        console.log("wrote file to" +  filename);
        
    });        
});

module.exports = router;
