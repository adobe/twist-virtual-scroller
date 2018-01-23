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

import { ObjectId } from '@twist/core';
import ScrollContainer from './internal/ScrollContainer';
import RecyclerView from './internal/RecyclerView';

// This is the connector from the "virtual" layout configuration to the "physical" view
import VirtualScrollRoot from '../layout/internal/VirtualScrollRoot';

/**
 * Return the next-lowest offset quantized to `pageSize`, after subtracting `additionalPageCount` pages.
 * @param {number} value An offset; typically the x or y offset of the scroll container.
 * @param {number} pageSize The size of a page; typically the width or height of the scroll container.
 * @param {?number} additionalPageCount The number of pages to preload. If null, return `value` unchanged.
 * @return {number}
 */
function lowerNearest(value, pageSize, additionalPageCount) {
    if (additionalPageCount === null || !pageSize) {
        return value;
    }
    value -= pageSize * additionalPageCount;
    return Math.floor(value / pageSize) * pageSize;
}

/**
 * Return the next-highest offset quantized to `pageSize`, after adding `additionalPageCount` pages.
 * @param {number} value An offset; typically the x or y offset of the scroll container.
 * @param {number} pageSize The size of a page; typically the width or height of the scroll container.
 * @param {?number} additionalPageCount The number of pages to preload. If null, return `value` unchanged.
 * @return {number}
 */
function upperNearest(value, pageSize, additionalPageCount) {
    if (additionalPageCount === null || !pageSize) {
        return value;
    }
    value += pageSize * additionalPageCount;
    return Math.ceil(value / pageSize) * pageSize;
}

class ViewInfo {

    @Observable items;

    constructor(type, viewType) {
        this.type = type;
        this.viewType = viewType;
    }
}

/**
 * The VirtualScroll component allows you to display long, scrollable lists without sacrificing performance.
 * See the docs for more usage information.
 */
@Component({ events: [ 'log' ] })
export default class VirtualScroll {

    @Attribute style;
    @Attribute mapping;
    @Attribute item;
    @Attribute margin = 0;
    @Attribute layoutTracker = false;
    @Attribute focusOnAttach = true;
    @Attribute autoScroll = false;

    @Attribute animation = false;
    @Attribute animationDuration = 100;
    @Attribute keyboardEnabled = true;
    @Attribute keyboardMove = 40;
    @Attribute animationEnabled; // Read-only attribute

    @Attribute scrollBarSize = 7;
    @Attribute scrollBarMargin = 5;
    @Attribute scrollBarPadding = 0;

    @Attribute verticalScroll = false;
    @Attribute horizontalScroll = false;

    @Attribute scrollComponent = ScrollContainer;

    @Attribute allowHtmlDrag = false;

    @Observable contentWidth = 0;
    @Observable contentHeight = 0;

    constructor() {
        super();
        var mapping = this.mapping;
        if (!mapping) {
            console.warn('You need to provide a mapping.');
            return;
        }

        var children = this.children;
        if (!children) {
            console.warn('You need to provide a layout in JSX children of VirtualScroll.');
            return;
        }

        this.sourceItem = new VirtualScrollRoot().linkToComponent(this);
        this.listenTo(this.sourceItem, 'setChildNeedsLayout', this.setChildNeedsLayout);

        this.viewTypeById = {};
        this.viewTypes = [];
        for (let type in mapping) {
            const viewType = mapping[type];
            var viewInfo = new ViewInfo(type, viewType);
            this.viewTypeById[type] = viewInfo;
            this.viewTypes.push(viewInfo);
        }

        this.watch(() => this.layoutTracker, (layoutTracker) => {
            if (!layoutTracker) {
                // Make sure we remove the saved bookmark when the layout tracker goes back to false only.
                if (this.savedBookmark) {
                    this.savedBookmark.item.isBookmark = false;
                }
                this.savedBookmark = null;
            }
        });
    }

