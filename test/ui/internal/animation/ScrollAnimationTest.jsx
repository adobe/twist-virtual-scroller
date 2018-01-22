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
import ScrollAnimation from '../../../../src/ui/internal/animation/ScrollAnimation';
import FakeTime from '../../../mocks/FakeTime';

describe('ScrollAnimation', () => {
    it('animates until done', () => {
        let anim = new ScrollAnimation();

        let left, top;
        anim.on('update', (_left, _top) => {
            left = _left;
            top = _top;
        });

        let time = new FakeTime();

        anim.start(0, 0, { left: 5, top: 5 });
        while (!anim.done) {
            time.increment(10);
            anim.tick();
        }

        // Since we're faking time, we should be able to rely on these values,
        // unless we change the default friction. (Then you'll have to update these.)
        assert.equal(Math.floor(left), 657);
        assert.equal(Math.floor(top), 657);

        anim.stop();
    });
});
