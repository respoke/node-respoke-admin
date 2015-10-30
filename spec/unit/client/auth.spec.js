'use strict';
var helpers = require('../../helpers.js');
var should = require('should');
var uuid = require('uuid');
var nock = require('nock');
var errors = helpers.errors;
var sinon = require('sinon');

describe('auth', function () {

    var respoke;
    var nocked;

    beforeEach(function () {
        nocked = nock(helpers.baseDomain);
        nock.disableNetConnect(helpers.baseDomain);
    });
    afterEach(function () {
        nock.cleanAll();
        nock.enableNetConnect();
        sinon.restore();
    });

    describe('authenticating as an endpoint', function () {

        beforeEach(function () {
            respoke = helpers.createRespoke();
        });

        describe('in all scenarios', function () {
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
        });

        describe('when there is an http error', function () {
            beforeEach(function () {
                nocked
                    .post('/v1/tokens')
                    .reply(500);
            });

            it('returns an error to callback', function (done) {
                respoke.auth.endpoint({
                    appId: uuid.v4(),
                    endpointId: uuid.v4()
                }, function (err) {
                    should.exist(err);
                    err.should.be.an.instanceof(errors.UnexpectedServerResponseError);
                    done();
                });
            });

            it('rejects the promise with an error', function (done) {
                respoke.auth.endpoint({
                    appId: uuid.v4(),
                    endpointId: uuid.v4()
                }).catch(function (err) {
                    should.exist(err);
                    err.should.be.an.instanceof(errors.UnexpectedServerResponseError);
                    done();
                });
            });
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
    });

    describe('using sessionToken()', function () {

        beforeEach(function () {
            respoke = helpers.createRespoke();
        });

        describe('when no tokenId is provided', function () {
            it('calls the callback with an error', function (done) {
                respoke.auth.sessionToken({
                    tokenId: null
                }, function (err) {
                    should.exist(err);
                    err.message.should.match(/tokenId/);
                    done();
                });
            });
        });

        describe('when there is an http error', function () {
            beforeEach(function () {
                nocked.post('/v1/session-tokens').reply(500);
            });

            it('returns error to callback', function (done) {
                respoke.auth.sessionToken({
                    tokenId: uuid.v4()
                }, function (err) {
                    should.exist(err);
                    err.should.be.an.instanceof(errors.UnexpectedServerResponseError);
                    should.not.exist(respoke.tokens['App-Token']);
                    done();
                });
            });

            it('rejects promise with error', function (done) {
                respoke.auth.sessionToken({
                    tokenId: uuid.v4()
                }).catch(function (err) {
                    should.exist(err);
                    err.should.be.an.instanceof(errors.UnexpectedServerResponseError);
                    should.not.exist(respoke.tokens['App-Token']);
                    done();
                });
            });
        });

        describe('when there is no http error', function () {

            beforeEach(function () {
                nocked.post('/v1/session-tokens').reply(200, { token: 'booya' });
            });

            it('returns data to callback', function (done) {
                respoke.auth.sessionToken({
                    tokenId: uuid.v4()
                }, function (err, data) {
                    should.not.exist(err);
                    should.exist(data);
                    should.deepEqual(data, { token: 'booya' });
                    respoke.tokens['App-Token'].should.equal('booya');
                    done();
                });
            });

            it('resolves promise with data', function () {
                return respoke.auth.sessionToken({
                    tokenId: uuid.v4()
                }).then(function (data) {
                    should.deepEqual(data, { token: 'booya' });
                    respoke.tokens['App-Token'].should.equal('booya');
                });
            });
        });
    });

    describe('connecting as an admin', function () {

        beforeEach(function () {
            respoke = helpers.createRespoke();
            respoke.tokens['Admin-Token'] = null;
        });

        it('requires a username', function (done) {
            respoke.auth.admin({}, function (err) {
                should.exist(err);
                err.message.should.match(/username/);
                done();
            });
        });

        it('requires a password', function (done) {
            respoke.auth.admin({ username: 'zoom' }, function (err) {
                should.exist(err);
                err.message.should.match(/password/);
                done();
            });
        });

        describe('when there is no http error', function () {

            beforeEach(function () {
                nocked.post('/v1/adminsessions', {
                    username: 'ping',
                    password: 'pong'
                }).reply(200, { token: 'booya' });
            });

            it('returns data to callback', function (done) {
                respoke.auth.admin({
                    username: 'ping',
                    password: 'pong'
                }, function (err, data) {
                    should.not.exist(err);
                    should.exist(data.token);
                    data.token.should.equal('booya');
                    respoke.tokens['Admin-Token'].should.equal('booya');
                    done();
                });
            });

            it('resolves promise with data', function (done) {
                respoke.auth.admin({
                    username: 'ping',
                    password: 'pong'
                }).then(function (data) {
                    should.exist(data.token);
                    data.token.should.equal('booya');
                    respoke.tokens['Admin-Token'].should.equal('booya');
                    done();
                });
            });
        });

        describe('when there is an http error', function () {
            beforeEach(function () {
                nocked.post('/v1/adminsessions', {
                    username: 'ping',
                    password: 'pong'
                }).reply(500);
            });

            it('returns error to callback', function (done) {
                respoke.auth.admin({
                    username: 'ping',
                    password: 'pong'
                }, function (err) {
                    should.exist(err);
                    err.should.be.an.instanceof(errors.UnexpectedServerResponseError);
                    should.not.exist(respoke.tokens['Admin-Token']);
                    done();
                });
            });

            it('rejects promise with error', function (done) {
                respoke.auth.admin({
                    username: 'ping',
                    password: 'pong'
                }).catch(function (err) {
                    should.exist(err);
                    err.should.be.an.instanceof(errors.UnexpectedServerResponseError);
                    should.not.exist(respoke.tokens['Admin-Token']);
                    done();
                });
            });
        });
    });

    describe('connect method', function () {
        describe('in all scenarios', function () {
            beforeEach(function () {
                respoke = helpers.createRespokeWithFakeSocket();
                respoke.tokens['App-Token'] = null;
                respoke.tokens['App-Secret'] = null;
                respoke.tokens['Admin-Token'] = null;
            });

            it('requires auth tokens', function (done) {
                respoke.once('error', function (err) {
                    should.exist(err);
                    err.should.be.instanceof(errors.NoAuthenticationTokens);
                    done();
                });
                process.nextTick(respoke.auth.connect);
            });

            it('requires an endpointId when connecting as admin', function (done) {
                respoke.tokens['App-Secret'] = uuid.v4();
                respoke.once('error', function (err) {
                    should.exist(err);
                    err.should.be.instanceof(errors.MissingEndpointIdAsAdmin);
                    done();
                });
                process.nextTick(respoke.auth.connect);
            });
        });

        describe('with no connection errors', function () {
            var expectedListeners = [
                'connect',
                'disconnect',
                'reconnect',
                'reconnecting',
                'error',
                'connect_error',
                'connect_timeout',
                'message',
                'presence',
                'join',
                'leave',
                'pubsub'
            ];

            beforeEach(function (done) {
                respoke = helpers.createRespoke();
                respoke.auth.connect({
                    'App-Secret': 'e56016cf-3c77-44e3-bcfc-44b3a41f89be',
                    endpointId: 'jolly-fellow'
                });
                sinon.spy(respoke.socket, 'on');
                process.nextTick(done);
            });

            it('assigns the correct number of listeners', function () {
                respoke.socket.on.callCount.should.equal(expectedListeners.length);
                expectedListeners.forEach(function (expectedEvent) {
                    respoke.socket.on.calledWith(expectedEvent).should.equal(true);
                });
            });
        });
    });

    describe('disconnect', function () {
        beforeEach(function () {
            respoke = helpers.createRespokeWithFakeSocket();
            respoke.auth.connect();
            sinon.spy(respoke.socket, 'disconnect');

            sinon.stub(respoke, 'wsCall', function () {
                respoke.socket.emit('disconnect');
                return Promise.resolve();
            });
        });
        describe('when called', function () {
            it('disconnects socket', function () {
                return respoke.close()
                    .then(function () {
                        respoke.socket.disconnect.should.have.property('calledOnce', true);
                    });
            });
        });
    });
});