    // This method is called from our VirtualScrollRoot.
    setChildNeedsLayout() {
        // Save a bookmark before the layout starts, so that we can replace the scroll position
        // at the same element after the layout is done.
        this.savedLayoutBookmark = this.computeBookmark();
        this.childNeedsLayout = true;
        this.refresh();
    }

    @Task(10000)
    refresh() {
        this.refreshNow();
    }

    refreshNow(force = false, bookmark = null) {
        // The task might execute after the scroll is removed, so prevent that.
        if (!this.scroll) {
            return;
        }

        var width = this.scroll.innerWidth;
        var height = this.scroll.innerHeight;

        var left = this.scroll.displayScrollLeft;
        var right = left + width;

        var top = this.scroll.displayScrollTop;
        var bottom = top + height;

        // console.log(`Preload left: ${this.preloadLeft}, right: ${this.preloadRight}, top: ${this.preloadTop}, bottom: ${this.preloadBottom}`);

        if (this.layoutTracker) {
            bookmark = this.savedBookmark;
            if (!bookmark) {
                // We've just started to drag the size of something in the layout, save the upper
                // most item in the current layout as a bookmark of where we need to be after the new layout is finished.
                // We will update the scroll position, so that this item is still in the same position.
                bookmark = this.savedBookmark = this.computeBookmark();
                if (bookmark) {
                    bookmark.item.isBookmark = true;
                }
            }
        }
        else if (this.savedLayoutBookmark) {
            bookmark = this.savedLayoutBookmark;
            this.savedLayoutBookmark = null;
        }

        if (this.loadPage(left, right, top, bottom, width, height, force, bookmark)) {
            // We need to backout now, no sticky update necessary.
            return;
        }
        this.updateSticky();
    }

    get preloadLeft() {
        return this.horizontalScroll ? (this.scroll.directionLeft < 0 ? 1 : 0) : null;
    }

    get preloadRight() {
        return this.horizontalScroll ? (this.scroll.directionLeft > 0 ? 1 : 0) : null;
    }

    get preloadTop() {
        return this.verticalScroll ? (this.scroll.directionTop < 0 ? 1 : 0) : null;
    }

    get preloadBottom() {
        return this.verticalScroll ? (this.scroll.directionTop > 0 ? 1 : 0) : null;
    }

