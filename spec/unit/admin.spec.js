var respoke = require('../../index');
var should = require('should');
var helpers = require('../helpers');
var uuid = require('uuid');

describe('Respoke Public Client', function () {
    describe('.Admin', function () {
        var Admin = respoke.Admin;

        it('authenticates with username and password', function (done) {
            var admin = new Admin({
                username: helpers.auth.username,
                password: helpers.auth.password,
                baseURL: helpers.baseURL
            }, function (err, authCredentials) {
                should.not.exist(err);
                authCredentials.should.be.an.Object;
                authCredentials.token.should.be.a.String;
                admin.adminToken.should.equal(authCredentials.token);
                done();
            });
        });

        it.only('authenticates with appSecret', function (done) {
            var admin = new Admin({
                appSecret: helpers.appSecret,
                baseURL: helpers.baseURL
            }, function (err, authCredentials) {
                should.not.exist(err);
                authCredentials.should.be.an.Object;
                authCredentials.token.should.be.a.String;
                admin.adminToken.should.equal(authCredentials.token);
                done();
            });
        });

        it('fires the callback with an error when given bad credentials', function (done) {
            var admin = new Admin({
                username: "dude",
                password: "wassup",
                baseURL: helpers.baseURL
            }, function (err, authCredentials) {
                err.should.be.an.Error;
                done();
            });
        });

        describe('methods', function (done) {

            var admin;
            before(function (done) {
                admin = new Admin({
                    username: helpers.auth.username,
                    password: helpers.auth.password,
                    baseURL: helpers.baseURL
                }, done);
            });

            it('gets an array of apps', function (done) {
                admin.getAllApps(function (err, allApps) {
                    should.not.exist(err);
                    allApps.should.be.an.Array;
                    done();
                });
            });

            it('gets a single app by id', function (done) {
                admin.getAllApps(function (err, allApps) {
                    var theApp = allApps[0];
                    admin.getApp({ appId: theApp.id }, function (err, singleApp) {
                        should.not.exist(err);
                        singleApp.should.be.an.Object;
                        (JSON.stringify(theApp) === JSON.stringify(theApp)).should.be.ok;
                        done();
                    });
                });
            });

            describe('roles', function () {
                var role;
                var someApp;

                before(function (done) {
                    admin.getAllApps(function (err, allApps) {
                        someApp = allApps[0];
                        done();
                    });
                });
                after(function (done) {
                    admin.removeRole(role.id, done);
                });

                it('lets you create a role', function (done) {
                    var createThis = helpers.role();
                    createThis.appId = someApp.id;
                    createThis.name = "my-role-" + uuid.v4();

                    admin.createRole(createThis, function (err, createdRole) {
                        should.not.exist(err);
                        role = createdRole;
                        role.id.should.be.a.String;
                        role.appId.should.equal(createThis.appId);
                        role.name.should.equal(createThis.name);
                        (JSON.stringify(role.events) === JSON.stringify(createThis.events)).should.be.ok;
                        (JSON.stringify(role.groups) === JSON.stringify(createThis.groups)).should.be.ok;

                        done();
                    });
                });

            });

            describe('endpoint auth', function () {
                var appId;
                var roleId;
                var endpointId = "fishbucket77";

                before(function (done) {
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
                            done();
                        });

                    });
                });
                after(function (done) {
                    admin.removeRole(roleId, done);
                });

                it('lets you authenticate an endpoint', function (done) {
                    admin.authenticateEndpoint({
                        appId: appId,
                        roleId: roleId,
                        endpointId: endpointId,
                        ttl: 10
                    }, function (err, authInfo) {
                        should.not.exist(err);
                        authInfo.tokenId.should.be.a.String;
                        authInfo.appId.should.equal(appId);
                        authInfo.endpointId.should.equal(endpointId);
                        done();
                    });
                });

            });
            

        });

    });
});
