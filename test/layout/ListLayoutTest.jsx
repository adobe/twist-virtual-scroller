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

import { TaskQueue } from '@twist/core';
import { BaseLayoutComponent, StickyItem, VirtualItemView, VirtualScroll, VerticalListLayout, HorizontalListLayout } from '@twist/virtual-scroller';

describe('BlockItem', () => {
    const SCROLL_AMOUNT = 40;
    const STICKY_WIDTH = 10;
    const STICKY_HEIGHT = 10;
    const ITEMS = [ 100, 50, 200 ];
    const HEIGHT = 200;
    const WIDTH = 200;

    afterEach(() => {
        render.dispose();
    });

    let testLayout = (BlockClass, cb) => {

        class Sticky extends StickyItem {
            updateLayout() {
                this.width = 10;
                this.height = 10;
            }
        }

        class Item extends BaseLayoutComponent {
            updateLayout() {
                this.width = this.data;
                this.height = this.data;
            }
        }

        @Component
        class ItemView extends VirtualItemView {
            render() {
                return <div {...this.itemAttributes}>{this.virtualItem && this.virtualItem.data}</div>;
            }
        }

        let vs;

        let domNode = render.intoBody(() =>
            <VirtualScroll ref={vs} mapping={{ item: ItemView }} verticalScroll={true} horizontalScroll={true}
                style={`height: ${HEIGHT}px; width: ${WIDTH}px;`}>
                <using value={BlockClass} as={LayoutClass}>
                    <LayoutClass>
                        <Sticky stickyWidth={STICKY_WIDTH} stickyHeight={STICKY_HEIGHT}/>
                        <repeat collection={ITEMS} as={data}>
                            <Item data={data} />
                        </repeat>
                    </LayoutClass>
                </using>
            </VirtualScroll>
        );
        TaskQueue.run();

        cb(vs, function getItemViewDiv(index) {
            // We use `index + 1` because the 0th element is the BlockItem.
            return domNode.firstElementChild.firstElementChild.firstElementChild.children[index + 1];
        });
    };

    it('vertical layout', () => {
        testLayout(VerticalListLayout, (vs, getItemViewDiv) => {
            let y = STICKY_HEIGHT;
            ITEMS.forEach((size, index) => {
                assert.equal(getItemViewDiv(index).style.transform, `translate3d(0px, ${y}px, 0px)`);
                assert.equal(getItemViewDiv(index).style.width, size + 'px');
                assert.equal(getItemViewDiv(index).style.height, size + 'px');
                y += size;
            });

            vs.scrollTo(0, SCROLL_AMOUNT);
            TaskQueue.run();

            assert.equal(vs.scroll.contentHeight, y);
            assert.equal(vs.scroll.viewHeight, HEIGHT);
            assert.equal(vs.scroll.displayScrollTop, SCROLL_AMOUNT);
            assert.equal(vs.scroll.element.firstElementChild.firstElementChild.style.transform, 'translate3d(0px, -40px, 0px)');

            // TODO: Check for sticky item
        });
    });

    it('horizontal layout', () => {
        testLayout(HorizontalListLayout, (vs, getItemViewDiv) => {
            let x = STICKY_WIDTH;
            ITEMS.forEach((size, index) => {
                assert.equal(getItemViewDiv(index).style.transform, `translate3d(${x}px, 0px, 0px)`);
                assert.equal(getItemViewDiv(index).style.width, size + 'px');
                assert.equal(getItemViewDiv(index).style.height, size + 'px');
                x += size;
            });

            vs.scrollTo(SCROLL_AMOUNT, 0);
            TaskQueue.run();

            assert.equal(vs.scroll.contentWidth, x);
            assert.equal(vs.scroll.viewWidth, WIDTH);
            assert.equal(vs.scroll.displayScrollLeft, SCROLL_AMOUNT);
            assert.equal(vs.scroll.element.firstElementChild.firstElementChild.style.transform, 'translate3d(-40px, 0px, 0px)');

            // TODO: Check for sticky item
        });
    });
});
