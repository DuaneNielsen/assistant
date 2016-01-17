var expect = require('chai').expect;
var request = require('superagent');


describe ('user_test', function() {
    this.timeout(15000);
    var myApp = require('../app');
    var port = process.env.PORT;
    var baseUrl = 'http://' + process.env.IP + ':' + port;
    
    before(function(done) {
        myApp.start(port, done);
    });
    
    after(function(done) {
        myApp.stop(done);
    })
    
    describe('when requested at /getSVXY', function() {
        it('should return table row', function(done) {
            
            request.get('http://0.0.0.0:8080/svxy/getSVXY').end(function assert(err, res) {

                expect(err).to.not.be.ok;
                expect(res).to.have.property('status', 200);
                var data = JSON.stringify(res.body);
                expect(data).to.be.ok;
                done();
            });
        });
    });
    
    // next test here I think
    
});

