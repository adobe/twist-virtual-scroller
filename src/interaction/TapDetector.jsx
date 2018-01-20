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

import { SignalDispatcher } from '@twist/core';

var eventNameByTapCount = {
    1: 'singleTap',
    2: 'doubleTap'
};

var nextTapTimeout = null;

export default class TapDetector extends SignalDispatcher {

    deltaBetweenTaps = 200; // milliseconds between taps to consider them part of the same gesture

    constructor() {
        super();
        this.taps = null;
    }

    tap(model, config) {
        if (!this.taps) {
            this.taps = {
                config,
                count: 1,
                model,
                lastTap: Date.now()
            };
        }
        else {
            var time = Date.now(), delta = time - this.taps.lastTap;
            if (delta < this.deltaBetweenTaps) {
                ++this.taps.count;
            }
            else {
                this.taps.count = 1;
                this.taps.model = model;
            }
            this.taps.config = config;
            this.taps.lastTap = time;
        }
        if (nextTapTimeout) {
            clearTimeout(nextTapTimeout);
            nextTapTimeout = null;
        }
        if (this.taps.count === 2) {
            // We dont' support more than 2 taps for now. In some cases like text on iOS,
            // we need to use the current calling stack to open the keyboard, otherwise the focus call will be ignored.
            this.onTapRecognized(model);
            return;
        }
        this.trigger('earlyTap', this.taps.model, this.taps.config);
        nextTapTimeout = setTimeout(this.onTapRecognized, this.deltaBetweenTaps);
    }

    @Bind
    onTapRecognized(model) {
        if (!this.taps) {
            return;
        }
        this.trigger(eventNameByTapCount[this.taps.count], model, this.taps.config, this.taps.model);
        this.taps = null;
    }

}
