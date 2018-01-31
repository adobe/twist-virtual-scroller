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

/**
 * Classes for the scroll container - we add these programmatically, to avoid a dependency
 * on specific build systems, like webpack.
 */

let classPrefix;
function getClassPrefix() {
    if (!classPrefix) {
        classPrefix = 'vs-' + Math.floor(Math.random() * 0xffffffff).toString(16) + '-';
        const style = document.createElement('style');
        style.textContent = `
            .${classPrefix}outer {
                position: relative;
                transform: translate3d(0, 0, 0);
                outline: none;
            }
            .${classPrefix}outer:active {
                outline: none;
            }
            .${classPrefix}outer.active .${classPrefix}thumb {
                opacity: 1;
                background: rgba(0,0,0,0.8);
            }
            .${classPrefix}outer.active .${classPrefix}track {
                opacity: 1;
            }
            .${classPrefix}scrollbar, .${classPrefix}overflow, .${classPrefix}inner, .${classPrefix}track, .${classPrefix}thumb {
                position: absolute;
                top: 0;
                left: 0;
            }
            .${classPrefix}overflow, .${classPrefix}inner {
                width: 100%;
                height: 100%;
            }
            .${classPrefix}overflow {
                overflow: hidden;
            }
            .${classPrefix}inner {
                overflow: visible;
            }
            .${classPrefix}track, .${classPrefix}thumb {
                border-radius: 5px;
                transition: opacity .2s ease-in-out;
                opacity: 0;
            }
            .${classPrefix}track {
                background: transparent;
            }
            .${classPrefix}thumb {
                background: rgba(0,0,0,0.6);
            }
        `;
        document.getElementsByTagName('head')[0].appendChild(style);
    }
    return classPrefix;
}

export default class ScrollContainerCSS {
    static get outerView() {
        return getClassPrefix() + 'outer';
    }
    static get innerView() {
        return getClassPrefix() + 'inner';
    }
    static get overflowView() {
        return getClassPrefix() + 'overflow';
    }
    static get track() {
        return getClassPrefix() + 'track';
    }
    static get thumb() {
        return getClassPrefix() + 'thumb';
    }
    static get scrollbar() {
        return getClassPrefix() + 'scrollbar';
    }
}
