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
            beforeEach(function (done) {
                adminClient = new Respoke({
                    baseURL: config.baseURL,
                    'App-Secret': config.appSecret,
                    appId: config.appId
                });
                adminClient.on('connect', function () {
                    console.log('admin client on connect');
                    done();
                });
                adminClient.on('error', function (err) { throw err; });
                adminClient.auth.connect({ endpointId: 'princess' });
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
                    var joe = new Respoke({
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

        afterEach(function (done) {
            var closedTotal = 0;
            var handler = function (err) {
                if (err) {
                    return done(err);
                }
                closedTotal++;
                if (closedTotal === 2) {
                    done();
                }
            };
            if (client1.connectionId) {
                client1.close(handler);
            }
            else {
                handler();
            }
            if (client2.connectionId) {
                client2.close(handler);
            }
            else {
                handler();
            }
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
            beforeEach(function (done) {
                groupId = 'somegroup-' + uuid.v4();
                var totalJoined = 0;

                var errHandler = function (err) {
                    if (err) {
                        done(err);
                        return;
                    }
                    totalJoined++;
                    if (totalJoined === 2) {
                        done();
                    }
                };

                client1.groups.join({ groupId: groupId }, errHandler);
                client2.groups.join({ groupId: groupId }, errHandler);
            });
            describe('and client 1 listens for presence', function () {
                it('client 1 receives that presence event from client 2', function (done) {
                    // Make sure both members are in the group
                    client1.groups.getSubscribers({ groupId: groupId }, function (err, members) {
                        if (err) {
                            return done(err);
                        }
                        members.should.be.an.Array;
                        var hasClient1 = false;
                        var hasClient2 = false;
                        for (var i = 0; i < members.length; i++) {
                            var memb = members[i];
                            memb.endpointId.should.be.a.String;
                            memb.connectionId.should.be.a.String;
                            if (memb.endpointId === endpointId1) {
                                hasClient1 = true;
                            }
                            if (memb.endpointId === endpointId2) {
                                hasClient2 = true;
                            }
                        }
                        hasClient1.should.be.ok;
                        hasClient2.should.be.ok;

                        client1.presence.observe(endpointId2, function (err) {
                            if (err) {
                                done(err);
                            }
                        });

                        // the test
                        client1.on('presence', function (data) {
                            data.presence.should.equal('At lunch');
                            data.header.type.should.equal('presence');
                            data.header.from.should.equal(endpointId2);
                            data.header.fromConnection.should.be.a.String;
                            data.type.should.equal('available');
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
                        }, 1500);

                    });
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

        // TODO: uncomment when this is fixed in Respoke API
        it.skip('admin sends group message as different endpoint', function (done) {
            var groupId = 'somegroup-' + uuid.v4();
            var totalJoined = 0;
            var msgText = "Hey - " + uuid.v4();

            var errHandler = function (err) {
                if (err) {
                    done(err);
                    return;
                }
                totalJoined++;
                if (totalJoined === 1) {
                    doTest();
                }
            };

            client2.groups.join({ groupId: groupId }, errHandler);

            function doTest() {
                client2.on('pubsub', function (data) {
                    // The core test is that the endpointId is the one we specified
                    data.header.from.should.equal('BATMAN');
                    data.header.from.should.not.equal('__SYSTEM__');
                    data.header.from.should.not.equal(endpointId1);

                    // also important
                    data.header.groupId.should.equal(groupId);
                    data.header.type.should.equal('pubsub');
                    data.message.should.equal(msgText);
                    done();
                });
                adminClient.groups.publish({
                    groupId: groupId,
                    message: msgText,
                    endpointId: 'BATMAN'
                }, function (err) {
                    if (err) {
                        return done(err);
                    }
                });
            }
        });

    });

});
