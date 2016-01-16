var expect = require('chai').expect;
var request = require('superagent');


describe ('Assistant', function() {
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
    
    describe('when requested at /hello', function() {
        it('should say hello', function(done) {
            
            request.get('http://0.0.0.0:8080/hello').end(function assert(err, res) {


                expect(err).to.not.be.ok;
                expect(res).to.have.property('status', 200);
                expect(res.text).to.equal('Hello world');
                done();
            });
        });
    });
});