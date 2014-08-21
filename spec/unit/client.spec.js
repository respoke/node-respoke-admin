var respoke = require('../../index');
var should = require('should');
var helpers = require('../helpers');
var uuid = require('uuid');

var Client = respoke.Client;

describe.only('Client', function () {
    this.timeout(15000);
    it('connects in developmentMode', function (done) {
        var client = new Client({
            appId: helpers.appId,
            endpointId: "me",
            developmentMode: true,
            baseURL: helpers.baseURL
        });
        client.on('connect', function (data) {
            console.log(data);
            done();
        });
        client.on('error', function (err) {
            console.error(err);
            done(err);
        });
    });

});
