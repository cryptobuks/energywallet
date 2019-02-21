/*
Copyright (c) 2016-Present Energyparty and Energywallet Developers
Distributed under the AGPL 3.0 with the OpenSSL exception, see the
accompanying file LICENSE or https://github.com/energyparty/energywallet
*/

module.exports = function (grunt) {

    var buildDir = 'build/';

    var config = {
        pkg: grunt.file.readJSON('package.json'),

        build: {
            options: {
                buildDir: buildDir,
                srcDir: 'src/',
                assetsHome: 'assets/',
                checkDeps: true,
                depsDir: 'vendors/'
            },
            process: {
                files: [
                    {cwd: 'src/', src: 'index.html', dest: buildDir, expand: true},
                    {cwd: 'src/pages/', src: '*.html', dest: buildDir+'pages/', expand: true},
                    {cwd: 'src/locales/en', src: '*.json', dest: buildDir+'locales/en', expand: true}
                ]
            },
            copy: {
                files: [
                    {src: 'src/robots.txt', dest: buildDir+'robots.txt'},
                    {cwd: 'src/assets/', src: '*', dest: buildDir+'assets/', expand: true}
                ]
            }
        },
        transifex: {
            languages: ['fr', 'de', 'ar', 'zh', 'zh_TW', 'it', 'es', 'he']
        }
    }
    
    grunt.initConfig(config);

    grunt.loadTasks('grunt-tasks');

    grunt.registerTask('default', ['build']);
};
