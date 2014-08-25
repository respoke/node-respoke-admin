var respoke = require('../../index');
var should = require('should');
var helpers = require('../helpers');
var uuid = require('uuid');

var Client = respoke.Client;

describe('Client', function () {
    this.timeout(8000);
    it.only('connects in developmentMode', function (done) {
        var client = new Client({
            appId: helpers.appId,
            endpointId: "me",
            developmentMode: true,
            baseURL: helpers.baseURL
        });
        client.on('connect', function (data) {
            done();
        });
        client.on('error', function (err) {
            done(err);
        });
    });

    describe('endpoints', function () {
        
        var client;

        beforeEach(function (done) {
            client = new Client({
                appId: helpers.appId,
                endpointId: "me-" + uuid.v4(),
                developmentMode: true,
                baseURL: helpers.baseURL
            });
            client.on('connect', function (data) {
                done();
            });
            client.on('error', function (err) {
                done(err);
            });
        });

        it('gets all endpoints', function (done) {
            client.getAllEndpoints(function (err, endpoints) {
                should.not.exist(err);
                endpoints.should.be.an.Array;
                console.log(endpoints);
                done();
            });
        });
    });

});
