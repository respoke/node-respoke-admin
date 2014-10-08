exports = module.exports = function (grunt) {
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('jsdoxy');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-http-server');
    grunt.loadNpmTasks('grunt-open');

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
                    './README.md': './docs/respoke.html'
                }
            }
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
        'jsdoxy',
        'http-server:docs',
        'open:docs',
        'watch'
    ]);

    grunt.registerTask('build', [
        'jshint',
        'jsdoxy',
        'copy:build'
    ]);
};
