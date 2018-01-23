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

import KeyboardBindings from './KeyboardBindings';

var keyMatchers = {
    shift(event) {
        return event.shiftKey;
    },

    alt(event) {
        return event.altKey;
    },

    ctrl(event) {
        return event.ctrlKey;
    },

    meta(event) {
        return event.metaKey;
    },

    '[': 219,
    ']': 221,

    'backspace': 8,
    'delete': 46,
    'page-up': 33,
    'page-down': 34,
    'end': 35,
    'home': 36,
    'left-arrow': 37,
    'up-arrow': 38,
    'right-arrow': 39,
    'down-arrow': 40,

    'plus': 107,
    'minus': 109,

    'equal': 187,
    'dash': 189,
    'space': 32,

    'escape': 27,
    'tab': 9,

    'enter': 13
};

function parseEvent(event) {
    var list = [], addedKeyCode = false;

    for (let name in keyMatchers) {
        const matcher = keyMatchers[name];
        var use = false;
        if (typeof matcher === 'function') {
            use = matcher(event);
        }
        else if (matcher === event.keyCode) {
            addedKeyCode = true;
            use = true;
        }
        if (use) {
            list.push(name);
        }
    }

    if (event.keyCode === 91 || event.keyCode === 93) {
        // Ignore. This is the meta key for left and right.
    }
    else if (!addedKeyCode) {
        list.push(String.fromCharCode(event.keyCode).toLowerCase());
    }

    return list.join('+');
}

function escapeRegExp(string) {
    return string.replace(/[^a-z0-9]/g, '\\$&');
}

function compileEvent(keyStrokes) {
    var strokes = keyStrokes.split(/\s*\+\s*/), matchers = [];

    for (var i = 0; i < strokes.length; ++i) {
        var variants = strokes[i].split(/\s*\|\s*/);
        if (variants.length > 1) {
            matchers.push('(' + variants.map(escapeRegExp).join('|') + ')');
        }
        else {
            matchers.push(escapeRegExp(variants[0]));
        }
    }

    return new RegExp('^' + matchers.join('\\+') + '$');
}

function parseKeys() {
    return Object.keys(KeyboardBindings).map((name) => {
        const keyStrokes = KeyboardBindings[name];
        if (typeof keyStrokes === 'object') {
            return {
                name: keyStrokes.name,
                match: compileEvent(keyStrokes.keys)
            };
        }
        return {
            name,
            match: compileEvent(keyStrokes)
        };
    });
}

export default class KeyboardParser {

    constructor() {
        this.keys = parseKeys();
    }

    matchKeyBinding(event, callback) {
        var parsedEvent = parseEvent(event);
        for (var i = 0; i < this.keys.length; ++i) {
            var key = this.keys[i];
            if (key.match.test(parsedEvent)) {
                callback(key.name);
            }
        }
    }

}
