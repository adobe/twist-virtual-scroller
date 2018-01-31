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

/* global MSPointerEvent */

import { SignalDispatcher } from '@twist/core';
import BrowserUtils from '../utils/BrowserUtils';
import Point from './Point';

export var isTouchSupported = 'ontouchstart' in BrowserUtils.global;
export var isPointerSupported = BrowserUtils.global.navigator ? BrowserUtils.global.navigator.pointerEnabled : false;
export var isMSPointerSupported =  BrowserUtils.global.navigator ? BrowserUtils.global.navigator.msPointerEnabled : false;

var pointerTypeForMouse = isMSPointerSupported ? MSPointerEvent.MSPOINTER_TYPE_MOUSE : 'mouse';

var minFrameTime = 30; // No event shorter than 30ms.
var maxFrameTime = 50; // No event longger than 50ms.
export var maxHistoryItems = 10;

class TouchHistory {

    constructor() {
        this.next = 0;
        this.items = [];
    }

    reset() {
    }

    push(point) {
        // We use a circular list of maxHistoryItems.
        var i = (this.next++) % maxHistoryItems;
        this.items[i] = { point, time: BrowserUtils.getTime() };
    }

    reverse(fn) {
        var end = this.next + maxHistoryItems - 1, curr = end + maxHistoryItems;
        for (var index = 0; curr > end; --curr) {
            var i = curr % maxHistoryItems;
            var item = this.items[i];
            if (item && fn(item, index++) === false) {
                return;
            }
        }
    }

    each(fn) {
        var curr = this.next, end = curr + maxHistoryItems;
        for (var index = 0; curr < end; ++curr) {
            var i = curr % maxHistoryItems;
            var item = this.items[i];
            if (item && fn(item, index++) === false) {
                return;
            }
        }
    }

    /**
     * Get incremental movement
     * MouseEvent.movementX is not always returning correct incremental values. This does.
     * @return {object}
     */
    get movement() {
        const previous = this.items[(this.next - 2) % maxHistoryItems].point;
        const current  = this.items[(this.next - 1) % maxHistoryItems].point;

        return {
            x: current.left - previous.left,
            y: current.top - previous.top
        };
    }

    get velocity() {
        var first;
        var velocity;
        var direction;

        // Lookup the first frame that sits somewhere between 30 and 50 ms from last event.
        // If none is found just bail.
        this.reverse((current, index) => {
            // console.log(index, current.point, current.time, index ? first.time - current.time : 0);
            if (!index) {
                first = current;
                return;
            }

            var dt = first.time - current.time;
            var newDirection = current.point.clone().scaleAndMove(first.point, -1);
            if (direction && (newDirection.left * direction.left < 0 || newDirection.top * direction.top < 0)) {
                // Change of direction in the last frame.
                return false;
            }

            direction = newDirection.clone();

            // Do not use change of position smaller than 5px. Everything beyound that is actual scroll.
            if (Math.abs(newDirection.left) < 5) {
                newDirection.left = 0;
            }
            if (Math.abs(newDirection.top) < 5) {
                newDirection.top = 0;
            }
            velocity = newDirection.scale(1 / dt);

            // It took so long to reach this up to this event, it means the user just stopped scrolling.
            if (dt >= maxFrameTime) {
                velocity = null;
                return false;
            }

            // We reach enough data for velocity computation at around 30ms.
            if (dt >= minFrameTime) {
                return false;
            }
        });

        return velocity || new Point();
    }

}

class TouchModel {

    constructor(id, touch, event, startOffset, model) {
        this.id = id;
        this.touch = touch;
        this.event = event;
        this.startOffset = startOffset;
        this.current = startOffset.clone();
        this.model = model;
        this.history = new TouchHistory();
    }

    update(touch, event) {
        this.touch = touch;
        this.event = event;
        this.current = Point.create(touch.pageX, touch.pageY);
        this.history.push(this.current);
    }

    resetOffset() {
        this.startTime = this.time = BrowserUtils.getTime();
        this.startOffset = this.current.clone();
    }

    get offset() {
        return this.startOffset.clone().scaleAndMove(this.current, -1);
    }
}

function shouldIgnoreTouch(event) {
    return (event.type === 'mousedown' && (event.which !== 1 || event.ctrlKey))
            || (event.type === 'mouseup' && event.which !== 1);
}


class TouchList {

    constructor() {
        this.touches = [];
        this.touchesById = {};
    }

    get length() {
        return this.touches.length;
    }

