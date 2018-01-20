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

import { Disposable } from '@twist/core';

export default class Timer extends Disposable {
    // The timer was fired successfully.
    @Observable fired = false;

    // The timer is scheduled to run.
    @Observable active = false;

    timer_ = null;

    setTimeout(callback, delay) {
        this.reset();

        this.active = true;
        this.timer_ = setTimeout(() => {
            this.fired = true;
            this.active = false;

            if (callback) {
                callback();
            }
        }, delay);
    }

    reset() {
        this.fired = false;
        this.active = false;

        if (this.timer_) {
            clearTimeout(this.timer_);
            this.timer_ = null;
        }
    }

    dispose() {
        super.dispose();
        this.reset();
    }
}
