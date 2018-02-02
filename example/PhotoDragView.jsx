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

/**
 * View to display when dragging a photo
 */
@Component
export default class PhotoDragView {
    @Attribute dragState;

    get item() {
        return this.dragState.items[0];
    }

    render() {
        return <if condition={ this.dragState && this.dragState.dragging }>
            <div
                style="width: 100%; padding: 10px; box-sizing: border-box;"
                style-background="yellow"
                style-background={ this.item ? ((this.item.id % 2) ? '#ccc' : '#ddd') : null }
                style-width={ this.dragState.width }
                style-height={ this.dragState.height }
                style-position="absolute"
                style-top={ this.dragState.mouseY }
                style-left={ this.dragState.mouseX }
                style-opacity="0.8"
                style-z-index="10">
                { this.item ? this.item.text : null }
            </div>
        </if>;
    }
}
