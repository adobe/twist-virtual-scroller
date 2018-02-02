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

export function inRange(value, left, right) {
    return value >= left && value <= right;
}

/**
 * The base class of the "model representation of an item" within a VirtualScroll view.
 * This class stores an item's position information and data: a model of the view, but
 * not the actual view itself. An actual view (which would extend {@link BaseViewComponent}
 * - you can use the `@ViewComponent` decorator for this) would be recycled and reused as the
 * VirtualScroll view scrolls.
 */
@VirtualComponent
export default class BaseLayoutComponent {

    @Observable left = 0;
    @Observable top = 0;

    @Observable width = 0;
    @Observable height = 0;

    @Observable isBookmark = false;

    /**
     * Data needed to render the {@link ViewComponent}.
     */
    @Attribute data;

    get right() {
        return this.left + this.width;
    }

    get bottom() {
        return this.top + this.height;
    }

    get hasChildren() {
        return false;
    }

    /**
     * Called each time the item is rendered. If this function returns true, VirtualScroll will track its visibility
     * and call `stopPendingItem` when it has fallen out of view.
     */
    expand() {
        return false;
    }

    /**
     * Called when the item falls out of the rendered view, if it has been expanded (by returning true from `expand()`).
     */
    stopPendingItem() {
    }

    savePosition() {
    }

    /**
     * Begin watching the specified observable attributes, triggering `setNeedsLayout()` when they change.
     *
     * @param {...WatchFunction } funcs A function that references an observable, for passing to `.watch()`.
     */
    layoutAttributes() {
        var needsLayout = () => this.setNeedsLayout();
        for (let i = 0, len = arguments.length; i < len; i++) {
            this.watch(arguments[i], needsLayout);
        }
    }

    /**
     * Mark this view as needing layout. (This implicitly notifies the parent that its child needs layout.)
     */
    setNeedsLayout() {
        // Look up the tree for the parent - we need to tell it to layout itself!
        let parent = this._parent;
        while (parent && !parent.setChildNeedsLayout) {
            parent = parent._parent;
        }
        if (parent && !parent.childNeedsLayout) {
            parent.setChildNeedsLayout();
        }
    }

    componentDidMount() {
        // Note: We can't just watch `this.children`, because this will only trigger if the array itself changes
        // (it's kept as the same array for performance reasons).
        this.listenTo(this, 'virtual.children', () => {
            this.setNeedsLayout();

        });
        this.setNeedsLayout();
    }

    componentWillUnmount() {
        this.setNeedsLayout();
    }

    /**
     * Update the layout and position of this item.
     * @see {@link #updateLayout}
     */
    layout(left, top, width, height) {
        this.left = left;
        this.top = top;

        if (this.needsLayout(width, height)) {
            this.updateLayout(width, height);
        }
    }

    needsLayout(width, height) {
        return this.width !== width || this.height !== height;
    }

    updateLayout(width, height) {
        this.width = width;
        this.height = height;
    }

    updatePosition(deltaLeft, deltaTop) {
        this.left += deltaLeft;
        this.top += deltaTop;
    }

    inViewport(collector) {
        return (inRange(collector.left, this.left, this.right) || inRange(this.left, collector.left, collector.right))
            && (inRange(collector.top, this.top, this.bottom) || inRange(this.top, collector.top, collector.bottom));
    }

    /**
     * If this item is within the viewport defined by `collector`, call `addItem(this)` on the collector.
     * @param {*} collector
     * @return {boolean} True if the item was added, otherwise false.
     */
    collect(collector) {
        if (this.inViewport(collector)) {
            collector.addItem(this);
            return true;
        }

        return false;
    }

    static get type() {
        return this.prototype.type;
    }

    toJSON() {
        return {
            name: this.constructor.name,
            viewName: this.view && this.view.constructor.name,
            left: this.left,
            top: this.top,
            width: this.width,
            height: this.height,
            children: this.children.map(c => c.toJSON())
        };
    }

    resolveBookmark(bookmark) {
        if (bookmark.dataItem === this.data) {
            bookmark.item = this;
            return true;
        }
    }

}
