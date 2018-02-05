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
import RunningAverage from '@twist/virtual-scroller/src/ui/internal/animation/RunningAverage';

describe('RunningAverage', () => {
    it('should perform a correct running average', () => {
        let ra = new RunningAverage(4);
        assert.equal(ra.average, undefined);
        assert.equal(ra.count, 0);

        ra.addItem(1);
        ra.addItem(3);
        assert.equal(ra.average, 2);
        assert.equal(ra.count, 2);

        ra.addItem(0);
        ra.addItem(4);
        assert.equal(ra.average, 2);

        ra.addItem(5);
        ra.addItem(5);
        ra.addItem(5);
        ra.addItem(5);
        assert.equal(ra.average, 5);
        assert.equal(ra.count, 4);

        ra.clear();
        assert.equal(ra.average, undefined);
        assert.equal(ra.count, 0);
    });
});
