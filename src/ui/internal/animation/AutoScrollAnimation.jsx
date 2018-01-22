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
import UILoop from './UILoop';
import RunningAverage from './RunningAverage';

const defaultOptions = {
    autoScrollRegionSize: 50,
    minVelocity: 0.5,
    maxVelocity: 2.5,
    verticalScroll: true,
    horizontalScroll: false
};

/**
 * This utility computes "auto-scroll", the behavior where dragging an item toward the end
 * of a scroll view causes the scroll view to begin scrolling toward that direction. You can
 * see this effect in action when dragging items around in the MacOS Finder, for instance.
 */
export default class AutoScrollAnimation extends SignalDispatcher {

    uiLoop = this.link(new UILoop);
    velocity = { x: 0, y: 0 };

    constructor() {
        super();
        this.listenTo(this.uiLoop, 'tick', this.tick);

        this.averageVelocityX = new RunningAverage(5);
        this.averageVelocityY = new RunningAverage(5);
    }

    start(bounds) {
        this.bounds = bounds;
        this.options = defaultOptions;
        this.uiLoop.start();
        this.lastTickTime = Date.now();
    }

    clear() {
        this.velocity = { x: 0, y: 0 };
    }

    setCoords(x, y) {
        if (!this.bounds
            || (!this.options.horizontalScroll && (x < this.bounds.left || x > this.bounds.right))
            || (!this.options.verticalScroll && (y < this.bounds.top || y > this.bounds.bottom))) {
            this.clear();
            return;
        }

        let autoScrollRegionSize = this.options.autoScrollRegionSize;

        let scrollLeft = this.bounds.left + autoScrollRegionSize;
        let scrollRight = this.bounds.right - autoScrollRegionSize;
        let scrollTop = this.bounds.top + autoScrollRegionSize;
        let scrollBottom = this.bounds.bottom - autoScrollRegionSize;
        let autoScrollDistanceX, autoScrollDistanceY;

        if (x < scrollLeft) {
            autoScrollDistanceX = scrollLeft - x;
        }
        else if (x > scrollRight) {
            autoScrollDistanceX = scrollRight - x;
        }
        if (y < scrollTop) {
            autoScrollDistanceY = scrollTop - y;
        }
        else if (y > scrollBottom) {
            autoScrollDistanceY = scrollBottom - y;
        }

        this.velocity = { x: 0, y: 0 };
        if (autoScrollDistanceX) {
            this.velocity.x = Math.min(Math.abs(autoScrollDistanceX), autoScrollRegionSize) / autoScrollRegionSize;
            this.velocity.x *= -Math.sign(autoScrollDistanceX);
        }
        if (autoScrollDistanceY) {
            this.velocity.y = Math.min(Math.abs(autoScrollDistanceY), autoScrollRegionSize) / autoScrollRegionSize;
            this.velocity.y *= -Math.sign(autoScrollDistanceY);
        }
    }

    stop() {
        this.uiLoop.stop();
    }

    tick() {
        let minVelocity = this.options.minVelocity;
        let maxVelocity = this.options.maxVelocity;

        let now = Date.now();
        let tickInterval = now - this.lastTickTime;
        this.lastTickTime = now;

        let autoScrollDeltaX, autoScrollDeltaY;
        let eventData = {};

        if (this.velocity.x !== 0) {
            autoScrollDeltaX = Math.round(Math.max(Math.abs(this.velocity.x) * maxVelocity, minVelocity) * tickInterval);
            autoScrollDeltaX = Math.max(autoScrollDeltaX, minVelocity);
            autoScrollDeltaX *= Math.sign(this.velocity.x);
            eventData.x = autoScrollDeltaX;
            this.averageVelocityX.addItem(this.velocity.x);
        }
        else if (this.averageVelocityX.average) {
            eventData.velocityX = this.averageVelocityX.average;
            this.averageVelocityX.clear();
        }
        if (this.velocity.y !== 0) {
            autoScrollDeltaY = Math.round(Math.max(Math.abs(this.velocity.y) * maxVelocity, minVelocity) * tickInterval);
            autoScrollDeltaY = Math.max(autoScrollDeltaY, minVelocity);
            autoScrollDeltaY *= Math.sign(this.velocity.y);
            eventData.y = autoScrollDeltaY;
            this.averageVelocityY.addItem(this.velocity.y);
        }
        else if (this.averageVelocityY.average) {
            eventData.velocityY = this.averageVelocityY.average;
            this.averageVelocityY.clear();
        }

        this.trigger('update', eventData);
    }

}