    at(i) {
        return this.touches[i];
    }

    get(id) {
        return this.touchesById[id];
    }

    add(touch) {
        this.touches.push(touch);
        this.touchesById[touch.id] = touch;
    }

    each(fn) {
        this.touches.forEach(fn);
    }

    remove(fn) {
        this.touches = this.touches.filter((touch) => {
            var remove = fn(touch);
            if (remove) {
                delete this.touchesById[touch.id];
                return false;
            }
            return true;
        });
    }

}

export default class TouchManager extends SignalDispatcher {

    @Observable listening = false;

    touchDragMinOffset = 10;
    scrollDragMinOffset = 5;
    mouseDragMinOffset = 1;
    started = false;
    preventDefault = true;
    mobileScroll = false;
    usingMouse = false;
    touches = new TouchList;
    allowHtmlDrag = false;

    enabledInputs = {
        mouse : true,
        touch : true,
        pointer : true
    };

    get computePreventDefault() {
        return this.preventDefault && (!this.mobileScroll || this.started || this.usingMouse);
    }

    start(event, model) {
        this.onTouchStart(event, model);
    }

    inputEnabled(event) {
        if (event.type === 'mousedown' || event.type === 'mouseup' || (event.type === 'pointerdown' && event.pointerType === 'mouse')) {
            return this.enabledInputs.mouse;
        }
        else {
            if (event.type === 'pointerdown' || event.type === 'MSPointerDown') {
                return this.enabledInputs.pointer;
            }
            else {
                return this.enabledInputs.touch;
            }
        }
    }

    // Generally draggable is set for a div. The actual item that was clicked on might be somewhere inside that div, so we need to check all ancestors
    static isAnyAncestorDraggable(el) {
        while (!el.draggable && (el = el.parentElement)) {
            // Wait for condition to finish
        }
        return !!el;
    }

    @Bind
    onTouchStart(event, model) {
        var nativeEvent = event.originalEvent || event;
        if (nativeEvent.type === 'mousedown') {
            this.usingMouse = true;
            if (this.touches.get('mouse')) {
                // This should fix a bug when the browser doesn't send a mouseup for us (ie. when in inspector in debug mode).
                this.onMouseUp(event);
            }
        }
        // If the user wants to use HTML5 drag-and-drop, let the drag events propagate unhindered
        var isDraggable = this.allowHtmlDrag && TouchManager.isAnyAncestorDraggable(event.target);
        if (shouldIgnoreTouch(nativeEvent) || !this.inputEnabled(nativeEvent) || isDraggable) {
            return;
        }

        var hadAnyTouch = !!this.touches.length;

        if (this.computePreventDefault) {
            event.stopImmediatePropagation();
            event.preventDefault();
        }

        this.createTouchModels(nativeEvent, model || event.model);
        if (!hadAnyTouch) {
            this.addListeners();
            this.trigger('wait');
        }
        if (hadAnyTouch && this.started) {
            this.trigger('gestureChange');
        }
    }

    createTouchModels(event, model) {
        var touches = this.touches;

        if (event.type === 'mousedown') {
            let offset = Point.create(event.pageX, event.pageY);
            touches.add(new TouchModel('mouse', event, event, offset, model));
        }
        else if (event.type === 'pointerdown' || event.type === 'MSPointerDown') {
            let offset = Point.create(event.pageX, event.pageY);
            touches.add(new TouchModel(event.pointerId, event, event, offset, model));
        }
        else {
            for (let i = 0, len = event.changedTouches.length; i < len; i++) {
                const touch = event.changedTouches[i];
                let offset = Point.create(touch.pageX, touch.pageY);
                var touchModel = new TouchModel(touch.identifier, touch, event, offset, model);
                if (touches.get(touchModel.id)) {
                    console.error('Existing touch handled twice');
                }
                touches.add(touchModel);
            }
        }
    }

    addNodeEvents(node, callback) {
        node.addEventListener('mousedown', callback);

        if (isTouchSupported) {
            node.addEventListener('touchstart', callback);
        }

        if (isPointerSupported) {
            BrowserUtils.setStyle(node, 'touch-action', 'none');
            node.addEventListener('pointerdown', (event) => {
                if (event.pointerType === pointerTypeForMouse) {
                    // We are using mouse down, so no need to track it here.
                    return;
                }
                callback.call(node, event);
            }, false);
        }
        else if (isMSPointerSupported) {
            BrowserUtils.setStyle(node, 'touch-action', 'none');
            node.addEventListener('MSPointerDown', (event) => {
                if (event.pointerType === pointerTypeForMouse) {
                    // We are using mouse down, so no need to track it here.
                    return;
                }
                callback.call(node, event);
            }, false);
        }
    }

