// https://github.com/iamralpht/iamralpht.github.io/blob/3ec575051dbc49c886bdf41bc7dd11fcbe663b1e/physics/friction.js
/*
 *  Copyright 2014 Adobe Systems Incorporated. All rights reserved.
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

import BrowserUtils from '../utils/BrowserUtils';

/***
 * Friction physics simulation. Friction is actually just a simple
 * power curve; the only trick is taking the natural log of the
 * initial drag so that we can express the answer in terms of time.
 */

export default class Friction {

    constructor(drag) {
        this._drag = drag;
        this._dragLog = Math.log(drag);
        this._x = 0;
        this._v = 0;
        this._startTime = 0;
    }

    set(x, v) {
        this._x = x;
        this._v = v;
        this._startTime = BrowserUtils.getTime();
    }

    x(t = BrowserUtils.getTime()) {
        var dt = t - this._startTime;
        return this._x + this._v * Math.pow(this._drag, dt / 1000) / this._dragLog - this._v / this._dragLog;
    }

    dx(t = BrowserUtils.getTime()) {
        var dt = t - this._startTime;
        return this._v * Math.pow(this._drag, dt / 1000);
    }

    done(t = BrowserUtils.getTime()) {
        return Math.abs(this.dx(t)) < 1;
    }

    reconfigure(drag) {
        var x = this.x();
        var v = this.dx();
        this._drag = drag;
        this._dragLog = Math.log(drag);
        this.set(x, v);
    }

}
