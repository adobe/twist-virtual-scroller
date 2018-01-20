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

import Interaction from './Interaction';
import Point from './Point';

function getOffset(name, touch, target) {
    var layerPosition = touch[name];
    if (!layerPosition) {
        var { left, top, width, height } = target.getBoundingClientRect();
        touch[name] = layerPosition = Point.create(left, top);
        touch[name].width = width;
        touch[name].height = height;
    }
    return touch.current.clone().scaleAndMove(layerPosition, -1);
}

/**
 * ScrollInteraction manages the behavior linking a Scroll component with its scrollbars,
 * and handles mouse/pointer/touch input.
 */
export default class ScrollInteraction extends Interaction {

    constructor(touchMapper, scroll) {
        super(touchMapper);
        this.scroll = scroll;
    }

    getScrollBarModel(touch) {
        // The scrollbars have a model attached to them.
        return this.state.interactionName === 'scrollbar' ? touch.model : null;
    }

    get priority() {
        if (this.touches.length !== 1) {
            return false;
        }

        if (this.state.eventState !== 'drag') {
            var model = this.getScrollBarModel(this.touches.at(0));
            if (!model || model.type !== 'track') {
                // We only support tapping the track of the scrollbar.
                return false;
            }
        }

        return 100;
    }

    click() {
        this.active = true;
        this.touch = this.touches.at(0);
        // This will only be triggered in the "track" mode.
        this.update();
    }

    start() {
        this.scroll.animation.stop();

        this.active = true;
        this.startScrollLeft = this.scroll.requestedScrollLeft;
        this.startScrollTop = this.scroll.requestedScrollTop;

        var touch = this.touch = this.touches.at(0);
        var model = this.getScrollBarModel(touch);
        if (model && model.type === 'thumb') {
            this.thumbOffset = getOffset('thumbPosition', touch, model.thumb);
        }
    }

    reset() {
        var model = this.getScrollBarModel(this.touch);
        if (!model || model.type === 'background') {
            this.scroll.animation.start(this.scroll.requestedScrollLeft, this.scroll.requestedScrollTop, this.touch.history.velocity);
        }

        this.touch = null;
        this.active = false;
    }

    update() {
        if (this.active) {
            this.applyTouch(this.touch);
        }
    }

    applyTouch(touch) {
        var model = this.getScrollBarModel(touch),
            type = model ? model.type : 'background',
            left = this.scroll.requestedScrollLeft,
            top = this.scroll.requestedScrollTop;

        if (type === 'track' || type === 'thumb') {
            let offset = getOffset('trackPosition', touch, model.track);

            if (model.y) {
                let trackHeight = this.scroll.verticalTrackHeight;
                let thumbHeight = this.scroll.verticalThumbHeight;

                // Take into account the fact that our view might be scaled up or down.
                let verticalScale = trackHeight / touch.trackPosition.height;
                let offsetTop = offset.top * verticalScale;

                let verticalThumbDragPoint = type === 'track' ? thumbHeight / 2 : this.thumbOffset.top * verticalScale;
                let ratio = trackHeight - thumbHeight;
                top = ratio ? Math.min(trackHeight - thumbHeight, Math.max(0, offsetTop - verticalThumbDragPoint)) * ((this.scroll.contentHeight - this.scroll.innerHeight) / ratio) : 0;
            }

            if (model.x) {
                let trackWidth = this.scroll.horizontalTrackWidth;
                let thumbWidth = this.scroll.horizontalThumbWidth;

                // Take into account the fact that our view might be scaled up or down.
                let horizontalScale = trackWidth / touch.trackPosition.width;
                let offsetLeft = offset.left * horizontalScale;

                let horizontalThumbDragPoint = type === 'track' ? thumbWidth / 2 : this.thumbOffset.left * horizontalScale;
                let ratio = trackWidth - thumbWidth;
                left = ratio ? Math.min(trackWidth - thumbWidth, Math.max(0, offsetLeft - horizontalThumbDragPoint)) * ((this.scroll.contentWidth - this.scroll.innerWidth) / ratio) : 0;
            }
        }
        else {
            let offset = touch.offset;
            left = this.startScrollLeft + offset.left;
            top = this.startScrollTop + offset.top;
        }

        this.scroll.scrollTo(left, top, false, true);
    }
}
