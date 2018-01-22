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
 * Point describes a geometric point in two-dimensional space.
 */
export default class Point {

    constructor() {
        this.left = 0;
        this.top = 0;
    }

    get x() {
        return this.left;
    }

    get y() {
        return this.top;
    }

    set(x, y) {
        if (arguments.length === 2) {
            this.left = x;
            this.top = y;
        }
        else {
            this.left = x.left;
            this.top = x.top;
        }
        return this;
    }

    clone() {
        var point = new Point();
        point.set(this);
        return point;
    }

    scale(t) {
        this.left *= t;
        this.top *= t;
        return this;
    }

    scaleAndMove(other, t) {
        this.left += other.left * t;
        this.top += other.top * t;
        return this;
    }

    length() {
        return Math.sqrt(this.left * this.left + this.top * this.top);
    }

    move(other) {
        this.left += other.left;
        this.top += other.top;
        return this;
    }

    static uniqueId = 0;

    id() {
        if (!this._uniqueId) {
            this._uniqueId = ++Point.uniqueId;
        }
        return this._uniqueId;
    }

    static create(left = 0, top = 0) {
        var point = new Point();
        point.left = left;
        point.top = top;
        return point;
    }

}
