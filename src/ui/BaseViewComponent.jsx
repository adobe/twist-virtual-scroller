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

import InteractiveView from './internal/interaction/InteractiveView';

function translate(x, y) {
    return `translate3D(${x}px, ${y}px, 0)`;
}

const _containerStyle = Symbol('containerStyle');

/**
 * BaseViewComponent is the base class for creating views for items in your VirtualScroll component.
 * You should use the `@ViewComponent` decorator as a shorthand for extending this class.
 *
 * Each `ViewComponent` will be reused for rendering multiple elements; as such, its `layoutItem`
 * attribute will point to different objects, and may be `null` when a view isn't needed.
 *
 * When you extend this class, call `this.renderContainer(myJSX)` inside your render function, so that
 * the content gets rendered in a container with the correct positioning applied, like so:
 *
 * @example
 *     @Component
 *     class MyComponent {
 *         render() {
 *             return this.renderContainer(<g>{this.virtualItem && this.virtualItem.data}</g>);
 *         }
 *     }
 */
@Component
export default class BaseViewComponent {

    @Attribute virtualItem;

    get [_containerStyle]() {
        let style = this.getContainerStyle();
        style.position = 'absolute';
        style.visibility = 'hidden';

        if (this.virtualItem) {
            style.transform = this.virtualItem.fixed
                ? translate(this.virtualItem.fixedLeft, this.virtualItem.fixedTop)
                : translate(this.virtualItem.left, this.virtualItem.top);
            style.visibility = 'visible';
            style.width = this.virtualItem.width + 'px';
            style.height = this.virtualItem.height + 'px';
        }
        return style;
    }

    /**
     * Subclasses should override this if they want the view to be interactive - it should return an object,
     * that's passed to the interaction instance.
     */
    getInteraction() {
    }

    /**
     * Subclasses should override this if they want to provide additional styling
     */
    getContainerStyle() {
        return {};
    }

    /**
     * Subclasses should override this if they want to provide additional attributes on the container
     */
    getContainerAttributes() {
        return {};
    }

    /**
     * Subclasses should call this from the render function to render their content inside a <div> container.
     * This handles applying the correct layout style, so it's positioned correctly
     *
     * @param {jsx} content The content to render inside the container
     */
    renderContainer(content) {
        return <g>
            <if condition={ this.getInteraction() }>
                <InteractiveView interaction={ this.getInteraction() } style={ this[_containerStyle] } { ...this.getContainerAttributes() }>
                    { content }
                </InteractiveView>
            </if>
            <else>
                <div style={ this[_containerStyle] } { ...this.getContainerAttributes() }>
                    { content }
                </div>
            </else>
        </g>;
    }
}
