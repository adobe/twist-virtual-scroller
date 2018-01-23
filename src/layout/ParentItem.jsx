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

import VirtualItem from './VirtualItem';

/**
 * An item that contains children. Parent items are responsible for passing layout and position
 * to their children as needed. This class is fairly low-level; if you're just implementing a
 * VirtualScroll view, consider using a higher-level class like {@link BlockItem}.
 */
@VirtualComponent
export default class ParentItem extends VirtualItem {

    setChildNeedsLayout() {
        this.childNeedsLayout = true;
        this.setNeedsLayout();
    }

    layoutAttributes() {
        var needsLayout = () => this.setChildNeedsLayout();
        for (let i = 0, len = arguments.length; i < len; i++) {
            this.watch(arguments[i], needsLayout);
        }
    }

    willInsertBefore(child, before) {
        super.willInsertBefore(child, before);
        // Make sure that a child will notify the layout change on the parents.
        this.setChildNeedsLayout();
    }

    layout(left, top, width, height) {
        var needsLayout = this.needsLayout(width, height);
        if (needsLayout) {
            this.left = left;
            this.top = top;
            this.updateLayout(width, height);
            return;
        }

        var deltaLeft = left - this.left;
        var deltaTop = top - this.top;
        if (deltaLeft || deltaTop) {
            this.updatePosition(deltaLeft, deltaTop);
        }
    }

    updatePosition(deltaLeft, deltaTop) {
        super.updatePosition(deltaLeft, deltaTop);
        this.children.forEach((item) => item.updatePosition(deltaLeft, deltaTop));
    }

    needsLayout(width, height) {
        return this.childNeedsLayout || super.needsLayout(width, height);
    }

    updateLayout() {
        this.childNeedsLayout = false;
    }

    collect(collector) {
        if (!this.inViewport(collector)) {
            return false;
        }

        collector.addItem(this);
        this.children.forEach((item) => item.collect(collector));
        return true;
    }

    resolveBookmark(bookmark) {
        if (super.resolveBookmark(bookmark)) {
            return true;
        }
        return this.any((item) => item.resolveBookmark(bookmark));
    }
}
