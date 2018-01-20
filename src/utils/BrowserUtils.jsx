/*
 *  Copyright 2016 Adobe Systems Incorporated. All rights reserved.
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

const propertyNameCache = {};
const vendorPrefixes = [ '', '-webkit-', '-o-', '-ms-', '-moz-' ];

/**
 * Utilities for browser/DOM operations
 */
export default class BrowserUtils {

    /**
     * Add an event listener to the given node, and return a function for removing it
     * (so you can call `this.link(EventListeners.add(...))`).
     */
    static addEventListener(node, name, callback, capture = false) {
        node.addEventListener(name, callback, capture);
        return () => node.removeEventListener(name, callback, capture);
    }

    static setStyle(node, key, value) {
        // This checks for the right vendor prefix to use
        if (!propertyNameCache[key]) {
            let globalStyle = BrowserUtils.globalStyle;
            propertyNameCache[key] = key;
            for (let i = 0; i < vendorPrefixes.length; i++) {
                if (globalStyle.hasOwnProperty(vendorPrefixes[i] + key)) {
                    propertyNameCache[key] = vendorPrefixes[i] + key;
                    break;
                }
            }
        }

        node.style[propertyNameCache[key]] = value;
    }

    @Memoize
    static get globalStyle {
        if (typeof window !== 'undefined') {
            return window.getComputedStyle(document.createElement('div'));
        }
        return {};
    }

    @Memoize
    static get global {
        if (typeof window !== 'undefined') {
            return window;
        }
        if (typeof self !== 'undefined') {
            return self;
        }
        if (typeof global !== 'undefined') {
            return global;
        }
    }

    static getTime() {
        if (BrowserUtils.global.performance && BrowserUtils.global.performance.now) {
            return performance.now();
        }
        if (Date.now) {
            return Date.now();
        }
        return (new Date()).getTime();
    }
}
