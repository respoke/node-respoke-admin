'use strict';
var helpers = require('../../helpers.js');
var should = require('should');
var uuid = require('uuid');
var nock = require('nock');
var errors = helpers.errors;

describe('roles', function () {
    var respoke;
    var nocked;

    beforeEach(function () {
        respoke = helpers.createRespoke();
        nocked = nock(helpers.baseDomain);
        nock.disableNetConnect(helpers.baseDomain);
    });
    afterEach(function () {
        nock.cleanAll();
    });

    describe('when getting roles', function () {

        describe('in all scenarios', function () {
            it('requires an appId', function (done) {
                respoke.roles.get({}, function (err) {
                    should.exist(err);
                    err.message.should.match(/appId is required/);
                    done();
                });
            });
        });

        describe('by roleId', function () {
            var params = {
                appId: uuid.v4(),
                roleId: uuid.v4()
            };

            describe('when there is no http error', function () {
                var expectedData = 'booya';

                beforeEach(function () {
                    nocked
                        .get(
                            '/v1/roles/' + params.roleId +
                            '?appId=' + params.appId
                        )
                        .reply(200, expectedData);
                });

                it('returns data to callback', function (done) {
                    respoke.roles.get(params, function (err, data) {
                        should.not.exist(err);
                        should.exist(data);
                        data.should.equal(expectedData);
                        done();
                    });
                });

                it('resolves promise with data', function (done) {
                    respoke.roles.get(params).then(function (data) {
                        should.exist(data);
                        data.should.equal(expectedData);
                        done();
                    });
                });
            });

            describe('when there is an http error', function () {
                beforeEach(function () {
                    nocked
                        .get(
                            '/v1/roles/' + params.roleId +
                            '?appId=' + params.appId
                        )
                        .reply(500);
                });

                it('returns error to callback', function (done) {
                    respoke.roles.get(params, function (err) {
                        should.exist(err);
                        err.should.be.an.instanceof(errors.UnexpectedServerResponseError);
                        done();
                    });
                });

                it('rejects promise with error', function (done) {
                    respoke.roles.get(params).catch(function (err) {
                        should.exist(err);
                        err.should.be.an.instanceof(errors.UnexpectedServerResponseError);
                        done();
                    });
                });
            });
        });

        describe('without roleId', function () {
            var params = {
                appId: uuid.v4()
            };

            describe('when there is no http error', function () {
                var expectedData = 'booya';

                beforeEach(function () {
                    nocked
                        .get('/v1/roles?appId=' + params.appId)
                        .reply(200, expectedData);
                });

                it('returns data to callback', function (done) {
                    respoke.roles.get(params, function (err, data) {
                        should.not.exist(err);
                        should.exist(data);
                        data.should.equal(expectedData);
                        done();
                    });
                });

                it('resolves promise with data', function (done) {
                    respoke.roles.get(params).then(function (data) {
                        should.exist(data);
                        data.should.equal(expectedData);
                        done();
                    });
                });
            });

            describe('when there is an http error', function () {
                beforeEach(function () {
                    nocked
                        .get('/v1/roles?appId=' + params.appId)
                        .reply(500);
                });

                it('returns error to callback', function (done) {
                    respoke.roles.get(params, function (err) {
                        should.exist(err);
                        err.should.be.an.instanceof(errors.UnexpectedServerResponseError);
                        done();
                    });
                });

                it('rejects promise with error', function (done) {
                    respoke.roles.get(params).catch(function (err) {
                        should.exist(err);
                        err.should.be.an.instanceof(errors.UnexpectedServerResponseError);
                        done();
                    });
                });
            });
        });
    });

    describe('create', function () {
        var role = {
            appId: uuid.v4(),
            name: 'foo-bar'
        };

        it('requires an appId', function (done) {
            respoke.roles.create({}, function (err) {
                should.exist(err);
                err.message.should.match(/appId is undefined/);
                done();
            });
        });

        it('requires an name', function (done) {
            respoke.roles.create({
                appId: uuid.v4()
            }, function (err) {
                should.exist(err);
                err.message.should.match(/name is undefined/);
                done();
            });
        });

        describe('when there is no http error', function () {
            var expectedData = 'booya';

            beforeEach(function () {
                nocked
                    .post('/v1/roles')
                    .reply(200, expectedData);
            });

            it('returns data to callback', function (done) {
                respoke.roles.create(role, function (err, data) {
                    should.not.exist(err);
                    should.exist(data);
                    data.should.equal(expectedData);
                    done();
                });
            });

            it('resolves promise with data', function (done) {
                respoke.roles.create(role).then(function (data) {
                    should.exist(data);
                    data.should.equal(expectedData);
                    done();
                });
            });
        });

        describe('when there is an http error', function () {
            beforeEach(function () {
                nocked
                    .post('/v1/roles')
                    .reply(500);
            });

            it('returns error to callback', function (done) {
                respoke.roles.create(role, function (err) {
                    should.exist(err);
                    err.should.be.an.instanceof(errors.UnexpectedServerResponseError);
                    done();
                });
            });

            it('rejects promise with error', function (done) {
                respoke.roles.create(role).catch(function (err) {
                    should.exist(err);
                    err.should.be.an.instanceof(errors.UnexpectedServerResponseError);
                    done();
                });
            });
        });
    });

    describe('delete', function () {
        var params = {
            roleId: uuid.v4()
        };

        it('requires an roleId', function (done) {
            respoke.roles.delete({}, function (err) {
                should.exist(err);
                err.message.should.match(/roleId is undefined/);
                done();
            });
        });

        describe('when there is no http error', function () {
            var expectedData = 'booya';

            beforeEach(function () {
                nocked
                    .delete('/v1/roles/' + params.roleId)
                    .reply(200, expectedData);
            });

            it('returns data to callback', function (done) {
                respoke.roles.delete(params, function (err, data) {
                    should.not.exist(err);
                    should.exist(data);
                    data.should.equal(expectedData);
                    done();
                });
            });

            it('resolves promise with data', function (done) {
                respoke.roles.delete(params).then(function (data) {
                    should.exist(data);
                    data.should.equal(expectedData);
                    done();
                });
            });
        });

        describe('when there is an http error', function () {
            beforeEach(function () {
                nocked
                    .delete('/v1/roles/' + params.roleId)
                    .reply(500);
            });

            it('returns error to callback', function (done) {
                respoke.roles.delete(params, function (err) {
                    should.exist(err);
                    err.should.be.an.instanceof(errors.UnexpectedServerResponseError);
                    done();
                });
            });

            it('rejects promise with error', function (done) {
                respoke.roles.delete(params).catch(function (err) {
                    should.exist(err);
                    err.should.be.an.instanceof(errors.UnexpectedServerResponseError);
                    done();
                });
            });
        });
    });
});
