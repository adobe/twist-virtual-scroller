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

import { LazyLoader, StickyItem, VerticalKnuthPlassLayout, VerticalListLayout, VirtualScroll } from '@twist/virtual-scroller';

import PhotoInteractionManager from './PhotoInteractionManager';
import PhotoController from './PhotoController';
import DragState from './DragState';
import PhotoDrag from './PhotoDrag';
import PhotoVirtualScrollLess from './PhotoVirtualScroll.less';

@Prototype({ type: 'groupHeader' })
@LayoutComponent
class GroupHeaderItem extends StickyItem {
}

@Prototype({ type: 'photo' })
@LayoutComponent
class PhotoItem {

    constructor() {
        super();
        this.layoutAttributes(() => this.aspectRatio);
    }

    get aspectRatio() {
        return this.data.aspectRatio;
    }
}

@ViewComponent
class GroupHeaderView {

    getContainerStyle() {
        return {
            'backgroundColor': 'rgba(0, 0, 0, 0.3)',
            'color': 'white',
            'fontWeight': 'bold'
        };
    }

    getInteraction() {
        return 0;
    }

    render() {
        return this.renderContainer(
            <div>{ this.virtualItem ? this.virtualItem.data.text : null }</div>
        );
    }
}

@ViewComponent
class PhotoView {

    constructor() {
        super();

        // For performance reasons, we need an intermediate observable. This is a bit different from @Cache, because
        // the cost of updating is cheap, but we don't want to invalidate the watchers unless its value actually changes
        this.watch(this.getInsertClass, newValue => this.insertClass = newValue);
    }

    @Observable insertClass;

    @Bind
    getInsertClass() {
        let dragState = this.scope.dragState;
        if (dragState.leftItem === this.virtualItem) {
            return 'left-insertion';
        }
        else if (dragState.rightItem === this.virtualItem) {
            return 'right-insertion';
        }
    }

    getInteraction() {
        return {
            name: 'photo',
            model: this.virtualItem ? this.virtualItem.data : null
        };
    }

    getContainerStyle() {
        return {
            width: '100%',
            border: this.virtualItem && PhotoController.isSelected(this.virtualItem.data) ? '2px solid black' : 'none'
        };
    }

    render() {
        return this.renderContainer(
            <div class={ PhotoVirtualScrollLess.photoViewInner } class={ this.insertClass }
                style="width: 100%; height: 100%; padding: 10px; transform-style: preserve-3d; box-sizing: border-box"
                style-background={ this.virtualItem ? ((this.virtualItem.data.id % 2) ? '#ccc' : '#ddd') : null }
            >
                { this.virtualItem ? this.virtualItem.data.text : null }
            </div>
        );
    }
}

// We create a mapping in order to separate three things:
// 1. Data model -> The layout will look at data and create virtual items.
// 2. Layout -> Computes by the list of virtual items.
// 3. View -> We recycle the views based on their types. The mapping below is used to
// define the mapping from virtual items to actual views.
var Mapping = {
    [PhotoItem.type]: PhotoView,
    [GroupHeaderItem.type]: GroupHeaderView
};

@Component
export default class PhotoVirtualScroll {
    @Attribute model;

    @Observable debugLog = '';
    @Observable animation;
    @Observable animationEnabled = false;
    @Observable animationDuration = undefined;

    constructor(props, context) {
        super(props, context);

        this.scope.dragState = this.link(new DragState);
        this.interactionManager = this.link(new PhotoInteractionManager(this.scope.dragState, this));
    }

    findDropInsertionPoint(event) {
        if (!this.scroller) {
            return;
        }
        let left, right, previous;

        let { x, y } = this.scroller.windowCoordsToVirtualCoords(event.clientX, event.clientY);

        let items = this.scroller.viewTypeById.photo.items;
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
            <PhotoDrag dragState={ this.scope.dragState } />
            <VirtualScroll
                ref={ this.scroller }
                style="width: 90%; height: 800px; box-sizing: border-box; border: 1px solid #ccc"
                verticalScroll={ true }
                mapping={ Mapping }
                animation={ this.animation }
                animationDuration={ this.animationDuration }
                bind:animationEnabled={ this.animationEnabled }
                onLog={ message => this.debugLog = message }
                interactionManager={ this.interactionManager }
                autoScroll={ true }>

                <VerticalListLayout margin={ 2 }>
                    <if condition={ !!this.model }>
                        <VirtualGroups model={ this.model }/>
                    </if>
                </VerticalListLayout>

            </VirtualScroll>
        </g>;
    }
}

@Component
class ScrollLog {
    @Attribute view;

    render() {
        return <pre>{ (this.view && this.view.debugLog) || ' ' }</pre>;
    }
}

@Component
class VirtualGroups {
    @Attribute model

    render() {
        return <repeat collection={ this.model.groups } as={ group, index }>
            <LazyLoader key={ index } lazyHeight={ 500 }>
                <GroupHeaderItem data={{ text: `Group ${group.id}` }} stickyHeight={ 50 } />

                <VerticalKnuthPlassLayout margin={ 2 } size={ 120 }>
                    <VirtualGroupItems model={ group.items } />
                </VerticalKnuthPlassLayout>
            </LazyLoader>
        </repeat>;
    }
}

@Component
class VirtualGroupItems {
    @Attribute model;

    render() {
        return <repeat collection={ this.model } as={ item, index } >
            <PhotoItem key={ index } data={ item } />
        </repeat>;
    }
}
