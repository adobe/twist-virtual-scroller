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
import { TaskQueue } from '@twist/core';
import { render } from '../../Utils';
import { VirtualItem, StickyItem, VirtualItemView, VirtualScroll, VBlockItem } from '@twist/virtual-scroller';

describe('StickyItem', () => {

    afterEach(() => {
        render.dispose();
    });

    it('layout', () => {
        let item = new StickyItem();
        assert.equal(item.sticky, true);

        // With a stickyWidth, don't change the width when updating layout.
        item.stickyWidth = 100;
        item.updateLayout(50, 50);
        assert.equal(item.width, 100);
        assert.equal(item.height, 50);

        // With a stickyHeight, don't change the height when updating layout.
        item.stickyWidth = -1;
        item.stickyHeight = 100;
        item.updateLayout(50, 50);
        assert.equal(item.width, 50);
        assert.equal(item.height, 100);
    });

    class Sticky extends StickyItem {
        updateLayout() {
            this.width = this.stickyWidth;
            this.height = this.stickyHeight;
        }
    }

    class Item extends VirtualItem {
        @Attribute itemHeight;
        updateLayout() {
            this.height = this.itemHeight;
        }
    }

    @Component
    class ItemView extends VirtualItemView {
        render() {
            return <div id={'view-' + (this.virtualItem && this.virtualItem.data)} {...this.itemAttributes}>
                {this.virtualItem && this.virtualItem.data}
            </div>;
        }
    }

    it('sticky behavior: pushing stickies away when scrolling', () => {
        const HEIGHT = 600;
        const WIDTH = 200;
        const STICKY_HEIGHT = 50;
        const ITEM_HEIGHT = STICKY_HEIGHT;
        const STICKY_WIDTH = 200;
        const SECTIONS = [ 'A', 'B', 'C', 'D', 'E' ];
        const ITEMS_IN_SECTIONS = [ '1', '2', '3', '4', '5' ];
        const SECTION_HEIGHT = ITEMS_IN_SECTIONS.length * ITEM_HEIGHT;

        let vs;

        render(
            <VirtualScroll ref={vs} mapping={{ item: ItemView }} vertical-scroll={true} horizontal-scroll={true}
                style={`height: ${HEIGHT}px; width: ${WIDTH}px;`}>
                <VBlockItem>
                    <repeat collection={SECTIONS} as={section}>
                        <Sticky data={section} sticky-width={STICKY_WIDTH} sticky-height={STICKY_HEIGHT}/>
                        <repeat collection={ITEMS_IN_SECTIONS} as={data}>
                            <Item data={data} item-height={ITEM_HEIGHT} />
                        </repeat>
                    </repeat>
                </VBlockItem>
            </VirtualScroll>
        );

        function getView(data) {
            return document.getElementById('view-' + data);
        }

        function getTransformY(element) {
            return /translate3d\((\d+)px, (\d+)px, (\d+)px\)/.exec(element.style.transform)[2];
        }

        function assertStickyOffsetAtScroll(top, section, offset) {
            vs.scrollTo(0, top);
            TaskQueue.run();
            assert.equal(getTransformY(getView(section)), offset);
        }

        // Each section's header should remain at the top while its section is being scrolled through.
        // This gives the appearance of the previous section's "sticky" header being pushed upward.
        assertStickyOffsetAtScroll(0, 'A', 0);
        assertStickyOffsetAtScroll(STICKY_HEIGHT / 2, 'A', STICKY_HEIGHT / 2);
        assertStickyOffsetAtScroll(STICKY_HEIGHT, 'A', STICKY_HEIGHT);
        assertStickyOffsetAtScroll(SECTION_HEIGHT, 'A', SECTION_HEIGHT);
        assertStickyOffsetAtScroll(SECTION_HEIGHT, 'B', SECTION_HEIGHT + STICKY_HEIGHT);
        assertStickyOffsetAtScroll(SECTION_HEIGHT + 1, 'A', SECTION_HEIGHT);
        assertStickyOffsetAtScroll(SECTION_HEIGHT + 1, 'B', SECTION_HEIGHT + STICKY_HEIGHT);
        assertStickyOffsetAtScroll(SECTION_HEIGHT + STICKY_HEIGHT, 'B', SECTION_HEIGHT + STICKY_HEIGHT);
        assertStickyOffsetAtScroll(SECTION_HEIGHT + STICKY_HEIGHT + 1, 'B', SECTION_HEIGHT + STICKY_HEIGHT + 1);
        assertStickyOffsetAtScroll(SECTION_HEIGHT * 2 + STICKY_HEIGHT, 'B', SECTION_HEIGHT * 2 + STICKY_HEIGHT);
        assertStickyOffsetAtScroll(SECTION_HEIGHT * 2 + STICKY_HEIGHT + 1, 'B', SECTION_HEIGHT * 2 + STICKY_HEIGHT);
    });

});
