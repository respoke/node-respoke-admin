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

exports = module.exports = function (grunt) {
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('jsdoxy');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-http-server');
    grunt.loadNpmTasks('grunt-open');
    grunt.loadNpmTasks('grunt-gh-pages');

    grunt.initConfig({
        jshint: {
            respoke: ['lib/**/*.js', 'index.js'],
            options: {
                jshintrc: '.jshintrc'
            }
        },
        jsdoxy: {
            options: {
                jsonOutput: 'docs/jsdoxy-output.json',
                outputPrivate: false,
                template: './docs.jade'
            },
            files: {
                src: [
                    'lib/client.js'
                ],
                dest: './docs/'
            }
        },
        copy: {
            build: {
                files: {
                    '.tmp/index.html': './docs/respoke.html'
                }
            }
        },
        'gh-pages': {
            options: {
                base: '.tmp',
                repo: 'https://github.com/respoke/node-respoke-admin.git'
            },
            src: ['**']
        },
        watch: {
            docs: {
                files: ['lib/**/*.js'],
                tasks: ['jsdoxy']
            }
        },
        'http-server': {
            docs: {

                // the server root directory
                root: 'docs',

                port: 8283,

                host: "localhost",

                showDir : true,
                autoIndex: true,

                // server default file extension
                ext: "html",

                // run in parallel with other tasks
                runInBackground: true
            }
        },
        open: {
            docs: {
                path: 'http://localhost:8283/respoke.html'
            }
        }
    });

    grunt.registerTask('docs', [
        'jsdoxy'
    ]);

    grunt.registerTask('docs:serve', [
        'docs',
        'http-server:docs',
        'open:docs',
        'watch'
    ]);

    grunt.registerTask('docs:publish', [
        'jshint',
        'docs',
        'copy',
        'gh-pages'
    ]);
};