    /**
     * Load a portion of the viewport corresponding to the current visible area, potentially with an additional
     * content-height or two of additional preload area (dependent on the current scrolling direction).
     * At a high level, this function will:
     *
     * 1. Calculate a rectangle that encompasses the visible area, and possibly additional space for preloading.
     * 2. Call `layout()` on the root item. If needed, layouts reposition and resize their children views.
     * 3. Call `collect()` on the root item. Similarly, layouts recursively call `collect()` on child views;
     *    if a view is within the rectangle we computed, we add it to the list of items to render.
     * 4. Update the observable lists of items for each viewType. This causes the view (i.e. RecyclerView)
     *    to update with new data corresponding to the items it needs to render.
     *
     * @param {number} viewLeft
     * @param {number} viewRight
     * @param {number} viewTop
     * @param {number} viewBottom
     * @param {number} width
     * @param {number} height
     * @param {boolean} force
     * @param {Bookmark} bookmark
     */
    loadPage(viewLeft, viewRight, viewTop, viewBottom, width, height, force, bookmark) {
        // Determine the rectangle we'd like to render by quantizing it to a page-like offset, and
        // potentially adding an additional page-size of preload content. If this quantized area
        // is the same as last time, we don't need to do anything else right now.
        var left = lowerNearest(viewLeft, width, this.preloadLeft);
        var right = upperNearest(viewRight, width, this.preloadRight);
        var top = lowerNearest(viewTop, height, this.preloadTop);
        var bottom = upperNearest(viewBottom, height, this.preloadBottom);
        if (!force && !this.childNeedsLayout && this.left === left && this.right === right
                && this.top === top && this.bottom === bottom) {
            return;
        }

        this.left = left;
        this.right = right;
        this.top = top;
        this.bottom = bottom;

        var margin = this.margin;
        var sourceItem = this.sourceItem;
        if (sourceItem) {
            // Tell our root item to layout itself within our current area, then update bookmarks if needed.
            sourceItem.layout(margin, margin, this.scroll.innerWidth - margin, this.scroll.innerHeight - margin);
            this.contentWidth = sourceItem.width + margin;
            this.contentHeight = sourceItem.height + margin;
            if (!force && bookmark) {
                if (bookmark.dataItem && !bookmark.item) {
                    sourceItem.resolveBookmark(bookmark);
                }

                if (bookmark.item) {
                    let preferredLeft, preferredTop;
                    if (bookmark.center) {
                        preferredLeft = bookmark.item.left - (viewRight - viewLeft - bookmark.item.width) / 2;
                        preferredTop = bookmark.item.top - (viewBottom - viewTop - bookmark.item.height) / 2;
                    }
                    else {
                        preferredLeft = bookmark.item.left - bookmark.left;
                        preferredTop = bookmark.item.top - bookmark.top;
                    }

                    if (this.scroll.scrollTo(preferredLeft, preferredTop, true)) {
                        // We've actually scrolled, so save the bookmark as we will need to do the layout again.
                        this.refreshNow(true, bookmark);
                        return true;
                    }
                }
            }
        }

        var stickyContainers = this.stickyContainers = null;
        var collections = {};
        var pendingItems = [];
        var pendingMap = {};
        var previousPendingItems = this.previousPendingItems;
        if (previousPendingItems) {
            previousPendingItems.forEach((item) => pendingMap[ObjectId(item)] = item);
        }

        // Find any items that are pending (i.)
        var items = this.items = [];
        if (sourceItem) {
            // Add an item to be displayed. Calling addItem() indicates that this item should be rendered,
            // and is thus visible or almost visible within the current rectangle (as calculated by each layout).
            // If the item is expandable (i.e. a LazyItem), adding it for the first time triggers it to start the
            // loader. If the expandable item falls out of view and needs to be recycled, the tracking we do here
            // will allow us to stop the pending request if necessary.
            var addItem = (item) => {
                items.push(item);

                // If this item was pending during the previous layout pass, remove it from this list,
                // which indicates that the item will remain visible and thus can continue pending if it needs to.
                delete pendingMap[ObjectId(item)];

                // If expand() returns true, it has begun lazily loading. We'll track this operation until it
                // completes or its view falls out of the viewport.
                if (item.expand()) {
                    pendingItems.push(item);
                    if (!bookmark) {
                        bookmark = this.computeBookmark();
                    }
                }

                // Add the item to the list corresponding to its item type.
                var viewCollection = collections[item.type];
                if (viewCollection) {
                    viewCollection.push(item);
                }
            };

            var addStickyContainer = (item) => {
                if (!stickyContainers) {
                    stickyContainers = this.stickyContainers = [ ];
                }
                stickyContainers.push(item);
            };

            this.viewTypes.forEach((typeInfo) => collections[typeInfo.type] = [ ]);
            // Start visiting the tree of items, starting at the root. Layouts will look at the items they contain,
            // and compare themselves to this rectangle; items that touch this rectangle should be passed to `addItem`.
            sourceItem.collect({ left, right, top, bottom, addItem, addStickyContainer });
        }
        this.previousPendingItems = pendingItems;
        // Any previously-pending items that are no longer rendered should be stopped, so that they can't
        // expand after they've been recycled.
        for (let key in pendingMap) {
            pendingMap[key].stopPendingItem();
        }

        this.viewTypes.forEach((typeInfo) => typeInfo.items = collections[typeInfo.type]);

        this.childNeedsLayout = false;
    }

