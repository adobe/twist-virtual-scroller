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
import { render } from '../Utils';
import { ObservableArray, TaskQueue } from '@twist/core';
import { VirtualScroll, VerticalListLayout, HorizontalListLayout } from '@twist/virtual-scroller';
import RecyclerView from '../../src/ui/internal/RecyclerView';

@LayoutComponent
class Item {
    static WIDTH = 40;
    static HEIGHT = 20;
    type = 'any';

    updateLayout() {
        this.width = Item.WIDTH;
        this.height = Item.HEIGHT;
    }
}

@ViewComponent
class ItemView {
    render() {
        return this.renderContainer(<g>{this.virtualItem && this.virtualItem.data}</g>);
    }
}

const SCROLL_HEIGHT = 100;

// Test collection of virtual items
const testCollection = new Array(1000).fill(1).map((i, index) => index);

describe('Virtual Scroll', () => {

    afterEach(() => {
        render.dispose();
    });

    it('View hierarchy and visibility sanity checks', () => {
        // Start by making a list with fewer items than can be displayed in the visible area.
        const children = new ObservableArray([ 0, 1, 2 ]);

        const domNode = render.intoBody(() =>
            <VirtualScroll style-test={ 'test' } style-height={ SCROLL_HEIGHT + 'px' } verticalScroll={true} mapping={{ 'any': ItemView }}>
                <VerticalListLayout>
                    <repeat collection={ children } as={item}>
                        <Item data={item} />
                    </repeat>
                </VerticalListLayout>
            </VirtualScroll>
        );

        // Sanity-check the DOM tree.

        const scrollOuterView = domNode.firstElementChild;
        assert.equal(parseInt(scrollOuterView.style.height), SCROLL_HEIGHT);

        TaskQueue.run();

        const scrollOverflowView = scrollOuterView.firstElementChild;
        assert.equal(parseInt(scrollOverflowView.style.height), SCROLL_HEIGHT);

        const scrollInnerView = scrollOverflowView.firstElementChild;
        assert.equal(scrollInnerView.style.transform, 'translate3d(0px, 0px, 0px)');

        // RecyclerView determines how many views will be available for rendering.
        // The first few of them will be visible (rendering each item), and the
        // rest will be hidden until needed.
        let testRecycler;
        render(<RecyclerView ref={testRecycler} />);
        assert.equal(scrollInnerView.children.length, testRecycler.capacity, 'should have children equal to recycler capacity');

        // Each child should be rendered properly. Since we have not performed any scrolling or manipulation,
        // we can reasonably expect the visible DOM elements to be rendered in order. (This invariant no longer
        // holds when the view has been scrolled and views need to be recycled.)
        children.forEach((childText, index) => {
            const virtualItem = scrollInnerView.children[index];
            assert.equal(parseInt(virtualItem.style.height), Item.HEIGHT, 'virtual item should have correct height');
            assert.equal(parseInt(virtualItem.style.width), Item.WIDTH, 'virtual item should have correct width');
            assert.equal(virtualItem.style.visibility, 'visible', 'virtual item should be visible');
            assert.equal(virtualItem.textContent, childText, 'virtual item should have correct text');
        });

        // The rest of the views should be hidden.
        for (let i = children.length; i < testRecycler.capacity; i++) {
            const unusedVirtualItem = scrollInnerView.children[i];
            assert.equal(unusedVirtualItem.style.visibility, 'hidden', 'virtual items outside recycler capacity should be hidden');
        }

        // Now, let's add more items.
        for (let i = children.length; i < 20; i++) {
            children.push(i);
        }
        TaskQueue.run();

        // We should still have the same number of views in the recycler, even though
        // we have more items in our collection.
        assert.equal(scrollInnerView.children.length, testRecycler.capacity, 'should still have children equal to recycler capacity');

        // We've chosen SCROLL_HEIGHT to match to an integer number of items, for simplicity's sake.
        // There's one more item than that, though, because the last item's top touches the bottom of the
        // scroll view (even though it's not technically visible; see `inRange` in `VirtualItem.jsx`).
        const expectedNumberOfVisibleItems = Math.ceil(SCROLL_HEIGHT / Item.HEIGHT) + 1;

        // NOTE: Due to the algorithm used by the recycler, _in general_ we cannot rely on the visible views
        // being ordered before invisible views in the DOM, particularly if scrolling has occurred. Instead,
        // we can count the number of visible views, which should remain constant.
        let visibleViewsCount = 0;
        for (let i = 0; i < scrollInnerView.children.length; i++) {
            const virtualItem = scrollInnerView.children[i];
            if (virtualItem.style.visibility === 'visible') {
                visibleViewsCount++;
            }
        }
        assert.equal(visibleViewsCount, expectedNumberOfVisibleItems, 'should have views equal to expected visible items');
    });

    it('scrollbar track clicks', () => {
        // Start by making a list with fewer items than can be displayed in the visible area.
        const children = new ObservableArray([ ...Array(1000).keys() ]);

        let vs;

        render.intoBody(() =>
            <VirtualScroll ref={vs} style={'height: ' + SCROLL_HEIGHT + 'px'} verticalScroll={true} mapping={{ 'any': ItemView }}>
                <VerticalListLayout>
                    <repeat collection={children} as={item}>
                        <Item data={item} />
                    </repeat>
                </VerticalListLayout>
            </VirtualScroll>
        );
        TaskQueue.run();

        let track = document.body.querySelector('.twist-scrollbar-track');
        let rect = track.getBoundingClientRect();

        function click(clientX, clientY) {
            track.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX, clientY }));
            track.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX, clientY }));
        }

        // Clicking on the bottom of the track should scroll the view all the way to the bottom.
        click(rect.left, rect.bottom);
        vs.scroll.updateScrollNow();
        assert.equal(vs.scroll.displayScrollTop, vs.scroll.contentHeight - vs.scroll.viewHeight);

        // Clicking on the top of the track should scroll the view all the way to the top.
        click(rect.left, rect.top);
        vs.scroll.updateScrollNow();
        assert.equal(vs.scroll.displayScrollTop, 0);
    });

    it('scrollbar thumb dragging', () => {
        // Start by making a list with fewer items than can be displayed in the visible area.
        const children = new ObservableArray([ ...Array(1000).keys() ]);

        let vs;

        render.intoBody(() =>
            <VirtualScroll ref={vs} style={'height: ' + SCROLL_HEIGHT + 'px'} verticalScroll={true} mapping={{ 'any': ItemView }}>
                <VerticalListLayout>
                    <repeat collection={children} as={item}>
                        <Item data={item} />
                    </repeat>
                </VerticalListLayout>
            </VirtualScroll>
        );
        TaskQueue.run();

        let track = document.body.querySelector('.twist-scrollbar-track');
        let trackRect = track.getBoundingClientRect();
        let clientY = trackRect.top;
        let clientX = trackRect.left;

        // Drag to the bottom

        track.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX, clientY }));
        while (clientY < trackRect.bottom) {
            track.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, buttons: 1, clientX, clientY }));
            TaskQueue.run();
            clientY++;
        }
        track.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX, clientY }));

        assert.equal(vs.scroll.displayScrollTop, vs.scroll.contentHeight - vs.scroll.viewHeight);

        // Drag back to the top

        track.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX, clientY }));
        while (clientY > trackRect.top) {
            track.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, buttons: 1, clientX, clientY }));
            TaskQueue.run();
            clientY--;
        }
        track.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX, clientY }));

        assert.equal(vs.scroll.displayScrollTop, 0);
    });

    it('updates viewHeight when `style` attribute changes', () => {
        let model = new (class Model {
            @Observable height = 100;
        });

        let vs;
        @Component
        class VS {
            render() {
                return <VirtualScroll ref={vs} style={'height: ' + model.height + 'px'} verticalScroll={true} mapping={{ 'any': ItemView }}>
                    <VerticalListLayout>
                        <repeat collection={[ 1, 2, 3 ]} as={item}>
                            <Item data={item} />
                        </repeat>
                    </VerticalListLayout>
                </VirtualScroll>;
            }
        }
        render.intoBody(<VS />);
        TaskQueue.run();

        assert.equal(vs.scroll.viewHeight, model.height, 'view height should match initial model height');
        model.height = 200;
        TaskQueue.run();
        assert.equal(vs.scroll.viewHeight, model.height, 'view height should match changed model height');
    });

    it('updates viewHeight when `class` attribute changes', () => {
        let model = new (class Model {
            @Observable className = 'height-100';
        });

        const style = document.createElement('style');
        style.textContent = `
            .height-100 { height: 100px }
            .height-200 { height: 200px }
        `;
        document.getElementsByTagName('head')[0].appendChild(style);

        let vs;
        @Component
        class VS {
            render() {
                return <VirtualScroll ref={vs} class={model.className} verticalScroll={true} mapping={{ 'any': ItemView }}>
                    <VerticalListLayout>
                        <repeat collection={[ 1, 2, 3 ]} as={item}>
                            <Item data={item} />
                        </repeat>
                    </VerticalListLayout>
                </VirtualScroll>;
            }
        }
        render.intoBody(<VS />);
        TaskQueue.run();

        assert.equal(vs.scroll.viewHeight, 100, 'view height should match height from initial class');
        model.className = 'height-200';
        TaskQueue.run();
        assert.equal(vs.scroll.viewHeight, 200, 'view height should match height from updated class');
    });

    it('scrollToElement works in a vertical layout', () => {
        let vs, vItem;

        // Test align top
        render.intoBody(() =>
            <VirtualScroll ref={vs} verticalScroll={true} horizontalScroll={false} style={{ height: 100, width: 100 }} mapping={{ 'any': ItemView }}>
                <VerticalListLayout>
                    <repeat collection={ testCollection} as={item}>
                        <Item data={item} />
                    </repeat>
                </VerticalListLayout>
            </VirtualScroll>
        );

        TaskQueue.run();

        // Get reference to a virtual item.
        vItem = vs.getVirtualItem(20);

        // scroll to 0, 0;
        vs.scrollTo(0, 0);

        // Test align = { vertical: 'top', horizontal: 'left' }
        vs.scrollToElement(vItem.data, false, { vertical: 'top', horizontal: 'left' });
        TaskQueue.run();
        assert.equal(vs.scroll.displayScrollTop, vItem.top);
        vs.scrollTo(0, 0);

        // Test align = { vertical: 'bottom', horizontal: 'right' }
        vs.scrollToElement(vItem.data, false, { vertical: 'bottom', horizontal: 'right' });
        TaskQueue.run();
        assert.equal(vs.scroll.displayScrollTop + vs.scroll.innerHeight, vItem.bottom);
        vs.scrollTo(0, 0);

        // Test align = { vertical: 'top', horizontal: 'left' }, offset = { left: 13, top: 13 }
        vs.scrollToElement(20, false, { vertical: 'top', horizontal: 'left' }, { left: 13, top: 13 });
        TaskQueue.run();
        assert.equal(vs.scroll.displayScrollTop, vItem.top - 13);
        vs.scrollTo(0, 0);

        // Test align = { vertical: 'bottom', horizontal: 'right' }, offset = { left: 13, top: 13 }
        vs.scrollToElement(20, false, { vertical: 'bottom', horizontal: 'right' }, { left: 13, top: 13 });
        TaskQueue.run();
        assert.equal(vs.scroll.displayScrollTop + vs.scroll.innerHeight, vItem.bottom + 13);
        vs.scrollTo(0, 0);
    });

    it('scrollToElement works in a horizontal layout', () => {
        let vs, vItem;

        // Test align left
        render.intoBody(() =>
            <VirtualScroll ref={vs} verticalScroll={false} horizontalScroll={true} style={{ height: 100, width: 100 }} mapping={{ 'any': ItemView }}>
                <HorizontalListLayout>
                    <repeat collection={testCollection} as={item}>
                        <Item data={item} />
                    </repeat>
                </HorizontalListLayout>
            </VirtualScroll>
        );

        TaskQueue.run();

        // Get reference to a virtual item.
        vItem = vs.getVirtualItem(20);

        // scroll to 0, 0;
        vs.scrollTo(0, 0);

        // Test align = { vertical: 'top', horizontal: 'left' }
        vs.scrollToElement(vItem.data, false, { vertical: 'top', horizontal: 'left' });
        TaskQueue.run();
        assert.equal(vs.scroll.displayScrollLeft, vItem.left);
        vs.scrollTo(0, 0);

        // Test align = { vertical: 'bottom', horizontal: 'right' }
        vs.scrollToElement(vItem.data, false, { vertical: 'bottom', horizontal: 'right' });
        TaskQueue.run();
        assert.equal(vs.scroll.displayScrollLeft + vs.scroll.innerWidth, vItem.right);
        vs.scrollTo(0, 0);

        // Test align = { vertical: 'top', horizontal: 'left' }, offset = { left: 13, right: 13 }
        vs.scrollToElement(20, false, { vertical: 'top', horizontal: 'left' }, { left: 13, top: 13 });
        TaskQueue.run();
        assert.equal(vs.scroll.displayScrollLeft, vItem.left - 13);
        vs.scrollTo(0, 0);

        // Test align = { vertical: 'bottom', horizontal: 'right' }, offset = { left: 13, right: 13 }
        vs.scrollToElement(20, false, { vertical: 'bottom', horizontal: 'right' }, { left: 13, top: 13 });
        TaskQueue.run();
        assert.equal(vs.scroll.displayScrollLeft + vs.scroll.innerWidth, vItem.right + 13);
        vs.scrollTo(0, 0);
    });

    it('elementVisibility works in a vertical layout', () => {
        let vs, vItem;

        // Test align top
        render.intoBody(() =>
            <VirtualScroll ref={vs} verticalScroll={true} horizontalScroll={false} style={{ height: 100, width: 100 }} mapping={{ 'any': ItemView }}>
                <VerticalListLayout>
                    <repeat collection={testCollection} as={item}>
                        <Item data={item} />
                    </repeat>
                </VerticalListLayout>
            </VirtualScroll>
        );

        TaskQueue.run();

        // Get reference to a virtual item.
        vItem = vs.getVirtualItem(20);

        vs.scrollTo(0, vItem.top + vItem.height * 0.4);
        TaskQueue.run();
        assert.equal(vs.elementVisibility(vItem.data).vertical, 0.6);

        vs.scrollTo(0, vItem.top - vItem.height);
        TaskQueue.run();
        assert.equal(vs.elementVisibility(vItem.data).vertical, 1);

        vs.scrollTo(0, vItem.top + vItem.height * 2);
        TaskQueue.run();
        assert.equal(vs.elementVisibility(vItem.data).vertical, 0);

        vs.scrollTo(0, vItem.top - vs.scroll.innerHeight + vItem.height * 0.6);
        TaskQueue.run();
        assert.equal(vs.elementVisibility(vItem.data).vertical, 0.6);

        vs.scrollTo(0, vItem.top - vs.scroll.innerHeight);
        TaskQueue.run();
        assert.equal(vs.elementVisibility(vItem.data).vertical, 0);
    });

    it('elementVisibility works in a horizontal layout', () => {
        let vs, vItem;

        // Test align top
        render.intoBody(() =>
            <VirtualScroll ref={vs} verticalScroll={false} horizontalScroll={true} style={{ height: 100, width: 100 }} mapping={{ 'any': ItemView }}>
                <HorizontalListLayout>
                    <repeat collection={testCollection} as={item}>
                        <Item data={item} />
                    </repeat>
                </HorizontalListLayout>
            </VirtualScroll>
        );

        TaskQueue.run();

        // Get reference to a virtual item.
        vItem = vs.getVirtualItem(20);

        vs.scrollTo(vItem.left + vItem.width * 0.4, 0);
        TaskQueue.run();
        assert.equal(vs.elementVisibility(vItem.data).horizontal, 0.6);

        vs.scrollTo(vItem.left - vItem.width, 0);
        TaskQueue.run();
        assert.equal(vs.elementVisibility(vItem.data).horizontal, 1);

        vs.scrollTo(vItem.left + vItem.width * 2, 0);
        TaskQueue.run();
        assert.equal(vs.elementVisibility(vItem.data).horizontal, 0);

        vs.scrollTo(vItem.left - vs.scroll.innerWidth + vItem.width * 0.6, 0);
        TaskQueue.run();
        assert.equal(vs.elementVisibility(vItem.data).horizontal, 0.6);

        vs.scrollTo(vItem.left - vs.scroll.innerWidth, 0);
        TaskQueue.run();
        assert.equal(vs.elementVisibility(vItem.data).horizontal, 0);
    });
});
