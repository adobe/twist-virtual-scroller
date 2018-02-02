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

import { LazyLoader, VerticalKnuthPlassLayout, VerticalListLayout, VirtualScroll } from '@twist/virtual-scroller';

import PhotoItem from './PhotoItem';
import GroupHeaderItem from './GroupHeaderItem';

import PhotoInteractionManager from './PhotoInteractionManager';
import PhotoDragState from './PhotoDragState';
import PhotoDragView from './PhotoDragView';

// Note: ScrollLog has to be a separate view since it re-renders on every scroll event. If we
// don't separate it out, it would cause the entire virtual scroller to re-render on every scroll
// event, which is too expensive.
@Component
class ScrollLog {
    @Attribute view;

    render() {
        return <pre>{ (this.view && this.view.debugLog) || ' ' }</pre>;
    }
}

@Component
export default class PhotoVirtualScroll {
    @Attribute model;

    @Observable debugLog = '';
    @Observable animation;
    @Observable animationEnabled = false;
    @Observable animationDuration = undefined;

    constructor(props, context) {
        super(props, context);

        this.scope.dragState = this.link(new PhotoDragState);
        this.interactionManager = this.link(new PhotoInteractionManager(this.scope.dragState, this));
    }

    findDropInsertionPoint(event) {
        if (!this.scroller) {
            return;
        }
        let left, right, previous;

        let { x, y } = this.scroller.windowCoordsToVirtualCoords(event.clientX, event.clientY);

        let items = this.scroller.getViews(PhotoItem);
        for (let item of items) {
            if (item.top > y) {
                break;
            }
            else if (item.bottom >= y && item.top <= y) {
                if (left) {
                    // Just use this item as the item on the right side of the insertion point
                    right = item;
                    break;
                }
                else if (item.left <= x && item.right >= x) {
                    // The drag point is in this item
                    if ((x - item.left) < (item.width / 2)) {
                        // Drag point is in left half
                        left = previous;
                        right = item;
                        break;
                    }
                    else {
                        left = item;
                    }
                }
                else if (item.left > x) {
                    // We may have hit the gap between items
                    left = previous;
                    right = item;
                    break;
                }
                previous = item;
            }
        }
        if (left !== null || right !== null) {
            return { left, right };
        }
    }

    render() {
        return <g>
            {/*
                Animation doesn't work properly yet, so disabling the controls in the example:
            <label>
                Animate:&nbsp;
                <select bind:value={ this.animation }>
                    <option value="auto">auto</option>
                    <option value="disabled">disabled</option>
                    <option value="enabled">enabled</option>
                </select>
                { this.animationEnabled ? 'enabled' : 'disabled' }
                &nbsp;
            </label>
            <label>
                Duration
                <input type="range" min={0} max={1000} bind:value={ this.animationDuration }  />
            </label>
            */}
            <ScrollLog view={ this } />
            <PhotoDragView dragState={ this.scope.dragState } />
            <VirtualScroll
                ref={ this.scroller }
                style="width: 90%; height: 800px; box-sizing: border-box; border: 1px solid #ccc"
                verticalScroll={ true }
                animation={ this.animation }
                animationDuration={ this.animationDuration }
                bind:animationEnabled={ this.animationEnabled }
                onLog={ message => this.debugLog = message }
                interactionManager={ this.interactionManager }
                autoScroll={ true }>

                <VerticalListLayout margin={ 2 }>
                    <if condition={ !!this.model }>
                        <repeat collection={ this.model.groups } as={ group }>
                            <VirtualGroup group={ group } />
                        </repeat>
                    </if>
                </VerticalListLayout>

            </VirtualScroll>
        </g>;
    }
}

@Component
class VirtualGroup {
    @Attribute group

    render() {
        return <LazyLoader lazyHeight={ 500 }>
            <GroupHeaderItem data={{ text: `Group ${this.group.id}` }} stickyHeight={ 50 } />

            <VerticalKnuthPlassLayout margin={ 2 } size={ 120 }>
                <repeat collection={ this.group.items } as={ item } >
                    <PhotoItem data={ item } />
                </repeat>
            </VerticalKnuthPlassLayout>
        </LazyLoader>;
    }
}
