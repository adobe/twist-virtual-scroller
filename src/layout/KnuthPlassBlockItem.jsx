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
import KnuthPlass from '../utils/KnuthPlass';

/**
 * A layout that arranges its children like words in a paragraph: from left to right,
 * breaking onto a new line when there isn't enough space at the end of each line.
 *
 * @see {@link https://www.ugrad.cs.ubc.ca/~cs490/2015W2/lectures/Knuth.pdf}
 */
@VirtualComponent
export default class KnuthPlassBlockItem extends PaginatedBlockItem {

    @Attribute size = 120;

    constructor() {
        super();
        this.layoutAttributes(() => this.size);
        this.knuthPlass = new KnuthPlass(this.getItemAspectRatio);
    }

    @Bind
    getItemAspectRatio(item) {
        return this.direction === 'horizontal' ? 1 / item.aspectRatio : item.aspectRatio;
    }

    updateLayout(width, height) {
        var breaks, widths, heights, left, top;

        var knuthPlass = this.knuthPlass;
        var margin = this.margin;
        var size = this.size;
        var previousBreak = -1;

        var minCellSize = size - 50;
        var maxCellSize = size + 50;

        var children = this.children;
        var list = this.paginatedList = new PaginatedList();

        if (this.direction === 'horizontal') {
            left = this.left;

            [ breaks, heights ] = knuthPlass.calculateBreaks(children, height, margin, size);

            for (let i = 0, l = breaks.length; i < l; ++i) {
                let currentBreak = breaks[i];
                let rowHeight = heights[i];
                let rowItems = children.slice(previousBreak + 1, currentBreak + 1);

                let sum = rowItems.reduce((sum, item) => sum + 1 / item.aspectRatio, 0);
                let rowWidth = Math.max(Math.min(Math.round(rowHeight / sum), maxCellSize), minCellSize);
                let cellHeights = knuthPlass.calculateRowLayout(rowItems, rowHeight, height, 0, height, margin, rowWidth);

                top = this.top;

                rowItems.forEach((item, i) => {
                    var cellHeight = cellHeights[i];
                    item.parent = this;
                    item.layout(left, top, rowWidth, cellHeight);
                    list.add(item, item.left, item.right);

                    top += cellHeight + margin;
                });

                left += rowWidth + margin;
                previousBreak = currentBreak;
            }

            this.width = Math.max(0, left - this.left - margin);
            this.height = height;
        }
        else {
            top = this.top;

            [ breaks, widths ] = knuthPlass.calculateBreaks(children, width, margin, size);

            for (let i = 0, l = breaks.length; i < l; ++i) {
                let currentBreak = breaks[i];
                let rowWidth = widths[i];
                let rowItems = children.slice(previousBreak + 1, currentBreak + 1);

                let sum = rowItems.reduce((sum, item) => sum + item.aspectRatio, 0);
                let rowHeight = Math.max(Math.min(Math.round(rowWidth / sum), maxCellSize), minCellSize);
                let cellWidths = knuthPlass.calculateRowLayout(rowItems, rowWidth, width, 0, width, margin, rowHeight);

                left = this.left;

                rowItems.forEach((item, i) => {
                    var cellWidth = cellWidths[i];
                    item.parent = this;
                    item.layout(left, top, cellWidth, rowHeight);
                    list.add(item, item.top, item.bottom);

                    left += cellWidth + margin;
                });

                top += rowHeight + margin;
                previousBreak = currentBreak;
            }

            this.width = width;
            this.height = Math.max(0, top - this.top - margin);
        }

        super.updateLayout(width, height);
    }

}

@Prototype({ direction: 'horizontal' })
export class HKnuthPlassBlockItem extends KnuthPlassBlockItem { }

@Prototype({ direction: 'vertical' })
export class VKnuthPlassBlockItem extends KnuthPlassBlockItem { }
