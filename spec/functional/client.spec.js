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
var Respoke = require('../../index');
var should = require('should');
var helpers = require('../helpers');
var uuid = require('uuid');

var config = helpers.loadConfig();
var respoke;

describe('Respoke functional', function () {
    this.timeout(10000);

    describe('Authentication', function () {
        beforeEach(function () {
            respoke = new Respoke({
                baseURL: config.baseURL
            });
        });
        afterEach(function () {
            if (respoke && respoke.socket) {
                return respoke.close();
            }
        });
        describe('via username and password', function () {
            describe('when using bad credentials', function () {
                it('fails admin auth with bad credentials', function (done) {
                    respoke.auth.admin({
                        username: 'ducksized',
                        password: 'sea-monkeys'
                    }, function (err) {
                        should.exist(err);
                        err.should.be.an.instanceof(Error);
                        done();
                    });
                });
            });
            describe('when using good credentials', function () {
                it('succeeds and sets Admin-Token', function (done) {
                    respoke.auth.admin(config.auth, function (err, body) {
                        if (err) {
                            return done(err);
                        }
                        body.token.should.be.a.String;
                        should.exist(respoke.tokens['Admin-Token']);
                        done();
                    });
                });
            });
        });
        describe('via App-Secret', function () {
            describe('when using good credentials', function () {
                it('obtains a tokenId that another client can use to connect to respoke', function (done) {
                    respoke.tokens['App-Secret'] = config.appSecret;
                    var billy = new Respoke({ baseURL: config.baseURL });
                    return respoke.auth.endpoint({
                        endpointId: 'billy',
                        appId: config.appId,
                        roleId: config.roleId
                    }).then(function (body) {
                        should.exist(body);
                        body.tokenId.should.be.a.String;
                        return body.tokenId;
                    }).then(function (tokenId) {
                        return billy.auth.sessionToken({
                            tokenId: tokenId
                        }).then(function () {
                            billy.tokens['App-Token'].should.be.a.String;
                            billy.on('connect', function () {
                                billy.close(done);
                            });
                            billy.on('error', done);
                            billy.auth.connect();
                        });
                    });
                });
            });
        });
        describe('when using App-Secret to connect via web socket', function () {
            var adminClient;
            var joe;
            beforeEach(function (done) {
                adminClient = new Respoke({
                    baseURL: config.baseURL,
                    'App-Secret': config.appSecret,
                    appId: config.appId
                });
                adminClient.on('connect', function () {
                    done();
                });
                adminClient.on('error', function (err) { throw err; });
                adminClient.auth.connect({ endpointId: 'princess' });
            });
            afterEach(function () {
                afterEach(function () {
                    return adminClient.close().then(joe.close);
                });
            });
            describe('and the App-Secret client does brokered auth for a non-admin client', function () {
                var tokenId;
                beforeEach(function (done) {
                    adminClient.auth.endpoint({
                        endpointId: 'joe',
                        roleId: config.roleId,
                        appId: config.appId
                    }, function (err, tokenData) {
                        if (err) { throw err; }
                        should.exist(tokenData.tokenId);
                        tokenId = tokenData.tokenId;
                        done();
                    });
                });
                it('the non-admin client can also connect via web socket', function (done) {
                    joe = new Respoke({
                        baseURL: config.baseURL
                    });
                    joe.on('connect', done);
                    joe.on('error', function (err) { throw err; });
                    joe.auth.sessionToken({ tokenId: tokenId }).then(function (sessionData) {
                        should.exist(sessionData.token);
                        joe.auth.connect();
                    });
                });
            });
        });
    });

    describe('Apps', function () {
        describe('getting apps', function () {
            describe('by appId', function () {
                beforeEach(function (done) {
                    respoke = new Respoke({
                        baseURL: config.baseURL
                    });
                    respoke.auth.admin(config.auth, done);
                });
                it('calls the callback with no error and the app object', function (done) {
                    respoke.apps.get({ appId: config.appId }, function (err, singleApp) {
                        should.not.exist(err);
                        singleApp.should.be.an.instanceof(Object).and.not.be.an.instanceof(Array);
                        singleApp.id.should.equal(config.appId);
                        done();
                    });
                });
            });
            describe('when logged in via admin-token and specifying no appId', function () {
                beforeEach(function (done) {
                    respoke = new Respoke({
                        baseURL: config.baseURL
                    });
                    respoke.auth.admin(config.auth, done);
                });
                it('calls the callback with an array', function (done) {
                    respoke.apps.get(function (err, allApps) {
                        should.not.exist(err);
                        allApps.should.be.an.instanceof(Array);
                        done();
                    });
                });
            });
        });
    });

    describe('Roles', function () {
        describe('when getting all roles for an app', function () {
            beforeEach(function (done) {
                respoke = new Respoke({
                    baseURL: config.baseURL
                });
                respoke.auth.admin(config.auth, done);
            });
            it('calls the callback with no error and an array of roles', function () {
                return respoke.roles.get({ appId: config.appId }).then(function (roles) {
                    roles.should.be.an.Array;
                }, function (err) { throw err; });
            });
        });
        describe('when creating a role', function () {

            var createdRole;
            var testRoleName;

            beforeEach(function (done) {
                createdRole = null;
                testRoleName = 'test-role-' + uuid.v4();
                respoke = new Respoke({
                    baseURL: config.baseURL
                });
                respoke.auth.admin(config.auth, done);
            });
            beforeEach(function (done) {
                var roleParams = {
                    appId: config.appId,
                    name: testRoleName
                };
                respoke.roles.create(roleParams, function (err, _createdRole) {
                    should.not.exist(err);
                    createdRole = _createdRole;
                    done();
                });
            });
            afterEach(function (done) {
                if (!createdRole || !createdRole.id) {
                    done();
                    return;
                }
                respoke.roles.delete({ roleId: createdRole.id }, function (err) {
                    should.not.exist(err);
                    done();
                });
            });
            it('succeeds and exists when requesting all roles for the app', function (done) {
                createdRole.should.be.an.Object;
                createdRole.appId.should.equal(config.appId);
                createdRole.name.should.be.a.String.and.equal(testRoleName);
                respoke.roles.get({ appId: config.appId }, function (err, roles) {
                    should.not.exist(err);
                    var roleIds = roles.map(function (r) { return r.id; });
                    var roleNames = roles.map(function (r) { return r.name; });
                    roleIds.indexOf(createdRole.id).should.not.equal(-1);
                    roleNames.indexOf(testRoleName).should.not.equal(-1);
                    done();
                });
            });
        });
    });

    describe('Messaging and Groups', function () {
        var adminEndpointId;
        var endpointId1;
        var endpointId2;
        var adminClient;
        var client1;
        var client2;
        var createdClients;

        beforeEach(function (done) {
            adminEndpointId = "admin-" + uuid.v4();
            endpointId1 = "client1-" + uuid.v4();
            endpointId2 = "client2-" + uuid.v4();
            adminClient = null;
            client1 = null;
            client2 = null;
            createdClients = 0;

            var onConnect = function () {
                createdClients++;
                if (createdClients === 2) {
                    done();
                }
            };

            adminClient = new Respoke({
                baseURL: config.baseURL,
                'App-Secret': config.appSecret,
                appId: config.appId
            });

            // do brokered auth for each client

            client1 = new Respoke({ baseURL: config.baseURL });
            client2 = new Respoke({ baseURL: config.baseURL });

            client1.on('connect', onConnect);
            client2.on('connect', onConnect);

            client1.on('error', function (err) { throw err; });
            client2.on('error', function (err) { throw err; });

            var client1Endpoint = {
                endpointId: endpointId1,
                appId: config.appId,
                roleId: config.roleId
            };
            var client2Endpoint = {
                endpointId: endpointId2,
                appId: config.appId,
                roleId: config.roleId
            };

            function client1AfterSession(sessionInfo) {
                should.exist(sessionInfo);
                should.exist(sessionInfo.token);
                client1.tokens['App-Token'].should.equal(sessionInfo.token);
                client1.auth.connect();
            }
            function client2AfterSession(sessionInfo) {
                should.exist(sessionInfo);
                should.exist(sessionInfo.token);
                client2.tokens['App-Token'].should.equal(sessionInfo.token);
                client2.auth.connect();
            }

            adminClient.auth.endpoint(client1Endpoint, function (err, authInfo) {
                should.exist(authInfo);
                should.exist(authInfo.tokenId);
                client1.auth.sessionToken({ tokenId: authInfo.tokenId })
                    .then(client1AfterSession, function (err) { throw err; });
            });
            adminClient.auth.endpoint(client2Endpoint, function (err, authInfo) {
                should.exist(authInfo);
                should.exist(authInfo.tokenId);
                client2.auth.sessionToken({ tokenId: authInfo.tokenId })
                    .then(client2AfterSession, function (err) { throw err; });
            });
        });

        afterEach(function () {
            return Promise.all([
                client1.close(),
                client2.close()
            ]);
        });

        // client 1 sending a message to client 2
        describe('when client 1 sends a message to client 2', function () {
            it('client 2 receives the message', function (done) {

                client2.on('message', function (data) {
                    data.header.type.should.equal('message');
                    data.header.from.should.equal(endpointId1);
                    data.body.should.equal('Hi there client 1');
                    done();
                });

                client1.messages.send({
                    to: endpointId2,
                    message: 'Hi there client 1'
                }, function (err) {
                    if (err) {
                        throw err;
                    }
                });
            });
        });
        describe('when client 1 and client 2 join a group', function () {
            var groupId;
            beforeEach(function () {
                groupId = 'somegroup-' + uuid.v4();
                return Promise.all([
                    client1.groups.join({ groupId: groupId }),
                    client2.groups.join({ groupId: groupId })
                ]);
            });
            describe('and client 1 listens for presence', function () {
                beforeEach(function () {
                    return client1.presence.observe(endpointId2);
                });
                it('client 1 receives a presence event sent from client 2', function (done) {
                    // the test
                    client1.on('presence', function (data) {
                        should.exist(data);
                        should.exist(data.header);
                        data.header.from.should.equal(endpointId2);
                        data.header.fromConnection.should.be.a.String;
                        data.type.should.equal('At lunch');
                        done();
                    });

                    // ensure there was time to subscribe
                    setTimeout(function () {
                        client2.presence.set({
                            endpointId: endpointId2,
                            presence: 'At lunch'
                        }, function (err) {
                            if (err) {
                                throw err;
                            }
                        });
                    }, 500);
                });
            });
            describe('and client 1 sends a group message', function () {
                it('client 2 receives the group message', function (done) {
                    client2.on('pubsub', function (data) {
                        data.header.from.should.equal(endpointId1);
                        data.header.groupId.should.equal(groupId);
                        data.header.type.should.equal('pubsub');
                        data.message.should.equal('Silly hats');
                        done();
                    });
                    client1.groups.publish({
                        groupId: groupId,
                        message: 'Silly hats'
                    }, function (err) {
                        if (err) {
                            return done(err);
                        }
                    });
                });
            });
            describe('and an admin client is connected', function () {
                beforeEach(function (done) {
                    adminClient.on('connect', done);
                    adminClient.auth.connect({ endpointId: 'brewster' });
                });
                afterEach(function () {
                    return adminClient.close();
                });
                it('the admin clients sends a message from a different endpoint', function (done) {

                    client2.on('pubsub', function (data) {
                        // The core test is that the endpointId is the one we specified
                        data.header.from.should.equal('BATMAN');
                        data.header.from.should.not.equal('__SYSTEM__');
                        data.header.from.should.not.equal(endpointId1);

                        // also important
                        data.header.groupId.should.equal(groupId);
                        data.header.type.should.equal('pubsub');
                        data.message.should.equal('Hi little guy');
                        done();
                    });

                    adminClient.groups.publish({
                        groupId: groupId,
                        message: 'Hi little guy',
                        endpointId: 'BATMAN'
                    }, function (err) {
                        if (err) {
                            throw err;
                        }
                    });
                });
            });
        });

        describe('when client 1 listens for join/leave events on a group', function () {
            describe('and client2 joins and leaves the group', function () {
                it('gets join and leave events', function (done) {
                    var groupId = 'somegroup-' + uuid.v4();
                    var gotJoin = false;
                    var alreadyDoned = false;

                    client1.groups.join({ groupId: groupId }, function (err) {
                        if (err) {
                            return done(err);
                        }
                        client1.on('join', function (data) {
                            if (data.endpointId === endpointId1) {
                                // ignore self;
                                return;
                            }
                            should.exist(data.header);
                            should.exist(data.header.type);
                            should.exist(data.header.groupId);

                            data.header.type.should.equal('join');
                            data.header.groupId.should.equal(groupId);
                            data.endpointId.should.equal(endpointId2);
                            data.connectionId.should.be.a.String;
                            gotJoin = true;
                        });

                        setTimeout(function () {

                            client2.groups.join({ groupId: groupId }, function (err) {
                                if (err) {
                                    return done(err);
                                }
                                setTimeout(function () {
                                    client2.groups.leave({ groupId: groupId }, function (err) {
                                        if (err) {
                                            return done(err);
                                        }
                                    });
                                }, 500);
                            });

                        }, 500);
                    });

                    client1.on('leave', function (data) {
                        data.header.type.should.equal('leave');
                        data.header.groupId.should.equal(groupId);
                        data.endpointId.should.equal(endpointId2);
                        data.connectionId.should.be.a.String;

                        if (!gotJoin) {
                            return done(new Error("Did not get join event"));
                        }
                        // Some of the connections are not getting cleaned up properly.
                        // This leave is getting called more than once with the same endpointId but
                        // different connectionIds.
                        if (!alreadyDoned) {
                            alreadyDoned = true;
                            done();
                        }
                    });

                });
            });
        });

    });

});
