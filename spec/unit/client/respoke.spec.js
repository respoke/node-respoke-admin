/*
 * Copyright 2014, Digium, Inc.
 * All rights reserved.
 *
 * This source code is licensed under The MIT License found in the
 * LICENSE file in the root directory of this source tree.
 *
 * For all details and documentation:  https://www.respoke.io
 */
'use strict';
var helpers = require('../../helpers');
var should = require('should');
var nock = require('nock');

describe('respoke base methods and properties', function () {
    var respoke;
    var nocked;

    beforeEach(function () {
        respoke = helpers.createRespoke();
        nocked = nock(helpers.baseDomain);
        nock.disableNetConnect(helpers.baseDomain);
    });
    afterEach(function () {
        nock.cleanAll();
        nock.enableNetConnect();
    });

    it('has request', function () {
        should.exist(respoke.request);
        respoke.request.should.be.a.Function;
    });

    it('has wsCall', function () {
        should.exist(respoke.wsCall);
        respoke.wsCall.should.be.a.Function;
    });

    it('is an EventEmitter', function () {
        should.exist(respoke.on);
        should.exist(respoke.emit);
        respoke.on.should.be.a.Function;
        respoke.emit.should.be.a.Function;
    });

    it('has expected properties', function () {
        should.exist(respoke.tokens);
        respoke.tokens.should.be.an.Object;
        should.not.exist(respoke.connectionId);
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
