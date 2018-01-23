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

import Interaction from 'torq-interaction/Interaction';

export default class PhotoInteraction extends Interaction {

    constructor(touchMapper, dragState, photoScroller) {
        super(touchMapper);
        this.dragState = dragState;
        this.photoScroller = photoScroller;
    }

    get priority() {
        if (this.state.eventState !== 'drag' || this.state.interactionName !== 'photo' || this.touches.length !== 1) {
            return false;
        }

        // Return something higher than 100 used for scrolling.
        return 150;
    }

    start() {
        var touch = this.touches.at(0);
        var model = touch.model;

        this.dragState.items = [ model ];
        this.dragState.dragging = true;
        let clientRect = touch.event.target.getBoundingClientRect();
        this.dragState.width = clientRect.width;
        this.dragState.height = clientRect.height;
        this.dragState.offsetX = touch.event.offsetX;
        this.dragState.offsetY = touch.event.offsetY;
    }

    update() {
        var touch = this.touches.at(0);
        this.dragState.mouseX = touch.event.clientX - this.dragState.offsetX;
        this.dragState.mouseY = touch.event.clientY - this.dragState.offsetY;

        if (this.photoScroller) {
            let insertionPoint = this.photoScroller.findDropInsertionPoint(touch.event);
            if (insertionPoint) {
                this.dragState.leftItem = insertionPoint.left;
                this.dragState.rightItem = insertionPoint.right;
            }
        }
    }

    end() {
        this.photoScroller.model.moveItems(this.dragState.items, this.dragState.leftItem, this.dragState.rightItem);
        this.dragState.dragging = false;
        this.dragState.leftItem = this.dragState.rightItem = null;
    }
}
