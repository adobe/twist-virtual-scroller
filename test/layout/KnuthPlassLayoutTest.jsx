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
import { VirtualScroll,  VerticalKnuthPlassLayout, HorizontalKnuthPlassLayout } from '@twist/virtual-scroller';

describe('KnuthPlassLayout', () => {
    const HEIGHT = 200;
    const WIDTH = 200;
    const SIZE = 100;
    const ITEMS = [ 100, 50, 200 ];

    afterEach(() => {
        render.dispose();
    });

    let testLayout = (KnuthPlassClass, cb) => {

        @LayoutComponent
        class Item {
            get aspectRatio() {
                return this.data / SIZE;
            }
        }

        @ViewComponent
        class ItemView {
            render() {
                return <div {...this.itemAttributes}>{this.virtualItem && this.virtualItem.data}</div>;
            }
        }

        let domNode = render.intoBody(() =>
            <VirtualScroll mapping={{ item: ItemView }} style={`height: ${HEIGHT}px; width: ${WIDTH}px;`}>
                <using value={KnuthPlassClass} as={LayoutClass}>
                    <LayoutClass size={SIZE}>
                        <repeat collection={ITEMS} as={data}>
                            <Item data={data} />
                        </repeat>
                    </LayoutClass>
                </using>
            </VirtualScroll>
        );
        TaskQueue.run();

        cb(function getItemViewDiv(index) {
            // We use `index + 1` because the 0th element is the VerticalKnuthPlassLayout.
            return domNode.firstElementChild.firstElementChild.firstElementChild.children[index + 1];
        });
    };

    it('vertical layout', () => {
        testLayout(VerticalKnuthPlassLayout, (getItemViewDiv) => {
            assert.equal(getItemViewDiv(0).style.transform, 'translate3d(0px, 0px, 0px)');
            assert.equal(getItemViewDiv(1).style.transform, 'translate3d(150px, 0px, 0px)');
            assert.equal(getItemViewDiv(2).style.transform, 'translate3d(0px, 120px, 0px)');
        });
    });

    it('horizontal layout', () => {
        testLayout(HorizontalKnuthPlassLayout, (getItemViewDiv) => {
            assert.equal(getItemViewDiv(0).style.transform, 'translate3d(0px, 0px, 0px)');
            assert.equal(getItemViewDiv(1).style.transform, 'translate3d(0px, 67px, 0px)');
            assert.equal(getItemViewDiv(2).style.transform, 'translate3d(100px, 0px, 0px)');
        });
    });
});
