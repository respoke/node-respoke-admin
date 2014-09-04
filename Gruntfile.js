exports = module.exports = function (grunt) {
    grunt.loadNpmTasks('jsdoxy');

    grunt.initConfig({
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
    });
};
