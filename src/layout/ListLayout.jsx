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

import ContiguousLayout from './ContiguousLayout';
import PaginatedList from './internal/PaginatedList';

/**
 * A layout that arranges its children into a simple list, either vertically or horizontally.
 * Each child must provide its own size (e.g. by overriding `updateLayout()` and setting
 * `this.width` and `this.height`). It may also contain "sticky" items, which act like section
 * headings and "hook" themselves to the top of the view when they reach the top.
 */
@VirtualComponent
class ListLayout extends ContiguousLayout {

    updateLayout(width, height) {
        var margin = this.margin, start, left, top;

        var list = this.paginatedList = new PaginatedList();
        var stickyList = this.stickyList = new PaginatedList();
        var pendingSticky = null;

        if (this.direction === 'horizontal') {
            top = this.top;
            start = this.left;
            this.children.forEach((item) => {
                item.parent = this;

                item.layout(start, top, width, height);
                start += item.width + margin;

                if (item.sticky) {
                    if (pendingSticky) {
                        stickyList.add(pendingSticky, pendingSticky.left, item.left);
                    }
                    pendingSticky = item;
                }
                else {
                    list.add(item, item.left, item.left + item.width);
                }
            });

            this.width = Math.max(0, start - this.left - margin);
            this.height = height;

            if (pendingSticky) {
                stickyList.add(pendingSticky, pendingSticky.left, this.left + this.width);
            }
        }
        else {
            left = this.left;
            start = this.top;
            this.children.forEach((item) => {
                item.parent = this;

                item.layout(left, start, width, height);
                start += item.height + margin;

                if (item.sticky) {
                    if (pendingSticky) {
                        stickyList.add(pendingSticky, pendingSticky.top, item.top);
                    }
                    pendingSticky = item;
                }
                else {
                    list.add(item, item.top, item.top + item.height);
                }
            });

            this.width = width;
            this.height = Math.max(0, start - this.top - margin);

            if (pendingSticky) {
                stickyList.add(pendingSticky, pendingSticky.top, this.top + this.height);
            }
        }

        super.updateLayout(width, height);
    }

    updatePosition(deltaLeft, deltaTop) {
        super.updatePosition(deltaLeft, deltaTop);
        var stickyList = this.stickyList;
        if (stickyList) {
            stickyList.offset += this.direction === 'horizontal' ? deltaLeft : deltaTop;
        }
    }

    collect(collector) {
        if (!super.collect(collector)) {
            return false;
        }

        var stickyList = this.stickyList;
        if (!stickyList) {
            return true;
        }

        var start, end;
        if (this.direction === 'horizontal') {
            start = collector.left;
            end = collector.right;
        }
        else {
            start = collector.top;
            end = collector.bottom;
        }

        var visibleSticky = this.visibleSticky = [];

        stickyList.query(start, end, (item) => {
            collector.addItem(item);
            visibleSticky.push(item);
        });

        if (visibleSticky.length) {
            collector.addStickyContainer(this);
        }


        return true;
    }

    updateSticky(view) {
        var visibleSticky = this.visibleSticky;
        if (!visibleSticky) {
            return;
        }

        var stickyLeft, stickyTop, item, fixed, stickyRight, stickyBottom;

        var i = visibleSticky.length - 1;
        var margin = this.margin;

        if (this.direction === 'horizontal') {
            stickyTop = this.top;

            stickyLeft = Math.max(view.left, this.left);
            stickyRight = Math.min(view.right, this.right);

            for (; i >= 0; --i) {
                item = visibleSticky[i];
                fixed = item.fixed = item.left < stickyLeft;
                if (fixed) {
                    item.fixedLeft = Math.min(stickyRight - item.width, stickyLeft);
                    item.fixedTop = stickyTop;
                    stickyLeft -= item.width;
                }

                // Make sure we never overlap.
                stickyRight = Math.min(stickyRight, item.left - margin);
            }
        }
        else {
            stickyLeft = this.left;

            stickyTop = Math.max(view.top, this.top);
            stickyBottom = Math.min(view.bottom, this.bottom);

            for (; i >= 0; --i) {
                item = visibleSticky[i];
                fixed = item.fixed = item.top < stickyTop;
                if (fixed) {
                    item.fixedLeft = stickyLeft;
                    item.fixedTop = Math.min(stickyBottom - item.height, stickyTop);
                    stickyTop -= item.height;
                }

                // Make sure we never overlap.
                stickyBottom = Math.min(stickyBottom, item.top - margin);
            }
        }
    }

}

@Prototype({ direction: 'horizontal' })
@VirtualComponent
export class HorizontalListLayout extends ListLayout { }

@Prototype({ direction: 'vertical' })
@VirtualComponent
export class VerticalListLayout extends ListLayout { }
