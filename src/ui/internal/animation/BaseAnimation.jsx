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

import { ObjectId, SignalDispatcher } from '@twist/core';
import UITimer from './UITimer';

function mapValue(t, a, b) {
    return t * b + (1 - t) * a;
}

export default class BaseAnimation extends SignalDispatcher {

    resetTo = 'end';

    @Observable static activeAnimations = 0;

    @Observable active = false;

    constructor() {
        super();

        this.changesById = {};

        this.timer = this.link(new UITimer());
        this.listenTo(this.timer, 'tick', this._update);
        this.listenTo(this.timer, 'end', this.reset);
    }

    computeChangeKey(object, property) {
        return '_' + ObjectId(object) + ':' + property;
    }

    canAnimate(value) {
        return typeof value === 'number' || (typeof value === 'object' && value.merge !== undefined);
    }

    animate(percent, change) {
        if (typeof change.start === 'number') {
            return mapValue(percent, change.start, change.end);
        }
        return change.start.merge(percent, change.end, change);
    }

    record(object, property, newValue, previousValue, initial) {
        if (!this.canAnimate(newValue) || !this.canAnimate(previousValue)) {
            return;
        }

        var key = this.computeChangeKey(object, property);
        var change = this.changesById[key];
        if (!change) {
            change = this.changesById[key] = {
                object,
                property,
                initial: initial || previousValue,
                start: previousValue,
                end: newValue
            };
        }
        else {
            change.end = newValue;
        }

        return change;
    }

    get hasChanges() {
        return Object.values(this.changesById).some(change => change.start !== change.end);
    }

    commit(duration, curve) {
        if (!this.hasChanges) {
            this.trigger('end');
            return;
        }

        this.curve = curve;

        this.trigger('start');
        Object.values(this.changesById).forEach(change => change.object[change.property] = change.start);

        this._startAnimation(duration);
    }

    revert() {
        var clone = new BaseAnimation();
        clone.resetTo = 'initial';
        Object.values(this.changesById).forEach(change => {
            if (change.isNew) {
                clone.record(change.object, change.property, change.start, change.end, change.initial);
            }
        });
        return clone;
    }

    snapshot() {
        var clone = new BaseAnimation();
        var resetTo = this.resetTo;
        Object.values(this.changesById).forEach(change => {
            clone.record(change.object, change.property, change[resetTo], change.object[change.property], change.initial);
        });
        return clone;
    }

    _startAnimation(duration) {
        ++BaseAnimation.activeAnimations;

        this.active = true;
        this.timer.start(duration);
    }

    _update() {
        var value = this.timer.percent;
        var curve = this.curve;
        if (curve) {
            value = this.curve(value);
        }
        Object.values(this.changesById).forEach(change => change.object[change.property] = this.animate(value, change));
        this.trigger('tick');
    }

    reset(preserveValues = false) {
        if (!this.active) {
            return;
        }

        --BaseAnimation.activeAnimations;

        this.timer.stop();

        this.active = false;

        if (!preserveValues) {
            var resetTo = this.resetTo;
            Object.values(this.changesById).forEach(change => change.object[change.property] = change[resetTo]);
        }

        if (!this.isDisposed) {
            this.trigger('end');
        }
    }

    resetInitials() {
        Object.values(this.changesById).forEach(change => change.initial = change.object[change.property]);
    }

    dispose() {
        super.dispose();
        this.reset();
    }
}
