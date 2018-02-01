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
import TouchMapper from './internal/interaction/TouchMapper';

/**
 * An Interaction lets you manage mouse/touch interactions on the virtual scroller
 * Subclasses should implement methods corresponding to drag events
 *
 * * start() - a drag event starts
 * * update() - a drag event updates
 * * end() - a drag event ends
 * * click() - a click event happens
 */
export default class BaseInteractionManager extends SignalDispatcher {

    @Observable active = false;

    /**
     * Called by the touch mapper to initialize the interaction (so it knows to call it when events happpen)
     * @private
     */
    _init(mapper = TouchMapper.instance) {
        this.mapper = mapper;
        mapper.pushInteraction(this);
        this.link(() => this.mapper.removeInteraction(this));
    }

    get touches() {
        return this.mapper.touchManager.touches;
    }

    get state() {
        return this.mapper.state;
    }

    get eventState() {
        return this.mapper.state.eventState;
    }

    get waitTime() {
        return this.mapper.waitTime;
    }

    wait(milliseconds) {
        this.mapper.wait(milliseconds);
    }
}
