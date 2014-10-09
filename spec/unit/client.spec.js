'use strict';
var helpers = require('../helpers');
var Respoke = require('../../index');
var should = require('should');
var uuid = require('uuid');
var nock = require('nock');
var errors = require('../../lib/utils/errors');

nock.disableNetConnect();

describe('respoke', function () {
    var respoke;
    var nocked;
    var baseDomain = 'http://respoke.test';
    var baseURL = baseDomain + '/v1';

    before(function () {
        nocked = nock(baseDomain);
    });

    describe('Base methods and properties', function () {
        before(function () {
            respoke = new Respoke({
                baseURL: baseURL
            });
        });

        it('has request', function () {
            respoke.request.should.be.a.Function;
        });

        it('has wsCall', function () {
            respoke.wsCall.should.be.a.Function;
        });

        it('is an EventEmitter', function () {
            respoke.on.should.be.a.Function;
            respoke.emit.should.be.a.Function;
        });

        it('has expected properties', function () {
            respoke.tokens.should.be.an.Object;
            (respoke.connectionId === null).should.be.ok;
            (respoke.socket === null).should.be.ok;
            respoke.baseURL.should.be.a.String;
            respoke.baseURL.should.not.be.empty;

            respoke.auth.should.be.an.Object;
            respoke.groups.should.be.an.Object;
            respoke.messages.should.be.an.Object;
            respoke.roles.should.be.an.Object;
            respoke.apps.should.be.an.Object;
            respoke.presence.should.be.an.Object;
            });
    });

    describe('auth', function () {
        describe('endpoint', function () {
            before(function () {
                respoke = new Respoke({
                    baseURL: baseURL
                });
            });

            it('requires an appId', function (done) {
                respoke.auth.endpoint({}, function (err) {
                    should.exist(err);
                    err.message.should.match(/appId is null/);
                    done();
                });
            });

            it('requires an endpointId', function (done) {
                respoke.auth.endpoint(
                    { appId: uuid.v4() },
                    function (err) {
                        should.exist(err);
                        err.message.should.match(/endpointId is null/);
                        done();
                    }
                );
            });

            describe('when there is no http error', function () {
                var expectedData = 'booya';

                beforeEach(function () {
                    nocked
                        .post('/v1/tokens')
                        .reply(200, expectedData);
                });

                it('returns data to callback', function (done) {
                    respoke.auth.endpoint({
                        appId: uuid.v4(),
                        endpointId: uuid.v4()
                    }, function (err, data) {
                        should.not.exist(err);
                        data.should.equal(expectedData);
                        done();
                    });
                });

                it('resolves promise with data', function (done) {
                    respoke.auth.endpoint({
                        appId: uuid.v4(),
                        endpointId: uuid.v4()
                    }).then(function (data) {
                        data.should.equal(expectedData);
                        done();
                    });
                });
            });

            describe('when there is an http error', function () {
                var expectedData = 'booya';

                beforeEach(function () {
                    nocked
                        .post('/v1/tokens')
                        .reply(500, expectedData);
                });

                it('returns error to callback', function (done) {
                    respoke.auth.endpoint({
                        appId: uuid.v4(),
                        endpointId: uuid.v4()
                    }, function (err) {
                        should.exist(err);
                        err.should.be.an.instanceof(errors.UnexpectedServerResponseError);
                        done();
                    });
                });

                it('rejects promise with error', function (done) {
                    respoke.auth.endpoint({
                        appId: uuid.v4(),
                        endpointId: uuid.v4()
                    }).catch(function (err) {
                        err.should.be.an.instanceof(errors.UnexpectedServerResponseError);
                        done();
                    });
                });
            });
        });
    });
});
