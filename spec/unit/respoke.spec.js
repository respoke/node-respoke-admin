var respoke = require('../../index');
var should = require('should');

describe('respoke', function () {
    it('exports Admin', function () {
        respoke.Admin.should.be.a.Function;
    });
    it('exports Client', function () {
        respoke.Client.should.be.a.Function;
    });
});
