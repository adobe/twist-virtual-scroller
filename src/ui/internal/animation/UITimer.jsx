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

import { TaskQueue, Disposable, Signal } from '@twist/core';
import BrowserUtils from '../utils/BrowserUtils';

export default class UITimer extends Disposable {

    @Observable active = false;
    @Observable startedAt = 0;
    @Observable stopAt = 0;
    @Observable now = 0;

    start(milliseconds) {
        if (milliseconds < 0) {
            throw new Error('Invalid time interval ' + milliseconds);
        }
        var startedAt = this.startedAt = this.now = BrowserUtils.getTime();
        this.stopAt = startedAt + milliseconds;
        if (!this.active) {
            this.active = true;
            this.enqueue();
        }
    }

    dispose() {
        this.stop();
        super.dispose();
    }

    stop() {
        this.active = false;
    }

    get percent() {
        return (this.now - this.startedAt) / (this.stopAt - this.startedAt);
    }

    @Bind
    enqueue() {
        TaskQueue.push(this.run);
    }

    @Bind
    run() {
        var now = BrowserUtils.getTime();
        var stopAt = this.stopAt;

        // If the timer was disabled or we've already sent the last event, do not run this timer anymore.
        if (!this.active || this.now >= stopAt) {
            return;
        }

        // Make sure we never go over the last stop.
        now = this.now = Math.min(stopAt, now);
        Signal.trigger(this, 'tick');

        // If we are still active enqueue the next frame.
        if (this.active && now < stopAt) {
            // After the queue is finished we queue the next frame. Note that we are only executing during the next frame.
            TaskQueue.after.push(this.enqueue);
        }
        else {
            Signal.trigger(this, 'end');
        }
    }

}