    addListeners() {
        if (!this.touches.length) {
            console.error('Expected this.touches to be a non-empty array');
        }
        this.listening = true;

        document.addEventListener('mousedown', this.onTouchStart, true);
        document.addEventListener('mousemove', this.onMouseMove, true);
        document.addEventListener('mouseup', this.onMouseUp, true);

        if (isTouchSupported) {
            document.addEventListener('touchstart', this.onTouchStart, true);
            document.addEventListener('touchmove', this.onTouchMove, true);
            document.addEventListener('touchend', this.onTouchEnd, true);
            document.addEventListener('touchcancel', this.onTouchCancel, true);
        }

        if (isPointerSupported) {
            document.addEventListener('pointerdown', this.onTouchStart, true);
            document.addEventListener('pointermove', this.onPointerMove, true);
            document.addEventListener('pointerup', this.onPointerUp, true);
        }
        else if (isMSPointerSupported) {
            document.addEventListener('MSPointerDown', this.onTouchStart, true);
            document.addEventListener('MSPointerMove', this.onPointerMove, true);
            document.addEventListener('MSPointerUp', this.onPointerUp, true);
        }

        if (this.allowHtmlDrag) {
            document.addEventListener('dragstart', this.onDragStart, true);
            document.addEventListener('dragend', this.onDragEnd, true);
        }
    }

    removeListeners() {
        if (this.touches.length) {
            console.error('Expected this.touches to be an empty array');
        }
        this.listening = false;

        document.removeEventListener('mousedown', this.onTouchStart, true);
        document.removeEventListener('mousemove', this.onMouseMove, true);
        document.removeEventListener('mouseup', this.onMouseUp, true);

        if (isTouchSupported) {
            document.removeEventListener('touchstart', this.onTouchStart, true);
            document.removeEventListener('touchmove', this.onTouchMove, true);
            document.removeEventListener('touchend', this.onTouchEnd, true);
            document.removeEventListener('touchcancel', this.onTouchCancel, true);
        }

        if (isPointerSupported) {
            document.removeEventListener('pointerdown', this.onTouchStart, true);
            document.removeEventListener('pointermove', this.onPointerMove, true);
            document.removeEventListener('pointerup', this.onPointerUp, true);
        }
        else if (isMSPointerSupported) {
            document.removeEventListener('MSPointerDown', this.onTouchStart, true);
            document.removeEventListener('MSPointerMove', this.onPointerMove, true);
            document.removeEventListener('MSPointerUp', this.onPointerUp, true);
        }

        if (this.allowHtmlDrag) {
            document.removeEventListener('dragstart', this.onDragStart, true);
            document.removeEventListener('dragend', this.onDragEnd, true);
        }

        this.trigger('listenersRemoved');
    }

    sendUpdateEvent(event) {
        if (this.started) {
            this.trigger('update', event);
        }
        else {
            this.startGesture();
        }
    }

    startGesture() {
        var shouldStart = false,
            touchDragMinOffset = this.touchDragMinOffset,
            mouseDragMinOffset = this.mouseDragMinOffset;
        this.touches.each((touch) => {
            shouldStart |= Math.abs(touch.offset.length()) > (touch.id === 'mouse' ? mouseDragMinOffset : touchDragMinOffset);
        });
        if (this.mobileScroll && this.touches.length === 1) {
            var touch = this.touches.at(0);
            if (touch.id !== 'mouse' && Math.abs(touch.offset.top) > this.scrollDragMinOffset) {
                shouldStart = false;
                touch.ended = true;
                this.updateAfterTouchEnded();
            }
        }
        if (shouldStart) {
            this.started = true;
            this.trigger('start');
        }
    }

    @Bind
    onPointerMove(event) {
        if (event.pointerType === pointerTypeForMouse) {
            return;
        }

        var touchModel = this.touches.get(event.pointerId);
        if (touchModel) {
            touchModel.update(event, event);
        }

        this.sendUpdateEvent(event);

        if (this.computePreventDefault) {
            event.stopImmediatePropagation();
            event.preventDefault();
        }
    }

