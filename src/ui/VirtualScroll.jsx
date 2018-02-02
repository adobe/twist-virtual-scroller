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

import { ObjectId, ObservableArray } from '@twist/core';
import ScrollContainer from './internal/ScrollContainer';
import RecyclerView from './internal/RecyclerView';
import TouchMapper from './internal/interaction/TouchMapper';

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

    constructor(viewClass) {
        this.viewClass = viewClass;
    }
}

// Private methods/getters
const _contentWidth = Symbol('contentWidth');
const _contentHeight = Symbol('contentHeight');
const _refreshNow = Symbol('refreshNow');
const _updateSticky = Symbol('updateSticky');
const _loadPage = Symbol('loadPage');
const _computeBookmark = Symbol('computeBookmark');
const _preloadLeft = Symbol('preloadLeft');
const _preloadRight = Symbol('preloadRight');
const _preloadTop = Symbol('preloadTop');
const _preloadBottom = Symbol('preloadBottom');
const _setChildNeedsLayout = Symbol('setChildNeedsLayout');

// Private properties
const _childNeedsLayout = Symbol('childNeedsLayout');
const _sourceItem = Symbol('sourceItem');
const _views = Symbol('views');
const _savedLayoutBookmark = Symbol('savedLayoutBookmark');


/**
 * The VirtualScroll component allows you to display long, scrollable lists without sacrificing performance.
 * See the docs for more usage information.
 */
@Component({ events: [ 'log' ] })
export default class VirtualScroll {

    @Attribute margin = 0;
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

    @Attribute allowHtmlDrag = false;
    @Attribute interactionManager;

    // Each type of view has a set of components that we recycle - we store them here:
    [_views] = new ObservableArray;

    constructor() {
        super();

        var children = this.children;
        if (!children) {
            console.warn('You need to provide a layout in JSX children of VirtualScroll.');
            return;
        }

        // The touch mapper is shared by the entire virtual scroll view for all interactions
        // (this includes the scroll bar itself, inside the scroll view)
        this.scope.touchMapper = this.link(new TouchMapper(this.allowHtmlDrag));
        if (this.interactionManager) {
            this.interactionManager._init(this.scope.touchMapper);
        }

        this[_sourceItem] = new VirtualScrollRoot({}).linkToComponent(this);
        this.listenTo(this[_sourceItem], 'setChildNeedsLayout', this[_setChildNeedsLayout]);
    }

    /**
     * Width of the content (virtual view)
     * @private
     */
    get [_contentWidth]() {
        return ((this[_sourceItem] && this[_sourceItem].width) + this.margin) || 0;
    }

    /**
     * Height of the content (virtual view)
     * @private
     */
    get [_contentHeight]() {
        return ((this[_sourceItem] && this[_sourceItem].height) + this.margin) || 0;
    }

    /**
     * This method is called from our VirtualScrollRoot.
     * @private
     */
    [_setChildNeedsLayout]() {
        // Save a bookmark before the layout starts, so that we can replace the scroll position
        // at the same element after the layout is done.
        this[_savedLayoutBookmark] = this[_computeBookmark]();
        this[_childNeedsLayout] = true;
        this.refresh();
    }

    @Task(10000)
    refresh() {
        this[_refreshNow]();
    }

    /**
     * Refresh the layout (e.g. if the dimensions of the view change)
     * @private
     */
    [_refreshNow](force = false, bookmark = null) {
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

        if (this.layoutTracker) {
            bookmark = this.savedBookmark;
            if (!bookmark) {
                // We've just started to drag the size of something in the layout, save the upper
                // most item in the current layout as a bookmark of where we need to be after the new layout is finished.
                // We will update the scroll position, so that this item is still in the same position.
                bookmark = this.savedBookmark = this[_computeBookmark]();
                if (bookmark) {
                    bookmark.item.isBookmark = true;
                }
            }
        }
        else if (this[_savedLayoutBookmark]) {
            bookmark = this[_savedLayoutBookmark];
            this[_savedLayoutBookmark] = null;
        }

        if (this[_loadPage](left, right, top, bottom, width, height, force, bookmark)) {
            // We need to backout now, no sticky update necessary.
            return;
        }
        this[_updateSticky]();
    }

    get [_preloadLeft]() {
        return this.horizontalScroll ? (this.scroll.directionLeft < 0 ? 1 : 0) : null;
    }

    get [_preloadRight]() {
        return this.horizontalScroll ? (this.scroll.directionLeft > 0 ? 1 : 0) : null;
    }

