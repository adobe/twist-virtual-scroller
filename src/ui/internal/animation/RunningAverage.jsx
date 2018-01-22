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
 * This class computes the moving average of the last N values.
 * @see {@link https://en.wikipedia.org/wiki/Moving_average}
 */
export default class RunningAverage {
    constructor(limit) {
        this.items = new Array(limit);
        this.limit = limit;
        this.clear();
    }

    get average() {
        if (this.count > 0) {
            return this.sum / this.count;
        }
    }

    addItem(value) {
        if (this.items[this.index] !== undefined) {
            this.sum -= this.items[this.index];
        }
        this.items[this.index] = value;
        this.sum += value;
        this.index = (this.index + 1) % this.limit;
        this.count = Math.min(this.count + 1, this.limit);
    }

    clear() {
        for (let i = 0, len = this.items.length; i < len; i++) {
            this.items[i] = undefined;
        }
        this.count = 0;
        this.index = 0;
        this.sum = 0;
    }
}
