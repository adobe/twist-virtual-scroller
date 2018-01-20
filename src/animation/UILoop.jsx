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

export default class UILoop extends Disposable {

    @Observable active = false;
    @Observable startedAt = 0;
    @Observable now = 0;

    start() {
        this.startedAt = this.now = BrowserUtils.getTime();
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

    get dt() {
        return this.now - this.startedAt;
    }

    @Bind
    enqueue() {
        TaskQueue.push(this.run);
    }

    @Bind
    run() {
        this.now = BrowserUtils.getTime();

        // If the timer was disabled, do not run this timer anymore.
        if (!this.active) {
            return;
        }

        Signal.trigger(this, 'tick');

        // If we are still active enqueue the next frame.
        if (this.active) {
            // After the queue is finished we queue the next frame. Note that we are only executing during the next frame.
            TaskQueue.after.push(this.enqueue);
        }
        else {
            Signal.trigger(this, 'end');
        }
    }

}
