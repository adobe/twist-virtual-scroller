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

/* global describe it afterEach */

import assert from 'assert';
import { render } from '../../../Utils';
import FakeTime from '../../../mocks/FakeTime';

import { TaskQueue } from '@twist/core';
import { VerticalListLayout, VirtualScroll } from '@twist/virtual-scroller';

describe('AutoScrollAnimation', () => {

    @LayoutComponent
    class Item {
        updateLayout() {
            this.height = 500;
        }
    }

    @ViewComponent
    class ItemView {
        render() {
            return <div {...this.itemAttributes}>{this.virtualItem && this.virtualItem.data}</div>;
        }
    }

    afterEach(() => {
        render.dispose();
    });

    it('autoscroll scrolls down and back up', () => {
        let vs;
        let HEIGHT = 200;

        let domNode = render.intoBody(() =>
            <VirtualScroll ref={vs} mapping={{ item: ItemView }} verticalScroll={true} style={`height: ${HEIGHT}px; width: 200px;`}>
                <VerticalListLayout>
                    <repeat collection={[ 1, 2, 3, 4, 5, 6 ]} as={data}>
                        <Item data={data} />
                    </repeat>
                </VerticalListLayout>
            </VirtualScroll>
        );
        TaskQueue.run();

        let anim = vs.scroll.autoScrollAnimation;
        let bounds = domNode.getBoundingClientRect();

        let time = new FakeTime();

        const ITERATIONS = 40;

        // Move the pointer to near the bottom of the scrollable element (simulating a dragging gesture),
        // which should cause the element to scroll down. Then do the same thing, starting from the top.
        // Since we're using a constant time interval (by shimming Date.now()) and a constant number of
        // iterations, we should end up back at the top when we're done.

        // Scroll down
        assert.equal(vs.scroll.requestedScrollTop, 0);
        anim.start(bounds);
        anim.setCoords(bounds.left, bounds.bottom - 50);
        for (let i = 0; i < ITERATIONS; i++) {
            time.increment(10);
            anim.setCoords(bounds.left, bounds.bottom - 50 + i);
            anim.tick();
            vs.scroll.updateScrollNow();
        }
        anim.stop();
        anim.clear();
        assert(vs.scroll.displayScrollTop > 0, 'scroll position should be > 0');

        // Scroll back up
        anim.start(bounds);
        anim.setCoords(bounds.left, bounds.top + 50);
        for (let i = 0; i < ITERATIONS; i++) {
            time.increment(10);
            anim.setCoords(bounds.left, bounds.top + 50 - i);
            anim.tick();
            vs.scroll.updateScrollNow();
        }
        anim.stop();
        anim.clear();
        assert.equal(vs.scroll.displayScrollTop, 0, 'scroll position should be === 0');
    });

});
