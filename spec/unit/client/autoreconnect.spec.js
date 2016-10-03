'use strict';
var Respoke = require('../../../index');
var assert = require('assert');
var uuid = require('uuid');
var nock = require('nock');
var sinon = require('sinon');
var debug = require('debug')('respoke-tests-autoreconnect');
var IO = require('socket.io');
var io;

describe.only('autoreconnect', function () {
    beforeEach(function (done) {
        io = IO.listen(5050, function (err) {
            if (err) {
                done(err);
                return;
            }
            debug('socket.io server up');
            done();
        }); // this port seems halfway decent
        io.sockets.on('connection', function (socket) {
            debug('socket connection', socket.id);
            socket.on('reconnect', function () {
                debug('socket reconnect', socket.id);
            });

            socket.on('disconnect', function () {
                debug('socket disconnect', socket.id);
            });
        });
    });
    afterEach(function () {
        io.server.close();
        io = null;
    });

    describe('when creating a client without specifying autoreconnect or specifying falsey', function () {
        it('has autoreconnect=false', function () {
            assert.equal(new Respoke().autoreconnect, false);
            assert.equal(new Respoke({ autoreconnect: false }).autoreconnect, false);
            assert.equal(new Respoke({ autoreconnect: 0 }).autoreconnect, false);
        });
        it('does not attempt to reconnect after a socket diconnect');
    });
    describe('when creating a client specifying truthy autoreconnect', function () {
        it('has autoreconnect=true', function () {
            assert.equal(new Respoke({ autoreconnect: true }).autoreconnect, true);
            assert.equal(new Respoke({ autoreconnect: 'yes' }).autoreconnect, true);
            assert.equal(new Respoke({ autoreconnect: 1 }).autoreconnect, true);
        });
    });
    describe('when a socket disconnects and autoreconnect is specified, but App-Secret is empty', function () {
        it('emits an error', function () {
            var respoke = new Respoke({ autoreconnect: true });
            assert.equal(respoke.autoreconnect, true);

        });
    });
    describe('when the socket disconnects and autoreconnect and App-Secret are set on the client', function () {
        it('calls the internal reconnect handler after the timeout');
        it('resets the reconnect timeout upon disconnect');
        it('exponentionally iterates the reconnect timer up to 60 seconds');

    });
    describe('when the socket is diconnected by calling disconnect', function () {
        it('does not try to autoreconnect');
    });
    describe('when connect is called', function () {
        it('clears the reconnect tracking variables and timer');
    });
});