    @Bind
    onMouseMove(event) {
        // If the user moves their mouse outside the window and releases the button, we won't receive a mouseup event;
        // instead we must detect it when they move their mouse back into the window (here). An ideal implementation
        // would "capture" the mouse while it is held down, which would allow mouse events to trigger even outside the
        // window, but setCapture <https://developer.mozilla.org/en-US/docs/Web/API/Element/setCapture> is not supported
        // across all browsers. When the "pointer events" API is supported everywhere, we can use that instead.
        if (this.touches.get('mouse') && !event.buttons) {
            this.onMouseUp(event);
        }

        // If the user wants to use HTML5 drag-and-drop, let the drag events propagate unhindered
        var isDraggable = this.allowHtmlDrag && TouchManager.isAnyAncestorDraggable(event.target);
        if(isDraggable) {
            return;
        }

        var touchModel = this.touches.get('mouse');
        if (touchModel) {
            touchModel.update(event, event);
        }

        this.sendUpdateEvent(event);

        if (this.computePreventDefault) {
            event.stopImmediatePropagation();
            event.preventDefault();
        }
    }

    @Bind
    onTouchMove(event) {
        // This is a multi touch gesture.
        for (let i = 0, len = event.changedTouches.length; i < len; i++) {
            const touch = event.changedTouches[i];
            var touchModel = this.touches.get(touch.identifier);
            if (touchModel) {
                touchModel.update(touch, event);
            }
        }

        this.sendUpdateEvent(event);

        if (this.computePreventDefault) {
            event.stopImmediatePropagation();
            event.preventDefault();
        }
    }

    @Bind
    onPointerCancel(event) {
        this.handlePointerEnd(event, true);
    }

    @Bind
    onPointerUp(event) {
        this.handlePointerEnd(event, false);
    }

    handlePointerEnd(event, isCancel) {
        if (event.pointerType === pointerTypeForMouse) {
            return;
        }

        var touchModel = this.touches.get(event.pointerId);
        if (touchModel) {
            touchModel.ended = true;
        }

        if (this.computePreventDefault) {
            event.stopImmediatePropagation();
            event.preventDefault();
        }

        this.updateAfterTouchEnded(isCancel);
    }

    @Bind
    onMouseUp() {
        var touchModel = this.touches.get('mouse');
        if (touchModel) {
            touchModel.ended = true;
        }
        this.updateAfterTouchEnded();
    }

    @Bind
    onTouchCancel(event) {
        this.handleTouchEnd(event, true);
    }

    @Bind
    onTouchEnd(event) {
        this.handleTouchEnd(event, false);
    }

    handleTouchEnd(event, isCancel) {
        // This is a multi touch gesture.
        var remainingTouches = {};
        for (let i = 0, len = event.touches.length; i < len; i++) {
            const touch = event.touches[i];
            remainingTouches[touch.identifier] = true;
        }

        var ended = false;
        this.touches.each((touchModel) => {
            var stillTouching = remainingTouches[touchModel.touchId];
            if (!stillTouching) {
                // Touch ended.
                touchModel.ended = true;
                ended = true;
            }
        });

        if (!ended) {
            return;
        }

        if (this.computePreventDefault) {
            event.stopImmediatePropagation();
            event.preventDefault();
        }

        this.updateAfterTouchEnded(isCancel);
    }

    updateAfterTouchEnded(isCancel) {
        if (!isCancel && !this.started && this.touches.length === 1) {
            var singleTouch = this.touches.at(0);
            if (singleTouch && singleTouch.ended) {
                this.trigger('click', singleTouch);
            }
        }

        this.touches.remove((touchModel) => {
            return touchModel.ended;
        });

        if (!this.touches.length) {
            // This was our last touch.
            if (this.started && !isCancel) {
                this.trigger('end');
            }
            this.reset();
        }
        else {
            this.trigger('gestureChange');
        }
    }

    @Bind
    onDragStart() {
        // Stop listening for mousemove while were dragging, so we don't check if any ancestor is draggable every time it fires
        if (this.listening && this.allowHtmlDrag) {
            document.removeEventListener('mousemove', this.onMouseMove, true);
        }
    }

    @Bind
    onDragEnd() {
        // Start listening for mousemove again, when dragging is done
        if (this.listening && this.allowHtmlDrag) {
            document.addEventListener('mousemove', this.onMouseMove, true);
        }
    }

    resetStartOffsets() {
        this.touches.each((touch) => touch.resetOffset());
        this.started = false;
    }

    reset() {
        this.preventDefault = true;
        this.usingMouse = false;
        this.started = false;
        this.removeListeners();
        this.trigger('reset');
    }

    dispose() {
        this.reset();
        super.dispose();
    }
}