    computeBookmark() {
        var bookmark = null;

        var displayScrollLeft = this.scroll.displayScrollLeft;
        var displayScrollTop = this.scroll.displayScrollTop;

        this.items && this.items.forEach((item) => {
            if (item.hasChildren || item.fixed) {
                return;
            }

            var bookmarkLeft = item.left - displayScrollLeft;
            var bookmarkTop = item.top - displayScrollTop;

            if (bookmarkLeft < 0 || bookmarkTop < 0) {
                return;
            }

            // No need to apply the square root in order to compare which one is bigger.
            var bookmarkDistance = bookmarkLeft * bookmarkLeft + bookmarkTop * bookmarkTop;

            if (!bookmark) {
                bookmark = {
                    item,
                    left: bookmarkLeft,
                    top: bookmarkTop,
                    distance: bookmarkDistance
                };
            }
            else if (bookmark.distance > bookmarkDistance) {
                // This item is closer to the scroll position.
                bookmark.item = item;
                bookmark.left = bookmarkLeft;
                bookmark.top = bookmarkTop;
                bookmark.distance = bookmarkDistance;
            }
        });
        return bookmark;
    }

    /**
     * The current scroll position.
     * @type {{left: number, top: number}}
     */
    get scrollPosition() {
        return this.scroll && {
            left: this.scroll.displayScrollLeft,
            top: this.scroll.displayScrollTop
        };
    }

    set scrollPosition(position) {
        var left = (position && position.left) || 0;
        var top = (position && position.top) || 0;
        this.scrollTo(left, top);
    }

    updateSticky() {
        var stickyContainers = this.stickyContainers;
        if (!stickyContainers || !stickyContainers.length) {
            return;
        }

        var left = this.scroll.displayScrollLeft;
        var right = left + this.scroll.innerWidth;

        var top = this.scroll.displayScrollTop;
        var bottom = top + this.scroll.innerHeight;

        var view = { left, right, top, bottom };
        stickyContainers.forEach((container) => container.updateSticky(view));
    }

    getVirtualItem(dataItem) {
        var bookmark = {
            dataItem
        };
        this.sourceItem.resolveBookmark(bookmark);
        return bookmark.item;
    }

    elementVisibility(dataItem) {
        const virtualItem = this.getVirtualItem(dataItem);

        if (!virtualItem) {
            return { horizontal: 0, vertical: 0 };
        }

        const virtualRect = {
            left: virtualItem.left,
            right: virtualItem.right,
            top: virtualItem.top,
            bottom: virtualItem.bottom
        };

        const viewportRect = {
            left: this.scroll.displayScrollLeft,
            right: this.scroll.displayScrollLeft + this.scroll.innerWidth,
            top: this.scroll.displayScrollTop,
            bottom: this.scroll.displayScrollTop + this.scroll.innerHeight,
        };

        let horizontal = 0;
        let vertical = 0;

        // Check if the item completely covers the viewport or is completely inside on the x-axis
        if ((virtualRect.left >= viewportRect.left && virtualRect.right <= viewportRect.right)
        || (virtualRect.left <= viewportRect.left && virtualRect.right >= viewportRect.right)) {
            horizontal = 1;
        }
        // Check if the item is not completely outside on x-axis
        else if (!(virtualRect.right < viewportRect.left || virtualRect.left > viewportRect.right)) {
            const maxLeft = Math.max(virtualRect.left, viewportRect.left);
            const minRight = Math.min(virtualRect.right, viewportRect.right);

            horizontal = (minRight - maxLeft) / virtualItem.width;
        }

        // Check if the item completely covers the viewport or is completely inside on the y-axis
        if ((virtualRect.top >= viewportRect.top && virtualRect.bottom <= viewportRect.bottom)
        || (virtualRect.top <= viewportRect.top && virtualRect.bottom >= viewportRect.bottom)) {
            vertical = 1;
        }
        // Check if the item is not completely outside on y-axis
        else if (!(virtualRect.bottom < viewportRect.top || virtualRect.top > viewportRect.bottom)) {
            const maxTop = Math.max(virtualRect.top, viewportRect.top);
            const minBottom = Math.min(virtualRect.bottom, viewportRect.bottom);

            vertical = (minBottom - maxTop) / virtualItem.height;
        }

        return { horizontal, vertical };
    }

