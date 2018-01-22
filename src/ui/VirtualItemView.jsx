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

function translate(x, y) {
    return `translate3D(${x}px, ${y}px, 0)`;
}

/**
 * VirtualItemView is the base class for creating views for items in your VirtualScroll component.
 * Each `VirtualItemView` will be reused for rendering multiple elements; as such, its `virtualItem`
 * attribute will point to different objects, and may be `null` when a view isn't needed.
 *
 * When you extend this class, pass `{...this.itemAttributes}` into your view's root element to
 * pass along its positioning attributes, like so:
 *
 * @example
 *     @Component
 *     class MyComponent {
 *         render() {
 *             return <div {...this.itemAttributes}>
 *                 {this.virtualItem && this.virtualItem.data}
 *             </div>;
 *         }
 *     }
 */
@Component
export default class VirtualItemView {

    @Attribute virtualItem;

    get itemAttributes() {
        let style = {
            position: 'absolute',
            visibility: 'hidden'
        };

        if (this.virtualItem) {
            style.transform = this.virtualItem.fixed
                ? translate(this.virtualItem.fixedLeft, this.virtualItem.fixedTop)
                : translate(this.virtualItem.left, this.virtualItem.top);
            style.visibility = 'visible';
            style.width = this.virtualItem.width + 'px';
            style.height = this.virtualItem.height + 'px';
        }
        return { style };
    }
}
