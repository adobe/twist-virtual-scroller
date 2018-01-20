/*
 *  Copyright 2016 Adobe Systems Incorporated. All rights reserved.
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

import PaginatedBlockItem from './PaginatedBlockItem';
import PaginatedList from '../utils/PaginatedList';

/**
 * A layout that arranges its children into a grid. Items are placed on a row horizontally
 * with the hMargin spacing to the right of each one. If an item and its hMargin cannot fit
 * on the current row, a new row is created underneath. Each child must provide its own size
 * (e.g. by overriding `updateLayout()` and setting `this.width` and `this.height`).
 */
@VirtualComponent
export default class GridBlockItem extends PaginatedBlockItem {
    @Attribute hMargin;
    @Attribute vMargin;

    constructor() {
        super();
        this.layoutAttributes(() => this.hMargin, () => this.vMargin);
    }

    get margin() {
        // If hMargin and vMargin are the same size, return it
        if (this.hMargin === this.vMargin) {
            return this.hMargin;
        }
        else {
            console.warn('You cannot call this.margin without setting it explicitly.');
            return;
        }
    }

    set margin(margin) {
        this.hMargin = margin;
        this.vMargin = margin;
    }

    updateLayout(width) {
        const list = this.paginatedList = new PaginatedList();

        let top = this.top;
        let left = this.left;

        this.forEach((item) => {

            // If adding a new item horizontally would exceed the total
            // width then we create a new row and start over
            if (left + item.itemWidth + this.hMargin > width) {
                top += item.itemHeight + this.vMargin;
                left = this.left;
            }

            item.parent = this;
            item.layout(left, top, item.itemWidth, item.itemHeight);
            list.add(item, item.top, item.bottom);

            left += item.itemWidth + this.hMargin;
        });

        top += this.itemHeight + this.vMargin;

        this.width = width;
        this.height = Math.max(0, top - this._top);
    }
}
