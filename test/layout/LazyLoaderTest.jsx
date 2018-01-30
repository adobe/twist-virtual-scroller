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
import { LazyLoader, VirtualItem, VirtualItemView, VirtualScroll, VBlockItem } from '@twist/virtual-scroller';

describe('LazyLoader', () => {

    afterEach(() => {
        render.dispose();
    });

    it('renders a placeholder-sized item, then the actual item', (done) => {
        const LAZY_WIDTH = 4;
        const LAZY_HEIGHT = 5;
        const REAL_WIDTH = 100;
        const REAL_HEIGHT = 10;
        const ITEMS = [ 1, 2, 3 ];

        let finishLoading;
        function loader() {
            return new Promise(resolve => finishLoading = resolve);
        }

        class Item extends VirtualItem {
            updateLayout() {
                this.width = REAL_WIDTH;
                this.height = REAL_HEIGHT;
            }
        }

        @Component
        class ItemView extends VirtualItemView {
            render() {
                return <div {...this.itemAttributes}>{this.virtualItem && this.virtualItem.data}</div>;
            }
        }

        let domNode = render.intoBody(() =>
            <VirtualScroll mapping={{ item: ItemView }} style={`height: 100px; width: ${REAL_WIDTH}px;`}>
                <VBlockItem>
                    <LazyLoader loader={loader} lazyWidth={LAZY_WIDTH} lazyHeight={LAZY_HEIGHT}>
                        <repeat collection={ITEMS} as={data}>
                            <Item data={data} />
                        </repeat>
                    </LazyLoader>
                </VBlockItem>
            </VirtualScroll>
        );
        TaskQueue.run();

        function getItemViewDiv(index) {
            // We use `index + 1` because the 0th element is the VBlockItem.
            return domNode.firstElementChild.firstElementChild.firstElementChild.children[index + 1];
        }

        assert.equal(parseInt(getItemViewDiv(0).style.width), LAZY_WIDTH);
        assert.equal(parseInt(getItemViewDiv(0).style.height), LAZY_HEIGHT);
        finishLoading();

        setTimeout(() => {
            TaskQueue.run();
            assert.equal(parseInt(getItemViewDiv(0).style.width), REAL_WIDTH);
            assert.equal(parseInt(getItemViewDiv(0).style.height), REAL_HEIGHT);
            assert.equal(getItemViewDiv(0).textContent, ITEMS[0]);
            done();
        });
    });
});
