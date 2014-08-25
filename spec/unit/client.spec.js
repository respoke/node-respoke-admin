var respoke = require('../../index');
var should = require('should');
var helpers = require('../helpers');
var uuid = require('uuid');

var Client = respoke.Client;

describe('Client', function () {
    this.timeout(10000);
    it('connects in developmentMode', function (done) {
        var client = new Client({
            appId: helpers.appId,
            endpointId: "me",
            developmentMode: true,
            baseURL: helpers.baseURL
        });
        client.on('connect', function () {
            done();
        });
        client.on('error', function (err) {
            done(err);
        });
    });

    describe.only('subscribers', function () {
        
        var client = null;

        beforeEach(function (done) {
            client = new Client({
                appId: helpers.appId,
                endpointId: "bot-" + uuid.v4(),
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

        it('gets all subscribers', function (done) {
            client.getAllSubscribers(function (err, subscribers) {
                should.not.exist(err);
                subscribers.should.be.an.Array;
                console.log(subscribers);
                done();
            });
        });
    });

});
