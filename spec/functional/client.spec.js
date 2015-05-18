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

        it('authenticates as an admin with username and password', function (done) {
            respoke.auth.admin(config.auth, function (err, body) {
                if (err) {
                    return done(err);
                }
                body.token.should.be.a.String;
                done();
            });
        });

        it('fails admin auth with bad credentials', function (done) {
            respoke.auth.admin({
                username: 'ducksized',
                password: 'sea-monkeys'
            }, function (err, body) {
                err.should.be.an.Error;
                done();
            });
        });

        it('uses App-Secret to obtain a working brokered auth token', function (done) {
            respoke.tokens['App-Secret'] = config.appSecret;
            respoke.auth.endpoint({
                endpointId: 'billy',
                appId: config.appId,
                roleId: config.roleId
            }).then(function (body) {
                body.tokenId.should.be.a.String;

                return body.tokenId;
            }).then(function (tokenId) {
                respoke.auth.sessionToken({
                    tokenId: tokenId
                }).then(function (sessionData) {
                    respoke.tokens['App-Token'].should.be.a.String;
                    respoke.on('connect', function (err, res) {
                        respoke.close(done);
                    });
                    respoke.on('error', done);

                    process.nextTick(function () {
                        respoke.auth.connect({
                            endpointId: 'billy'
                        });
                    });
                }).catch(function (error) {
                    done(error);
                });
            }).catch(function (error) {
                done(error);
            });
        });
    });


    describe('Apps', function (done) {

        beforeEach(function (done) {
            respoke = new Respoke({
                baseURL: config.baseURL
            });
            respoke.auth.admin(config.auth, done);
        });

        it('lets you get an array of apps', function (done) {
            respoke.apps.get(function (err, allApps) {
                should.not.exist(err);
                allApps.should.be.an.Array;
                done();
            });
        });

        it('gets a single app by id', function (done) {
            respoke.apps.get({ appId: config.appId }, function (err, singleApp) {
                should.not.exist(err);
                singleApp.should.be.an.Object;
                singleApp.id.should.equal(config.appId);
                done();
            });
        });

    });

    describe('Roles', function () {

        beforeEach(function (done) {
            respoke = new Respoke({
                baseURL: config.baseURL
            });
            respoke.auth.admin(config.auth, done);
        });


        it('fetches all roles for an app', function (done) {
            respoke.roles.get({ appId: config.appId }, function (err, roles) {
                should.not.exist(err);
                roles.should.be.an.Array;
                done();
            });
        });

        it('creates and removes a role', function (done) {
            var role = config.role;
            role.appId = config.appId;
            role.name = 'test-role-' + uuid.v4();
            respoke.roles.create(role, function (err, createdRole) {
                should.not.exist(err);
                createdRole.should.be.an.Object;
                createdRole.appId.should.equal(role.appId);
                createdRole.id.should.be.a.String;
                respoke.roles.delete({ roleId: createdRole.id }, function (err) {
                    should.not.exist(err);
                    done();
                });
            });
        });

    });

    describe('Messaging and Groups', function () {
        var adminEndpointId = "admin-" + uuid.v4();
        var endpointId1 = "client1-" + uuid.v4();
        var endpointId2 = "client2-" + uuid.v4();
        var adminClient = null;
        var client1 = null;
        var client2 = null;
        var createdClients = 0;

        beforeEach(function (done) {
            createdClients = 0;
            var onConnect = function () {
                createdClients++;
                if (createdClients === 3) {
                    done();
                }
            };
            
            adminClient = new Respoke({
                baseURL: config.baseURL,
                'App-Secret': config.appSecret
            });
            adminClient.auth.connect({ endpointId: adminEndpointId });
            adminClient.on('connect', onConnect);
            adminClient.on('error', done);
            
            
            // do brokered auth for each client

            client1 = new Respoke({
                baseURL: config.baseURL,
                'App-Secret': config.appSecret
            });
            client1.auth.endpoint({
                endpointId: endpointId1,
                appId: config.appId,
                roleId: config.roleId
            }, function (err, body) {
                if (err) {
                    return done(err);
                }

                client1.auth.sessionToken({
                    tokenId: body.tokenId
                }, function (err, sessionData) {
                    if (err) {
                        return done(err);
                    }
                    client1.auth.connect({ endpointId: endpointId1 });
                    client1.on('connect', onConnect);
                    client1.on('error', done);
                });
            });

            client2 = new Respoke({
                baseURL: config.baseURL,
                'App-Secret': config.appSecret
            });
            client2.auth.endpoint({
                endpointId: endpointId2,
                appId: config.appId,
                roleId: config.roleId
            }, function (err, body) {
                if (err) {
                    return done(err);
                }

                client2.auth.sessionToken({
                    tokenId: body.tokenId
                }, function (err, sessionData) {
                    if (err) {
                        return done(err);
                    }
                    client2.auth.connect({ endpointId: endpointId2 });
                    client2.on('connect', onConnect);
                    client2.on('error', done);
                });
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
                createdClients++;
                handler();
            }
            if (client2.connectionId) {
                client2.close(handler);
            }
            else {
                createdClients++;
                handler();
            }
        });

        // client 1 sending a message to client 2
        it('sends and receives messages', function (done) {
            var msgText = "Hey - " + uuid.v4();

            client2.once('message', function (data) {
                data.header.type.should.equal('message');
                data.header.from.should.equal(endpointId1);
                data.body.should.equal(msgText);
                done();
            });

            client1.messages.send({
                to: endpointId2,
                message: msgText
            }, function (err, info) {
                if (err) {
                    done(err);
                    return;
                }
            });
        });

        it('lists groups members and observes presence', function (done) {
            var groupId = 'somegroup-' + uuid.v4();
            var totalJoined = 0;
            var msgText = "Hey - " + uuid.v4();

            var errHandler = function (err) {
                if (err) {
                    done(err);
                    return;
                }
                totalJoined++;
                if (totalJoined === 2) {
                    doTest();
                }
            };

            client1.groups.join({ groupId: groupId }, errHandler);
            client2.groups.join({ groupId: groupId }, errHandler);

            function doTest() {

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

                    // register presence
                    var endpoints = members.map(function (memb) {
                        return memb.endpointId;
                    });
                    var testStatus = 'At lunch';
                    client1.presence.observe(endpoints, function (err) {
                        if (err) {
                            done(err);
                        }
                    });

                    // the test
                    client1.on('presence', function (data) {
                        data.status.should.equal(testStatus);
                        data.header.type.should.equal('presence');
                        data.header.from.should.equal(endpointId2);
                        data.header.fromConnection.should.be.a.String;
                        data.type.should.equal('available');
                        done();
                    });

                    // ensure there was time to subscribe
                    setTimeout(function () {
                        client2.presence.set({ status: testStatus }, function (err) {
                            if (err) {
                                done(err);
                            }
                        });
                    }, 1000);

                });
            }
        });

        it('sends and receives group messages', function (done) {
            var groupId = 'somegroup-' + uuid.v4();
            var totalJoined = 0;
            var msgText = "Hey - " + uuid.v4();

            var errHandler = function (err) {
                if (err) {
                    done(err);
                    return;
                }
                totalJoined++;
                if (totalJoined === 2) {
                    doTest();
                }
            };

            client1.groups.join({ groupId: groupId }, errHandler);
            client2.groups.join({ groupId: groupId }, errHandler);

            function doTest() {
                client2.on('pubsub', function (data) {
                    data.header.from.should.equal(endpointId1);
                    data.header.groupId.should.equal(groupId);
                    data.header.type.should.equal('pubsub');
                    data.message.should.equal(msgText);
                    done();
                });
                client1.groups.publish({
                    groupId: groupId,
                    message: msgText
                }, function (err) {
                    if (err) {
                        return done(err);
                    }
                });
            }
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

        it('gets join and leave events', function (done) {
            var groupId = 'somegroup-' + uuid.v4();
            var totalJoined = 0;
            var msgText = "Hey - " + uuid.v4();
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