    elementInViewport(dataItem, visibleRatio = 1) {
        const { horizontal, vertical } = this.elementVisibility(dataItem);
        return horizontal >= visibleRatio && vertical >= visibleRatio;
    }

    scrollToElement(dataItem, animate = false, align = { vertical: 'top', horizontal: 'left' }, offset = { left: 0, top: 0 }) {
        const virtualItem = this.getVirtualItem(dataItem);

        if (!virtualItem) {
            console.error('Virtual item to scroll was not found', dataItem);
            return false;
        }

        let scrollTop  = virtualItem.top - offset.top;
        let scrollLeft = virtualItem.left - offset.left;

        if (align && align.vertical === 'bottom') {
            scrollTop += virtualItem.height - this.scroll.innerHeight + 2 * offset.top;
        }

        if (align && align.horizontal === 'right') {
            scrollLeft += virtualItem.width - this.scroll.innerWidth + 2 * offset.left;
        }

        this.scrollTo(scrollLeft, scrollTop, animate);
        return true;
    }

    scrollTo(left, top, animate = false) {
        if (animate) {
            this.scroll.animateTo(left, top);
        }
        else {
            this.scroll.scrollTo(left, top);
        }
    }

    windowCoordsToVirtualCoords(x, y) {
        let virtualX = x + this.scroll.offsetX;
        let virtualY = y + this.scroll.offsetY;
        let viewLeft = -(this.scroll.offsetX - this.scroll.displayScrollLeft);
        let viewTop = -(this.scroll.offsetY - this.scroll.displayScrollTop);
        let result = {
            x: virtualX,
            y: virtualY,
            viewTop,
            viewRight: viewLeft + this.scroll.viewWidth,
            viewBottom: viewTop + this.scroll.viewHeight,
            viewLeft,
            virtualTop: this.scroll.displayScrollTop,
            virtualRight: this.scroll.displayScrollLeft + this.scroll.viewWidth,
            virtualBottom: this.scroll.displayScrollTop + this.scroll.viewHeight,
            virtualLeft: this.scroll.displayScrollLeft
        };
        result.inView = virtualX >= result.virtualLeft
            && virtualX < result.virtualRight
            && virtualY >= result.virtualTop
            && virtualY < result.virtualBottom;
        return result;
    }

    render() {
        return <g>
            <using value={ this.scrollComponent } as={ ScrollComponent }>
                <ScrollComponent
                    { ...this.undeclaredAttributes() }
                    ref={ this.scroll }
                    style={ this.style }
                    animation={ this.animation }
                    animationDuration={ this.animationDuration }
                    bind:animationEnabled={ this.animationEnabled }
                    keyboardEnabled={ this.animationDuration }
                    keyboardMove={ this.keyboadMove }
                    focusOnAttach={ this.focusOnAttach }
                    contentWidth={ this.contentWidth }
                    contentHeight={ this.contentHeight }
                    verticalScroll={ this.verticalScroll }
                    horizontalScroll={ this.horizontalScroll }
                    scrollBarSize={ this.scrollBarSize }
                    scrollBarMargin={ this.scrollBarMargin }
                    scrollBarPadding={ this.scrollBarPadding }
                    onScroll={ () => this.refresh() }
                    onLog={ message => this.trigger('log', message) }
                    autoScroll={ this.autoScroll }
                    allowHtmlDrag={ this.allowHtmlDrag }>

                    <repeat collection={ this.viewTypes } as={ typeInfo }>
                        <RecyclerView collection={ typeInfo.items } view={ typeInfo.viewType } />
                    </repeat>

                </ScrollComponent>
            </using>
        </g>;
    }

}
