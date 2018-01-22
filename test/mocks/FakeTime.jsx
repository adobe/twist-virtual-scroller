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

/**
 * Mock the current time. Call {@link #Dispose} when done to restore the original timing functions.
 */
export default class FakeTime {

    constructor() {
        this.time = 0;
        if (window.performance) {
            this._originalPerformanceNow = window.performance.now;
            window.performance.now = this.get;
        }
        this._originalDateNow = Date.now;
        Date.now = this.get;
    }

    /**
     * Restore the original timing functions.
     */
    dispose() {
        if (this._originalPerformanceNow) {
            window.performance.now = this._originalPerformanceNow;
            this._originalPerformanceNow = null;
        }
        if (this._originalDateNow) {
            Date.now = this._originalDateNow;
            this._originalDateNow = null;
        }
    }

    /**
     * Get the current time. (Same as `Date.now()` and/or `performance.now()`.)
     */
    @Bind
    get() {
        return this.time;
    }

    /**
     * Set the current time.
     * @param {number} time
     */
    set(time) {
        this.time = time;
    }

    /**
     * Increment the current time.
     * @param {number} timeAdd;
     */
    increment(timeAdd) {
        this.time += timeAdd;
    }
}
