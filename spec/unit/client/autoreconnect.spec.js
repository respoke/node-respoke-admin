'use strict';
var _Respoke = require('../../../index');
var errors = require('../../../lib/utils/errors');
var assert = require('assert');
var _sinon = require('sinon');
var sinon;
var debug = require('debug')('respoke-tests-autoreconnect');
var IO = require('socket.io');
var fakeBase = 'http://localhost:5050/v1';
var io;
var clientSocket;

function Respoke(params) {
    var instance = new _Respoke(params);
    instance.baseURL = fakeBase;
    return instance;
}

function startSocketIOServer(done) {
    io = IO.listen(5050, function (err) { // this port seems halfway decent
        if (err) {
            done(err);
            return;
        }
        debug('socket.io server up');
        done();
    });
    io.sockets.on('connection', function (socket) {
        debug('socket connection', socket.id);
        clientSocket = socket;

        socket.on('reconnect', function () {
            debug('socket reconnect', socket.id);
        });

        socket.on('disconnect', function () {
            debug('socket disconnect', socket.id);
        });

        socket.on('post', function (post, callback) {
            debug('socket receive post', post);
            post = JSON.parse(post);
            if (callback) {
                if (post.url === 'http://localhost:5050/v1/connections') {
                    callback({
                        endpointId: post.data.endpointId,
                        connectionId: 'some-connection-id'
                    });
                } else {
                    callback();
                }
            }
        });
    });
    io.set('authorization', function (handshake, next) {
        next(null, true);
    });
}

