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
import { LazyLoader, VirtualScroll, VerticalListLayout } from '@twist/virtual-scroller';

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

        @ViewComponent
        class ItemView {
            render() {
                return this.renderContainer(this.data);
            }
        }

        @LayoutComponent({ view: ItemView })
        class Item {
            updateLayout() {
                this.width = REAL_WIDTH;
                this.height = REAL_HEIGHT;
            }
        }

        let domNode = render.intoBody(() =>
            <VirtualScroll style={`height: 100px; width: ${REAL_WIDTH}px;`}>
                <VerticalListLayout>
                    <LazyLoader loader={loader} lazyWidth={LAZY_WIDTH} lazyHeight={LAZY_HEIGHT}>
                        <repeat collection={ITEMS} as={data}>
                            <Item data={data} />
                        </repeat>
                    </LazyLoader>
                    <Item data="afterlazy" />
                </VerticalListLayout>
            </VirtualScroll>
        );
        TaskQueue.run();

        function getItemViewDiv(index) {
            return domNode.firstElementChild.firstElementChild.firstElementChild.children[index];
        }

        assert.equal(getItemViewDiv(0).style.transform, `translate3d(0px, ${LAZY_HEIGHT}px, 0px)`);
        assert.equal(getItemViewDiv(0).textContent, 'afterlazy');
        assert.equal(getItemViewDiv(1).style.visibility, 'hidden');
        finishLoading();

        setTimeout(() => {
            TaskQueue.run();

            // Item after lazy block should have its position updated
            assert.equal(getItemViewDiv(0).style.transform, `translate3d(0px, ${REAL_HEIGHT * ITEMS.length}px, 0px)`);
            assert.equal(getItemViewDiv(0).textContent, 'afterlazy');

            // Lazy items should be there
            ITEMS.forEach((item, i) => {
                assert.equal(parseInt(getItemViewDiv(i + 1).style.width), REAL_WIDTH);
                assert.equal(parseInt(getItemViewDiv(i + 1).style.height), REAL_HEIGHT);
                assert.equal(getItemViewDiv(i + 1).textContent, item);
            });
            done();
        });
    });
});
