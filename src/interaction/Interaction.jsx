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
import TouchMapper from './TouchMapper';

export default class Interaction extends SignalDispatcher {

    @Observable active = false;

    constructor(mapper = TouchMapper.instance) {
        super();
        this.mapper = mapper;
        mapper.pushInteraction(this);
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

    dispose() {
        super.dispose();
        this.mapper.removeInteraction(this);
    }
}
