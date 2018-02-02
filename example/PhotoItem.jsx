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

import PhotoController from './PhotoController';
import PhotoItemLess from './PhotoItem.less';

/**
 * UI view for a photo
 */
@ViewComponent
export class PhotoView {

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
        if (dragState.leftItem === this.layoutItem) {
            return 'left-insertion';
        }
        else if (dragState.rightItem === this.layoutItem) {
            return 'right-insertion';
        }
    }

    getInteraction() {
        return {
            name: 'photo',
            model: this.layoutItem ? this.layoutItem.data : null
        };
    }

    getContainerStyle() {
        return {
            width: '100%',
            border: this.layoutItem && PhotoController.isSelected(this.layoutItem.data) ? '2px solid black' : 'none'
        };
    }

    render() {
        return this.renderContainer(
            <div class={ PhotoItemLess.photoViewInner } class={ this.insertClass }
                style="width: 100%; height: 100%; padding: 10px; transform-style: preserve-3d; box-sizing: border-box"
                style-background={ this.layoutItem ? ((this.layoutItem.data.id % 2) ? '#ccc' : '#ddd') : null }
            >
                { this.layoutItem ? this.layoutItem.data.text : null }
            </div>
        );
    }
}

/**
 * Virtual component (for layout) for a photo
 */
@LayoutComponent({ view: PhotoView })
export default class PhotoItem {

    constructor() {
        super();
        this.layoutAttributes(() => this.aspectRatio);
    }

    get aspectRatio() {
        return this.data.aspectRatio;
    }
}
