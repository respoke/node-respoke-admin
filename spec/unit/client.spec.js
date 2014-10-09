'use strict';
var helpers = require('../helpers');
var Respoke = require('../../index');
var should = require('should');

describe('respoke', function () {
    describe('Base methods and properties', function () {
        var respoke;

        before(function () {
            respoke = new Respoke({
                baseURL: helpers.baseURL
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
});
