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
import { render } from '@twist/react/test-utils';

import { TaskQueue } from '@twist/core';
import PlaceholderItem from '@twist/virtual-scroller/src/layout/internal/PlaceholderItem';

describe('PlaceholderItem', () => {
    it('layout', () => {
        class Data {
            @Observable lazyWidth;
            @Observable lazyHeight;
        }
        let data = new Data;

        let item;
        render(() => <PlaceholderItem ref={item} bind:lazyWidth={ data.lazyWidth } bind:lazyHeight={ data.lazyHeight } />);

        item.lazyWidth = 100;
        item.lazyHeight = 200;
        TaskQueue.run();

        let wasExpanded = false;
        item.on('expand', () => wasExpanded = true);
        item.expand();
        assert.equal(wasExpanded, true);

        let wasStopped = false;
        item.on('stop', () => wasStopped = true);
        item.stopPendingItem();
        assert.equal(wasStopped, true);
    });
});