describe('autoreconnect', function () {
    var respoke;
    // Main thing here is to make sure the web socket always connects.
    beforeEach(function (done) {
        sinon = _sinon.sandbox.create();
        startSocketIOServer(done);
    });
    afterEach(function (done) {
        if (!respoke) {
            done();
            return;
        }
        if (!respoke.socket) {
            respoke = null;
            done();
            return;
        }
        if (!respoke.socket.socket.connected) {
            respoke = null;
            done();
            return;
        }
        respoke.close(done);
        respoke = null;
    });
    afterEach(function (done) {
        io.server.close(function () {
            sinon.restore();
            sinon = null;
            io = null;
            done();
        });
    });

    describe('when creating a client without specifying autoreconnect or specifying falsey', function () {
        describe('in all scenarios', function () {
            it('has autoreconnect=false', function () {
                assert.equal(Respoke().autoreconnect, false);
                assert.equal(Respoke({ autoreconnect: false }).autoreconnect, false);
                assert.equal(Respoke({ autoreconnect: 0 }).autoreconnect, false);
            });
        });
        describe('with App-Secret', function () {
            this.timeout(5000);
            it('does not attempt to reconnect after a socket disconnect', function (done) {
                respoke = Respoke();
                sinon.spy(respoke.auth, 'connect');
                sinon.spy(respoke, '_attemptAutoreconnect');

                respoke.auth.connect({ 'App-Secret': 'asdf', endpointId: 'chris' });
                respoke.once('connect', function () {
                    assert.equal(respoke.auth.connect.callCount, 1);
                    // server disconnects
                    clientSocket.disconnect();
                    setTimeout(function () {
                        assert.equal(respoke._attemptAutoreconnect.called, false);
                        assert.equal(respoke.auth.connect.callCount, 1); // same as earlier
                        done();
                    }, 2200);
                });
            });
        });
        describe('without App-Secret', function () {
            this.timeout(5000);
            it('does not attempt to reconnect after a socket disconnect', function (done) {
                respoke = Respoke({ autoreconnect: false });
                sinon.spy(respoke.auth, 'connect');
                sinon.spy(respoke, '_attemptAutoreconnect');

                respoke.auth.connect({ 'App-Token': 'beef-wellington', endpointId: 'elbert' });
                respoke.once('connect', function () {
                    assert.equal(respoke.auth.connect.callCount, 1);
                    clientSocket.disconnect();
                    setTimeout(function () {
                        assert.equal(respoke._attemptAutoreconnect.called, false);
                        assert.equal(respoke.auth.connect.callCount, 1); // same
                        done();
                    }, 2200);
                });
            });
        });
    });
    describe('when creating a client specifying truthy autoreconnect', function () {
        it('has autoreconnect=true', function () {
            assert.equal(Respoke({ autoreconnect: true }).autoreconnect, true);
            assert.equal(Respoke({ autoreconnect: 'yes' }).autoreconnect, true);
            assert.equal(Respoke({ autoreconnect: 1 }).autoreconnect, true);
        });
    });
    describe('when a socket disconnects and autoreconnect is specified, but App-Secret is empty', function () {
        it('emits an error', function (done) {
            respoke = Respoke({ autoreconnect: true });
            assert.equal(respoke.autoreconnect, true);
            respoke.auth.connect({ 'App-Token': 'groggy-dolphins' });
            respoke.once('connect', function () {
                clientSocket.disconnect();
            });
            respoke.once('error', function (err) {
                console.log(err.message, err.stack)
                assert(err instanceof errors.MissingAppSecretDuringAutoreconnect);
                done();
            });
        });
    });
    // main test of the autoreconnect functionality
    describe('when the socket disconnects unexpectedly and autoreconnect and App-Secret are set on the client', function () {
        it('calls the internal reconnect handler after the timeout', function (done) {
            this.timeout(5000);
            respoke = Respoke({
                autoreconnect: true,
                'App-Secret': 'rainbow-dash',
                endpointId: 'bilton'
            });
            var spy = sinon.spy(respoke, '_attemptAutoreconnect');
            respoke.auth.connect();
            assert.equal(spy.callCount, 0);
            respoke.once('connect', function () {
                assert.equal(spy.callCount, 0);
                // Important that there is no timeout before calling disconnect,
                // so we know the state is clean and we are already (hopefully)
                // connected.
                // It should add a timer and then reconnect.
                assert(!respoke.autoreconnectTimeout);
                // server disconnects the client web socket
                clientSocket.disconnect();

                setTimeout(function () {
                    assert(respoke.autoreconnectTimeout); // indicates now waiting to reconnect
                    assert.equal(spy.callCount, 0);
                    respoke.once('connect', function () {
                        assert.equal(spy.callCount, 1);
                        done();
                    });
                }, 300);
            });
        });
        it('resets the reconnect timeout after a reconnect', function (done) {
            respoke = Respoke({
                autoreconnect: true,
                'App-Secret': 'rainbow-bright',
                endpointId: 'muddy-waters'
            });
            sinon.spy(respoke, 'clearAutoreconnectTimeout');
            respoke.auth.connect();
            assert.equal(respoke.clearAutoreconnectTimeout.callCount, 0);
            respoke.once('connect', function () {
                assert.equal(respoke.clearAutoreconnectTimeout.callCount, 0);
                clientSocket.disconnect();
                assert.equal(respoke.clearAutoreconnectTimeout.callCount, 0);
                respoke.once('connect', function () {
                    assert.equal(respoke.clearAutoreconnectTimeout.callCount, 3);
                    done();
                });
            });
        });
        it('exponentionally iterates the reconnect timer up to 60 seconds', function (done) {
            respoke = Respoke({
                autoreconnect: true,
                'App-Secret': 'elephant-tusks',
                endpointId: 'arty-too-smarty'
            });
            respoke.auth.connect();
            sinon.stub(respoke.auth, 'connect', function () {});
            respoke.once('connect', function () {
                io.server.close();
                clientSocket.disconnect();
                // give it a little time to shut down
                setTimeout(function () {
                    assert.equal(respoke.autoreconnectInterval, 1000);
                    respoke._attemptAutoreconnect();
                    assert.equal(respoke.autoreconnectInterval, 2000);
                    respoke._attemptAutoreconnect();
                    assert.equal(respoke.autoreconnectInterval, 4000);
                    respoke._attemptAutoreconnect();
                    assert.equal(respoke.autoreconnectInterval, 8000);
                    respoke._attemptAutoreconnect();
                    assert.equal(respoke.autoreconnectInterval, 16000);
                    respoke._attemptAutoreconnect();
                    assert.equal(respoke.autoreconnectInterval, 32000);
                    respoke._attemptAutoreconnect();
                    assert.equal(respoke.autoreconnectInterval, 60000);
                    respoke._attemptAutoreconnect();
                    assert.equal(respoke.autoreconnectInterval, 60000);
                    done();
                }, 250);
            });
        });

    });
    describe('when the socket is disconnected by calling close()', function () {
        it('does not try to autoreconnect', function (done) {
            this.timeout(10000);
            respoke = Respoke({
                autoreconnect: true,
                'App-Secret': 'elephant-tusks',
                endpointId: 'arty-too-smarty'
            });
            respoke.auth.connect();
            sinon.spy(respoke, '_attemptAutoreconnect');
            respoke.once('connect', function () {
                respoke.close();
                setTimeout(function () {
                    assert.equal(respoke.autoreconnectInterval, 1000);
                    assert.equal(respoke.autoreconnectTimeout, null);
                    assert.equal(respoke._attemptAutoreconnect.callCount, 0);
                    setTimeout(function () {
                        assert.equal(respoke.autoreconnectInterval, 1000);
                        assert.equal(respoke.autoreconnectTimeout, null);
                        assert.equal(respoke._attemptAutoreconnect.callCount, 0);
                        assert.equal(respoke.socket.socket.connected, false);
                        done();
                    }, 2000);
                }, 500);
            });
        });
    });
    describe('when connect is called the second time', function () {
        it('clears the reconnect tracking variables and timer', function (done) {
            respoke = Respoke({
                autoreconnect: true,
                'App-Secret': 'a-b-c-d',
                endpointId: 'billy-mays'
            });
            sinon.spy(respoke, 'clearAutoreconnectTimeout');
            assert.equal(respoke.clearAutoreconnectTimeout.called, false);
            respoke.auth.connect();
            respoke.once('connect', function () {
                assert.equal(respoke.clearAutoreconnectTimeout.callCount, 0);
                clientSocket.disconnect();
                respoke.once('connect', function () { // reconnection
                    assert.equal(respoke.clearAutoreconnectTimeout.callCount, 3);
                    done();
                });
            });
        });
    });
});
