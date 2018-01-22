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

/* global describe it */

import assert from 'assert';
import FakeTime from './FakeTime';

describe('FakeTime', () => {
    it('fakes the time', () => {
        let originalDateTime = Date.now();
        let originalPerformanceTime = performance.now();

        let t = new FakeTime();
        assert.equal(Date.now(), 0);

        t.set(10);
        assert.equal(Date.now(), 10);
        assert.equal(performance.now(), 10);

        t.increment(1);
        assert.equal(Date.now(), 11);
        assert.equal(performance.now(), 11);

        t.dispose();
        assert(Date.now() >= originalDateTime);
        assert(performance.now() >= originalPerformanceTime);
    });

});
