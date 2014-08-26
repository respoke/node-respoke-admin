var respoke = require('../../index');
var should = require('should');
var helpers = require('../helpers');
var uuid = require('uuid');

var Client = respoke.Client;

describe('respoke.Client', function () {
    this.timeout(10000);

    describe('brokered auth connection', function () {
        var admin;
        var appId;
        var roleId;
        var endpointId = "meatpie32";
        var tokenId;

        before(function (done) {
            var Admin = respoke.Admin;
            admin = new Admin({
                username: helpers.auth.username,
                password: helpers.auth.password,
                baseURL: helpers.baseURL
            }, function (err, authCredentials) {
                if (err) {
                    return done(err);
                }

                admin.getAllApps(function (err, allApps) {
                    if (err) {
                        return done(err);
                    }
                    appId = allApps[0].id;
                    var createThis = helpers.role();
                    createThis.appId = appId;
                    createThis.name = "my-role-" + uuid.v4();
                    admin.createRole(createThis, function (err, createdRole) {
                        if (err) {
                            return done(err);
                        }
                        roleId = createdRole.id;
                        admin.authenticateEndpoint({
                            appId: appId,
                            roleId: roleId,
                            endpointId: endpointId,
                            ttl: 200
                        }, function (err, authInfo) {
                            if (err) {
                                return done(err);
                            }
                            tokenId = authInfo.tokenId;
                            done();
                        });
                    });

                });

            });
            
        });
        after(function (done) {
            if (admin) {
                admin.removeRole(roleId, done);
            }
        });

        it('works', function (done) {
            var opts = {
                appId: helpers.appId,
                endpointId: "me-" + uuid.v4(),
                token: tokenId,
                baseURL: helpers.baseURL
            };

            var client = new Client(opts);
            client.on('connect', function () {
                client.close(function (err) {
                    if (err) {
                        return done(err);
                    }
                    done();
                });
            });
            client.on('error', function (err) {
                done(err);
            });
        });
    });

    it('connects in developmentMode', function (done) {
        var client = new Client({
            appId: helpers.appId,
            endpointId: "me-" + uuid.v4(),
            developmentMode: true,
            baseURL: helpers.baseURL
        });
        client.on('connect', function () {
            client.close(function (err) {
                if (err) {
                    return done(err);
                }
                done();
            });
        });
        client.on('error', function (err) {
            done(err);
        });
    });

    describe('messages and groups', function () {
        var endpointId1 = "client1-" + uuid.v4();
        var endpointId2 = "client2-" + uuid.v4();
        var client1 = null;
        var client2 = null;
        var createdClients = 0;

        beforeEach(function (done) {
            createdClients = 0;

            client1 = new Client({
                appId: helpers.appId,
                endpointId: endpointId1,
                developmentMode: true,
                baseURL: helpers.baseURL
            });
            client1.on('connect', function (data) {
                createdClients++;
                if (createdClients === 2) {
                    done();
                }
            });
            client1.on('error', function (err) {
                done(err);
            });
            client2 = new Client({
                appId: helpers.appId,
                endpointId: endpointId2,
                developmentMode: true,
                baseURL: helpers.baseURL
            });
            client2.on('connect', function (data) {
                createdClients++;
                if (createdClients === 2) {
                    done();
                }
            });
            client2.on('error', function (err) {
                done(err);
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
            if (client1.isConnected()) {
                client1.close(handler);
            } 
            else {
                createdClients++;
                handler();
            }
            if (client2.isConnected()) {
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

            client2.on('message', function (data) {
                data.header.type.should.equal('message');
                data.header.from.should.equal(endpointId1);
                data.body.should.equal(msgText);
                done();
            });

            client1.sendMessage({ endpointId: endpointId2, message: msgText }, function (err) {
                if (err) {
                    return done(err);
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

            client1.join({ groupId: groupId }, errHandler);
            client2.join({ groupId: groupId }, errHandler);

            function doTest() {

                // Make sure both members are in the group
                client1.getGroupMembers({ groupId: groupId }, function (err, members) {
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
                    client1.registerPresence(endpoints, function (err) {
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
                        client2.setPresence({ status: testStatus }, function (err) {
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

            client1.join({ groupId: groupId }, errHandler);
            client2.join({ groupId: groupId }, errHandler);

            function doTest() {
                client2.on('pubsub', function (data) {
                    data.header.from.should.equal(endpointId1);
                    data.header.groupId.should.equal(groupId);
                    data.header.type.should.equal('pubsub');
                    data.message.should.equal(msgText);
                    done();
                });
                client1.sendGroupMessage({
                    groupId: groupId,
                    message: msgText
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

            client1.join({ groupId: groupId }, function (err) {
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

                    client2.join({ groupId: groupId }, function (err) {
                        if (err) {
                            return done(err);
                        }
                        setTimeout(function () {
                            client2.leave({ groupId: groupId }, function (err) {
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
