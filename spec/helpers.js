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

var _ = require('lodash');

var roleTestValues = {
    mediaRelay: false,
    events: {
        subscribe: false,
        unsubscribe: false
    },
    groups: {
        list: true,
        "*": {
            subscribe: true,
            unsubscribe: true,
            create: true,
            destroy: true,
            publish: true,
            getsubscribers: true
        }
    }
};

var TestHelpers = {
    loadConfig: function (config) {
        var defaultTestConfig;
        var envConfig;

        if (_.isEmpty(config)) {
            config = {};
        }

        try {
            defaultTestConfig = require('./config.json');
            _.merge(config, defaultTestConfig);
        } catch (e) {
            console.error('Error parsing test config file: ', e);
        }

        try {
            if (process.env.TEST_CONFIG) {
                envConfig = JSON.parse(process.env.TEST_CONFIG);
                _.merge(config, envConfig);
            }
        } catch (e) {
            console.error('Error parsing TEST_CONFIG environment variable: ', e);
        }

        config.role = _.merge(config.role, roleTestValues);

        return config;
    }
};

exports = module.exports = TestHelpers;