    get [_preloadTop]() {
        return this.verticalScroll ? (this.scroll.directionTop < 0 ? 1 : 0) : null;
    }

    get [_preloadBottom]() {
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
     *
     * @private
     */
    [_loadPage](viewLeft, viewRight, viewTop, viewBottom, width, height, force, bookmark) {
        // Determine the rectangle we'd like to render by quantizing it to a page-like offset, and
        // potentially adding an additional page-size of preload content. If this quantized area
        // is the same as last time, we don't need to do anything else right now.
        var left = lowerNearest(viewLeft, width, this[_preloadLeft]);
        var right = upperNearest(viewRight, width, this[_preloadRight]);
        var top = lowerNearest(viewTop, height, this[_preloadTop]);
        var bottom = upperNearest(viewBottom, height, this[_preloadBottom]);
        if (!force && !this[_childNeedsLayout] && this.left === left && this.right === right
                && this.top === top && this.bottom === bottom) {
            return;
        }

        this.left = left;
        this.right = right;
        this.top = top;
        this.bottom = bottom;

        var sourceItem = this[_sourceItem];
        if (sourceItem) {
            // Tell our root item to layout itself within our current area, then update bookmarks if needed.
            sourceItem.layout(this.margin, this.margin, this.scroll.innerWidth - this.margin, this.scroll.innerHeight - this.margin);

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
                        this[_refreshNow](true, bookmark);
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
            previousPendingItems.forEach((item) => pendingMap[ObjectId.get(item)] = item);
        }

        // Find any items that are pending (i.)
        var items = this.items = [];
        if (sourceItem) {
            // Add an item to be displayed. Calling addItem() indicates that this item should be rendered,
            // and is thus visible or almost visible within the current rectangle (as calculated by each layout).
            // If the item is expandable (i.e. a LazyLoader), adding it for the first time triggers it to start the
            // loader. If the expandable item falls out of view and needs to be recycled, the tracking we do here
            // will allow us to stop the pending request if necessary.
            var addItem = (item) => {
                items.push(item);

                // If this item was pending during the previous layout pass, remove it from this list,
                // which indicates that the item will remain visible and thus can continue pending if it needs to.
                delete pendingMap[ObjectId.get(item)];

                // If expand() returns true, it has begun lazily loading. We'll track this operation until it
                // completes or its view falls out of the viewport.
                if (item.expand()) {
                    pendingItems.push(item);
                    if (!bookmark) {
                        bookmark = this[_computeBookmark]();
                    }
                }

                if (!item.view) {
                    // Ignore items that don't have a corresponding view
                    return;
                }

                // Add the item to the list corresponding to its item type.
                var viewCollection = collections[ObjectId.get(item.view)];
                if (!viewCollection) {
                    // If we discovered a new type of view, create an entry for it
                    this[_views].push(new ViewInfo(item.view));
                    viewCollection = collections[ObjectId.get(item.view)] = [];
                }
                viewCollection.push(item);
            };

            var addStickyContainer = (item) => {
                if (!stickyContainers) {
                    stickyContainers = this.stickyContainers = [];
                }
                stickyContainers.push(item);
            };

            this[_views].forEach(viewInfo => collections[ObjectId.get(viewInfo.viewClass)] = []);
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

        this[_views].forEach(viewInfo => viewInfo.items = collections[ObjectId.get(viewInfo.viewClass)]);

        this[_childNeedsLayout] = false;
    }

    [_computeBookmark]() {
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

    [_updateSticky]() {
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

    /**
     * Get a LayoutComponent instance based on its data. For example, when you create a layout component
     * via `<MyLayoutComponent data={ compData }/>`, then you can obtain its instance from the virtual
     * scroller via `scroller.getLayoutItem(compData)`.
     *
     * @param {Object} dataItem
     * @return {Object} LayoutComponent instance
     */
    getLayoutItem(dataItem) {
        var bookmark = {
            dataItem
        };
        this[_sourceItem].resolveBookmark(bookmark);
        return bookmark.item;
    }

    /**
     * Get all the views of a given layout class (these are the concrete views, not the layout components)
     *
     * @param {class} layoutClass
     * @return {Array.<BaseViewComponent>}
     */
    getViews(layoutClass) {
        let viewClass = layoutClass && layoutClass.view;
        let viewInfo = this[_views].find(viewInfo => viewInfo.viewClass === viewClass);
        return viewInfo ? viewInfo.items : [];
    }

    /**
     * Get the horizontal and vertical proportion of the element that's visible. The element is
     * identified by its data.
     *
     * For example, if the full width of the element is visible, but half it's height is cut off,
     * then this will return `{ horizontal: 1, vertical: 0.5 }`.
     *
     * @param {Object} dataItem
     * @return {Object} Horizontal and vertical proportion of element that's visible
     */
    getElementVisibility(dataItem) {
        const layoutItem = this.getLayoutItem(dataItem);

        if (!layoutItem) {
            return { horizontal: 0, vertical: 0 };
        }

        const virtualRect = {
            left: layoutItem.left,
            right: layoutItem.right,
            top: layoutItem.top,
            bottom: layoutItem.bottom
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

            horizontal = (minRight - maxLeft) / layoutItem.width;
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

            vertical = (minBottom - maxTop) / layoutItem.height;
        }

        return { horizontal, vertical };
    }

    /**
     * Is the given element in the viewport? The item is identified by its data source.
     * By default this only return true if the element is completely visible, but you can
     * adjust the `visibleRatio` if you want to allow partially-visible elements.
     * (e.g. `visibleRatio=0.5` means that at least half the element, by area, is visible)
     *
     * @param {Object} dataItem
     * @param {number} [visibleRatio = 1] Proportion of the element's area that must be visible, to count as being in the viewport
     * @return {Boolean} Whether the element is visible
     */
    isElementInViewport(dataItem, visibleRatio = 1) {
        const { horizontal, vertical } = this.getElementVisibility(dataItem);
        return horizontal * vertical >= visibleRatio;
    }

    /**
     * Scroll to the given virtual element, so that it's visible - the item is identified by its data source.
     *
     * @param {Object} dataItem
     * @param {Boolean} [animate=false]
     * @param {Object} [align]
     * @param {Object} [offset]
     */
    scrollToElement(dataItem, animate = false, align = { vertical: 'top', horizontal: 'left' }, offset = { left: 0, top: 0 }) {
        const layoutItem = this.getLayoutItem(dataItem);

        if (!layoutItem) {
            console.error('Virtual item to scroll was not found', dataItem);
            return false;
        }

        let scrollTop  = layoutItem.top - offset.top;
        let scrollLeft = layoutItem.left - offset.left;

        if (align && align.vertical === 'bottom') {
            scrollTop += layoutItem.height - this.scroll.innerHeight + 2 * offset.top;
        }

        if (align && align.horizontal === 'right') {
            scrollLeft += layoutItem.width - this.scroll.innerWidth + 2 * offset.left;
        }

        this.scrollTo(scrollLeft, scrollTop, animate);
        return true;
    }

    /**
     * Scroll to the given position.
     *
     * @param {number} left
     * @param {number} top
     * @param {Boolean} [animate=false] Whether to animate the scrolling
     */
    scrollTo(left, top, animate = false) {
        if (animate) {
            this.scroll.animateTo(left, top);
        }
        else {
            this.scroll.scrollTo(left, top);
        }
    }

    /**
     * Convert the given (x,y) coordinate on screen (relative to the rectangle that the scroll view occupies),
     * to the virtual coordinate of the content (i.e. taking the scroll offest into account).
     *
     * You can use this to map event coordinates onto virtual items.
     *
     * @param {number} x
     * @param {number} y
     * @return {Object} The virtual coordinates - this includes the view dimensions.
     */
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
        return <ScrollContainer
            { ...this.undeclaredAttributes() }
            ref={ this.scroll }
            animation={ this.animation }
            animationDuration={ this.animationDuration }
            bind:animationEnabled={ this.animationEnabled }
            keyboardEnabled={ this.animationDuration }
            keyboardMove={ this.keyboadMove }
            focusOnAttach={ this.focusOnAttach }
            contentWidth={ this[_contentWidth] }
            contentHeight={ this[_contentHeight] }
            verticalScroll={ this.verticalScroll }
            horizontalScroll={ this.horizontalScroll }
            scrollBarSize={ this.scrollBarSize }
            scrollBarMargin={ this.scrollBarMargin }
            scrollBarPadding={ this.scrollBarPadding }
            onScroll={ this.refresh }
            onLog={ message => this.trigger('log', message) }
            autoScroll={ this.autoScroll }>

            <repeat collection={ this[_views] } as={ viewInfo }>
                <RecyclerView collection={ viewInfo.items } view={ viewInfo.viewClass } />
            </repeat>

        </ScrollContainer>;
    }

}
