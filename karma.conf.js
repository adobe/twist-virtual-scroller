/*
 *  Copyright 2017 Adobe Systems Incorporated. All rights reserved.
 *  This file is licensed to you under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License. You may obtain a copy
 *  of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software distributed under
 *  the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 *  OF ANY KIND, either express or implied. See the License for the specific language
 *  governing permissions and limitations under the License.
 *
 */

const ReactTwistPlugin = require('@twist/react-webpack-plugin');
const autoprefixer = require('autoprefixer');
const path = require('path');
const webpack = require('webpack');

const config = new ReactTwistPlugin();

if (process.env.NODE_ENV === 'test') {
    config.addBabelPlugin('istanbul');
}

const isProduction = process.env.NODE_ENV === 'production';

module.exports = function(config) {
    config.set({
        webpack: {
            resolve: {
                extensions: [ '.js', '.jsx' ],
            },
            devtool: 'cheap-module-eval-source-map',
            module: {
                rules: [ {
                    test: /\.less$/,
                    use: [ {
                        loader: 'style-loader'
                    }, {
                        loader: 'css-loader',
                        options: { sourceMap: true, importLoaders: 1 }
                    }, {
                        loader: 'postcss-loader',
                        options: { plugins: [ autoprefixer(config.getOption('targets')) ] }
                    }, {
                        loader: 'less-loader',
                        options: { sourceMap: true }
                    } ]
                } ]
            },
            plugins: [
                config
            ]
        },

        files: [
            'test/IncludeAll.jsx',
            'test/Index.jsx'
        ],

        preprocessors: {
            '**/*.*': [ 'webpack' ],
        },

        reporters: [ 'progress', 'mocha', 'coverage' ],
        frameworks: [ 'mocha' ],
        browsers: [ 'Chrome' ],

        coverageReporter: {
            dir: 'testing/',
            reporters: [
                { type: 'html', subdir: 'coverage' },
                { type: 'text-summary' }
            ],
        },

        plugins: [
            'karma-chrome-launcher',
            'karma-coverage',
            'karma-firefox-launcher',
            'karma-mocha-reporter',
            'karma-mocha',
            'karma-webpack',
        ],

        webpackMiddleware: {
            stats: 'errors-only',
            noInfo: true
        }
    });
};
