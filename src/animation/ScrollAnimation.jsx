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
import Friction from './Friction';
import Animation from './Animation';

class AnimationData {
    @Observable left;
    @Observable top;

    constructor(left, top) {
        this.left = left;
        this.top = top;
    }
}

/**
 * This utility computes the smooth interpolations and animations necessary to render
 * scrolling events with momentum and friction. This is distinct from {@link AutoScrollAnimation},
 * which is related to dragging items within the scroll view.
 */
export default class ScrollAnimation extends SignalDispatcher {

    uiLoop = this.link(new UILoop);
    frictionLeft = new Friction(0.0005);
    frictionTop = new Friction(0.0005);

    constructor() {
        super();
        this.listenTo(this.uiLoop, 'tick', this.tick);
    }

    start(left, top, velocity) {
        this.stop();

        // Multiply by 1000 to change velocity unit from "pixels per ms" to "pixels per seconds".
        if (velocity.left || velocity.top) {
            this.frictionLeft.set(left, velocity.left * 1000);
            this.frictionTop.set(top, velocity.top * 1000);
            this.uiLoop.start();
        }
    }

    scroll(fromLeft, fromTop, toLeft, toTop, scrollInfo = null) {
        this.stop();

        var data = this.animationData = new AnimationData(fromLeft, fromTop);

        this.animation = this.link(new Animation());
        data.finalLeft = data.left = toLeft;
        data.finalTop = data.top = toTop;

        this.animation.on('tick', () => this.trigger('update', data.left, data.top));
        this.animation.on('end', () => this.animationData = null);

        this.animation.commit(scrollInfo ? scrollInfo.duration : 100);
    }

    stop() {
        this.uiLoop.stop();

        var animation = this.animation;
        if (animation) {
            animation.reset();
            this.disposeLink(animation);
            this.animation = null;
        }
    }

    get done() {
        return this.frictionLeft.done() && this.frictionTop.done();
    }

    tick() {
        var left = this.frictionLeft.x();
        var top = this.frictionTop.x();
        if (this.done) {
            this.stop();
        }

        this.trigger('update', left, top);
    }

}
