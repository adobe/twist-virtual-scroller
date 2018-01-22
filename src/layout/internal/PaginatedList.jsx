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

// We split the list of items in pages of size 1000.
var PageSize = 1000;

function startPage(value) {
    return Math.floor(value / PageSize);
}

function endPage(value) {
    return Math.ceil(value / PageSize);
}

/**
 * A list that stores an item and its position, and partitions the list to make it more efficient to visit
 * items that fit within a given range. Essentially, this is a performance optimization, reducing the numbers
 * of items that need to be asked "Do I fit within this range?".
 */
export default class PaginatedList {

    constructor() {
        this.pages = { };
        this.offset = 0;
    }

    /**
     * Add an item to the list, indicating that it fits in the range [start, end].
     * @param {*} value
     * @param {number} start
     * @param {number} end
     */
    add(value, start, end) {
        var pages = this.pages;
        var initial = startPage(start);
        for (var i = initial, l = endPage(end); i <= l; ++i) {
            var page = pages[i];
            if (!page) {
                pages[i] = page = [];
            }
            page.push({ initial, value });
        }
    }

    /**
     * For each item that fits within [start, end], call `visitor(value)`.
     * @param {number} start
     * @param {number} end
     * @param {function(item: any)} visitor
     */
    query(start, end, visitor) {
        var offset = this.offset;
        var initial = startPage(start - offset);
        for (var i = initial, l = endPage(end - offset); i <= l; ++i) {
            var page = this.pages[i];
            if (!page) {
                continue;
            }
            for (var j = 0, k = page.length; j < k; ++j) {
                var item = page[j];
                // In order to avoid adding duplicates, we only look for two cases:
                // 1. For the first page, we just add everything.
                // 2. If it's not the first page, we only add the ones that start in the current page,
                //    otherwise the item should have been started from a previous page.

                if (i === initial || item.initial === i) {
                    visitor(item.value);
                }
            }
        }
    }

}
