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
import { BaseLayoutComponent } from '@twist/virtual-scroller';

describe('BaseLayoutComponent', () => {

    it('should have correct layout position', () => {
        let vitem = new BaseLayoutComponent({});
        vitem.left = 50;
        vitem.top = 20;
        vitem.width = 100;
        vitem.height = 200;
        assert.equal(vitem.right, vitem.left + vitem.width);
        assert.equal(vitem.bottom, vitem.top + vitem.height);
        assert.deepEqual(vitem.toJSON(), {
            type: 'item',
            name: 'BaseLayoutComponent',
            left: 50,
            top: 20,
            width: 100,
            height: 200,
            children: []
        });

        assert.equal(vitem.inViewport({ left: 0, right: 100, top: 0, bottom: 100 }), true);
        assert.equal(vitem.inViewport({ left: 200, right: 300, top: 0, bottom: 100 }), false);

        vitem.updatePosition(10, 10);
        assert.equal(vitem.left, 60);
        assert.equal(vitem.top, 30);

        assert.equal(vitem.needsLayout(100, 110), true);
        vitem.updateLayout(100, 110);

        assert.equal(vitem.width, 100);
        assert.equal(vitem.height, 110);
        assert.equal(vitem.needsLayout(100, 110), false);

        vitem.layout(0, 0, 10, 20);
        assert.equal(vitem.left, 0);
        assert.equal(vitem.top, 0);
        assert.equal(vitem.width, 10);
        assert.equal(vitem.height, 20);

        assert.equal(BaseLayoutComponent.type, 'item');
    });
});
