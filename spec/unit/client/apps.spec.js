'use strict';
var helpers = require('../../helpers.js');
var should = require('should');
var uuid = require('uuid');
var nock = require('nock');
var errors = helpers.errors;

describe('apps', function () {
    var respoke;
    var nocked;

    beforeEach(function () {
        respoke = helpers.createRespokeWithAuth();
        nocked = nock(helpers.baseDomain);
        nock.disableNetConnect(helpers.baseDomain);
    });
    afterEach(function () {
        nock.cleanAll();
        nock.enableNetConnect();
    });

    describe('the get method', function () {
        describe('with appId', function () {
            var params = {
                appId: uuid.v4()
            };

            describe('when there is no http error', function () {
                var expectedData = 'booya';

                beforeEach(function () {
                    nocked
                        .get('/v1/apps/' + params.appId)
                        .reply(200, expectedData);
                });

                it('returns data to callback', function (done) {
                    respoke.apps.get(params, function (err, data) {
                        should.not.exist(err);
                        should.exist(data);
                        data.should.equal(expectedData);
                        done();
                    });
                });

                it('resolves promise with data', function (done) {
                    respoke.apps.get(params).then(function (data) {
                        should.exist(data);
                        data.should.equal(expectedData);
                        done();
                    });
                });
            });

            describe('when there is an http error', function () {
                beforeEach(function () {
                    nocked
                        .get('/v1/apps/' + params.appId)
                        .reply(500);
                });

                it('returns error to callback', function (done) {
                    respoke.apps.get(params, function (err) {
                        should.exist(err);
                        err.should.be.an.instanceof(errors.UnexpectedServerResponseError);
                        done();
                    });
                });

                it('rejects promise with error', function (done) {
                    respoke.apps.get(params).catch(function (err) {
                        should.exist(err);
                        err.should.be.an.instanceof(errors.UnexpectedServerResponseError);
                        done();
                    });
                });
            });
        });

        describe('without appId', function () {

            describe('when there is no http error', function () {
                var expectedData = 'booya';

                beforeEach(function () {
                    nocked
                        .get('/v1/apps')
                        .reply(200, expectedData);
                });

                it('returns data to callback', function (done) {
                    respoke.apps.get(function (err, data) {
                        should.not.exist(err);
                        should.exist(data);
                        data.should.equal(expectedData);
                        done();
                    });
                });

                it('resolves promise with data', function (done) {
                    respoke.apps.get().then(function (data) {
                        should.exist(data);
                        data.should.equal(expectedData);
                        done();
                    });
                });
            });

            describe('when there is an http error', function () {
                beforeEach(function () {
                    nocked
                        .get('/v1/apps')
                        .reply(500);
                });

                it('returns error to callback', function (done) {
                    respoke.apps.get(function (err) {
                        should.exist(err);
                        err.should.be.an.instanceof(errors.UnexpectedServerResponseError);
                        done();
                    });
                });

                it('rejects promise with error', function (done) {
                    respoke.apps.get().catch(function (err) {
                        should.exist(err);
                        err.should.be.an.instanceof(errors.UnexpectedServerResponseError);
                        done();
                    });
                });
            });
        });
    });
});
