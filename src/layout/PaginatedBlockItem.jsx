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

import ParentItem from './ParentItem';

/**
 * A base class for {@link BlockItem} and {@link KnuthPlassBlockItem} that manages the implementation details of
 * its {@link PaginatedList} (used to optimize the collection process).
 */
@VirtualComponent
export default class PaginatedBlockItem extends ParentItem {

    @Attribute margin = 0;

    constructor() {
        super();
        this.layoutAttributes(() => this.margin);
    }

    needsLayout(width, height) {
        return this.childNeedsLayout || (this.direction === 'horizontal' ? this.height !== height : this.width !== width);
    }

    updatePosition(deltaLeft, deltaTop) {
        super.updatePosition(deltaLeft, deltaTop);
        var paginatedList = this.paginatedList;
        if (paginatedList) {
            paginatedList.offset += this.direction === 'horizontal' ? deltaLeft : deltaTop;
        }
    }

    collect(collector) {
        var paginatedList = this.paginatedList;
        if (!paginatedList) {
            return false;
        }

        if (!this.inViewport(collector)) {
            return false;
        }

        collector.addItem(this);

        var start, end;
        if (this.direction === 'horizontal') {
            start = collector.left;
            end = collector.right;
        }
        else {
            start = collector.top;
            end = collector.bottom;
        }

        paginatedList.query(start, end, (item) => item.collect(collector));
        return true;
    }

}
