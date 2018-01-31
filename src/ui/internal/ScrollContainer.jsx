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

import ScrollInteraction from './interaction/ScrollInteraction';
import InteractiveView from './interaction/InteractiveView';

import KeyboardManager from './keyboard/KeyboardManager';

import ScrollAnimation from './animation/ScrollAnimation';
import AutoScrollAnimation from './animation/AutoScrollAnimation';

import ScrollContainerCSS from './ScrollContainerCSS';
import BrowserUtils from './utils/BrowserUtils';

// Only Macs can smooth scroll using the touch pad.
var wheelAlwaysAnimates = BrowserUtils.global.navigator ? BrowserUtils.global.navigator.platform !== 'MacIntel' : false;

var DOM_DELTA_PIXEL = 0;
var DOM_DELTA_LINE = 1;
var DOM_DELTA_PAGE = 2;

var KEYBOARD_UP_DOWN = 40;

var WheelRatios = {
    [DOM_DELTA_PIXEL]: 1,
    [DOM_DELTA_LINE]: 40,
    [DOM_DELTA_PAGE]: 400
};

var SCROLL_FADE_DURATION = 1000;

function translate(x, y) {
    return `translate3D(${x}px, ${y}px, 0)`;
}

function isDefined(x) {
    return x !== null && x !== undefined;
}

/**
 * The ScrollContainer component simulates a scrollable view. It intercepts mouse events (and, optionally,
 * keyboard events), interprets them as scroll events, and repositions the inner view accordingly.
 * NOTE: You probably want to use {@link VirtualScroll} directly, rather than this class.
 *
 * It can perform "auto scrolling", in which dragging an item toward the edge of the scroll view
 * causes the scroll view to begin scrolling in that direction.
 *
 * It can perform smoothly animated scrolling, i.e. interpreting gestures with momentum and friction.
 *
 * Note that this implementation does not perform "native" browser scrolling. Many modern browsers
 * use "asynchronous scrolling", in which scroll events occur asynchronously from the rendered
 * scroll position. This could cause views to not appear or disappear at the correct time, resulting
 * in visible UI glitches.
 *
 * TODO: Per @achicu, the Edge browser may not emit "wheel" events properly -- if that's the case,
 * we may need to implement native scrolling as a fallback.
 */
@Component({ events: [ 'scroll', 'log' ], fork: true })
export default class ScrollContainer {

    @Attribute('class') className;
    @Attribute style;
    @Attribute verticalScroll = true;
    @Attribute horizontalScroll = true;

    @Attribute animation = false;
    @Attribute animationDuration = 100;
    @Attribute animationEnabled; // Read-only attribute
    @Attribute keyboardEnabled = true;
    @Attribute keyboardMove = KEYBOARD_UP_DOWN;

    @Attribute handleKeyboardGlobally = false;

    @Attribute contentWidth = 0;
    @Attribute contentHeight = 0;

    @Attribute scrollBarSize = 7; // The actual size of the bar
    @Attribute scrollBarMargin = 5; // The margin between the bar and the edge.

    @Attribute scrollBarPadding = 0; // The actual space taken by the scrollbar from the content.

    @Observable viewWidth = 0;
    @Observable viewHeight = 0;

    @Attribute focusOnAttach = true;

    @Attribute autoScroll = true;
    @Attribute autoScrollRegionSize = 50;  // Pixels
    @Attribute autoScrollMinVelocity = 0.5; // Pixels per millisecond
    @Attribute autoScrollMaxVelocity = 2.5; // Pixels per millisecond

    @Observable requestedScrollLeft = 0;
    @Observable requestedScrollTop = 0;

    @Observable directionLeft = 0;
    @Observable directionTop = 0;

    @Observable displayScrollLeft = 0;
    @Observable displayScrollTop = 0;

    @Observable scrolling = false;
    @Observable trackHovered = false;

    @Observable pauseScrolling = false;

    @Observable offsetX;
    @Observable offsetY;

    // Notification that the last scroll event is triggered by the user.
    userEvent = false;

    scrollAnimation = this.link(new ScrollAnimation);
    autoScrollAnimation = this.link(new AutoScrollAnimation);

    constructor() {
        super();

        this.scrollInteraction = this.link(new ScrollInteraction(this.scope.touchMapper, this));

        this.watch(() => this.style, this.updateSize);
        this.watch(() => this.className, this.updateSize);
        this.watch(() => this.verticalScroll, this.updateScroll);
        this.watch(() => this.horizontalScroll, this.updateScroll);
        this.watch(() => this.contentWidth, this.updateScroll);
        this.watch(() => this.contentHeight, this.updateScroll);
        this.watch(() => this.scrollBarSize, this.updateScroll);
        this.watch(() => this.scrollBarMargin, this.updateScroll);
        this.watch(() => this.scrollBarPadding, this.updateScroll);

        this.listenTo(this.scrollAnimation, 'update', this.onAnimationUpdate);
        this.listenTo(this.autoScrollAnimation, 'update', this.onAutoScrollUpdate);

        if (this.keyboardEnabled) {
            this.keyboardManager = this.link(new KeyboardManager(this, this.keyHandlers));
        }
    }

    @Debounce(SCROLL_FADE_DURATION)
    removeScrolling() {
        this.scrolling = false;
        this.trackHovered = false;
    }

    scrollKeyboardAnimated(left, top) {
        if (this.animation === 'keyboard' || this.animation === 'enabled') {
            this.animateTo(left, top);
        }
        else {
            this.scrollTo(left, top, false, true);
        }
    }

    animateTo(left, top) {
        this.scrollAnimation.scroll(this.displayScrollLeft, this.displayScrollTop, left, top, this.animationDuration);
    }

    updateAutoScroll() {
        let touches = this.scope.touchMapper.touchManager.touches;
        if (touches.length === 1) {
            let { clientX: x, clientY: y } = touches.at(0).event;
            this.autoScrollAnimation.setCoords(x, y);
        }
        else {
            this.autoScrollAnimation.clear();
        }
    }

    @Bind
    onStart() {
        if (this.autoScroll && !this.scrollInteraction.active) {
            this.listenTo(this.scope.touchMapper.touchManager, 'update', this.onUpdate);
            this.listenTo(this.scope.touchMapper.touchManager, 'end', this.onEnd);

            this.autoScrollAnimation.start(this.element.getBoundingClientRect(), {
                autoScrollRegionSize: this.autoScrollRegionSize,
                minVelocity: this.autoScrollMinVelocity,
                maxVelocity: this.autoScrollMaxVelocity,
                verticalScroll: this.verticalScroll,
                horizontalScroll: this.horizontalScroll
            });

            this.updateAutoScroll();
        }
    }

    @Bind
    onEnd() {
        this.stopListening(this.scope.touchMapper.touchManager, 'update', this.onUpdate);
        this.stopListening(this.scope.touchMapper.touchManager, 'end', this.onEnd);
        this.autoScrollAnimation.stop();
    }

    @Bind
    onUpdate() {
        this.updateAutoScroll();
    }

    get keyHandlers() {
        return {
            'move-down:down': (event) => {
                if (this.focused || this.handleKeyboardGlobally) {
                    event.stopPropagation();
                    event.preventDefault();
                    this.scrollKeyboardAnimated(this.displayScrollLeft, this.requestedScrollTop + KEYBOARD_UP_DOWN);
                }
            },
            'move-up:down': (event) => {
                if (this.focused || this.handleKeyboardGlobally) {
                    event.stopPropagation();
                    event.preventDefault();
                    this.scrollKeyboardAnimated(this.displayScrollLeft, this.requestedScrollTop - KEYBOARD_UP_DOWN);
                }
            },
            'meta-up:down': (event) => {
                if (this.focused || this.handleKeyboardGlobally) {
                    event.stopPropagation();
                    event.preventDefault();
                    this.scrollKeyboardAnimated(this.displayScrollLeft, 0);
                }
            },
            'meta-down:down': (event) => {
                if (this.focused || this.handleKeyboardGlobally) {
                    event.stopPropagation();
                    event.preventDefault();
                    this.scrollKeyboardAnimated(this.displayScrollLeft, this.contentHeight);
                }
            },
            'page-down:down': (event) => {
                if (this.focused || this.handleKeyboardGlobally) {
                    event.stopPropagation();
                    event.preventDefault();
                    this.scrollKeyboardAnimated(this.displayScrollLeft, this.requestedScrollTop + this.innerHeight);
                }
            },
            'page-up:down': (event) => {
                if (this.focused || this.handleKeyboardGlobally) {
                    event.stopPropagation();
                    event.preventDefault();
                    this.scrollKeyboardAnimated(this.displayScrollLeft, this.requestedScrollTop - this.innerHeight);
                }
            },
            'home:down': (event) => {
                if (this.focused || this.handleKeyboardGlobally) {
                    event.stopPropagation();
                    event.preventDefault();
                    this.scrollKeyboardAnimated(this.displayScrollLeft, 0);
                }
            },
            'end:down': (event) => {
                if (this.focused || this.handleKeyboardGlobally) {
                    event.stopPropagation();
                    event.preventDefault();
                    this.scrollKeyboardAnimated(this.displayScrollLeft, this.contentHeight);
                }
            },
            'move-left:down': (event) => {
                if (this.focused || this.handleKeyboardGlobally) {
                    event.stopPropagation();
                    event.preventDefault();
                    this.scrollKeyboardAnimated(this.requestedScrollLeft - this.keyboardMove, this.displayScrollTop);
                }
            },
            'move-right:down': (event) => {
                if (this.focused || this.handleKeyboardGlobally) {
                    event.stopPropagation();
                    event.preventDefault();
                    this.scrollKeyboardAnimated(this.requestedScrollLeft + this.keyboardMove, this.displayScrollTop);
                }
            },
            'meta-left:down': (event) => {
                if (this.focused || this.handleKeyboardGlobally) {
                    event.stopPropagation();
                    event.preventDefault();
                    this.scrollKeyboardAnimated(0, this.displayScrollTop);
                }
            },
            'meta-right:down': (event) => {
                if (this.focused || this.handleKeyboardGlobally) {
                    event.stopPropagation();
                    event.preventDefault();
                    this.scrollKeyboardAnimated(this.contentWidth, this.displayScrollTop);
                }
            }
        };
    }

    componentDidMount() {
        this.updateSize();
        this.resizeLink = this.link(BrowserUtils.addEventListener(window, 'resize', this.updateSize));

        if (this.focusOnAttach) {
            this.element.focus();
        }

        this.listenTo(this.scope.touchMapper.touchManager, 'start', this.onStart);
    }

    componentWillUnmount() {
        if (this.resizeLink) {
            this.disposeLink(this.resizeLink);
            this.resizeLink = null;
        }
    }

    onAutoScrollUpdate(delta) {
        if (isDefined(delta.x) || isDefined(delta.y)) {
            let left = this.displayScrollLeft;
            let top = this.displayScrollTop;

            if (this.verticalScroll && isDefined(delta.y)) {
                top += delta.y;
            }

            if (this.horizontalScroll && isDefined(delta.x)) {
                left += delta.x;
            }

            this.scrollTo(left, top, false, true);
        }
        else if (isDefined(delta.velocityX) || isDefined(delta.velocityY)) {
            let velocity = {
                left: delta.velocityX ? delta.velocityX : 0,
                top: delta.velocityY ? delta.velocityY : 0
            };
            this.scrollAnimation.start(this.displayScrollLeft, this.displayScrollTop, velocity);
        }
    }

    @Task(101)
    updateSize() {
        if (!this.element) {
            return;
        }
        this.viewWidth = this.element.clientWidth;
        this.viewHeight = this.element.clientHeight;

        this.updateScroll();
    }

    get innerWidth() {
        return this.viewWidth - (this.verticalScroll ? this.scrollBarPadding : 0);
    }

    get innerHeight() {
        return this.viewHeight - (this.horizontalScroll ? this.scrollBarPadding : 0);
    }

    get scrollTopAmount() {
        return this.requestedScrollTop - this.displayScrollTop;
    }

    get scrollLeftAmount() {
        return this.requestedScrollLeft - this.displayScrollLeft;
    }

    onAnimationUpdate(left, top) {
        this.request(left, top);
        this.updateScroll();
    }

    @Task
    updateScroll() {
        this.updateScrollNow();
    }

    updateScrollNow() {
        if (!this.pauseScrolling) {
            this.displayScrollLeft = this.requestedScrollLeft = this.horizontalScroll ? Math.min(Math.max(0, this.requestedScrollLeft), Math.max(0, this.contentWidth - this.innerWidth)) : 0;
            this.displayScrollTop = this.requestedScrollTop = this.verticalScroll ? Math.min(Math.max(0, this.requestedScrollTop), Math.max(0, this.contentHeight - this.innerHeight)) : 0;
        }

        // Update the offset between Scroll coords and window coords
        this.updateBoundingClientRect();

        this.trigger('scroll', this.userEvent);
        this.setupScrolling();
    }

    @Task(15000)
    updateBoundingClientRect() {
        if (!this.element) {
            return;
        }
        let clientRect = this.element.getBoundingClientRect();
        this.offsetX = this.displayScrollLeft - clientRect.left;
        this.offsetY = this.displayScrollTop - clientRect.top;
    }

    request(left, top) {
        this.directionLeft = top === this.requestedScrollTop ? 0 : (left > this.requestedScrollLeft ? 1 : -1);
        this.directionTop = top === this.requestedScrollTop ? 0 : (top > this.requestedScrollTop ? 1 : -1);

        this.requestedScrollLeft = left;
        this.requestedScrollTop = top;
    }

    scrollTo(left, top, immediate = false, userEvent = false) {
        this.userEvent = userEvent;
        this.scrollAnimation.stop();

        left = this.horizontalScroll ? Math.min(Math.max(0, left), Math.max(0, this.contentWidth - this.innerWidth)) : 0;
        top = this.verticalScroll ? Math.min(Math.max(0, top), Math.max(0, this.contentHeight - this.innerHeight)) : 0;

        if (this.requestedScrollLeft === left && this.requestedScrollTop === top) {
            return false;
        }

        this.request(left, top);

        if (immediate) {
            this.updateScrollNow();
        }
        else {
            this.updateScroll();
        }

        return true;
    }

    stopScrolling() {
        this.pauseScrolling = true;
    }

    restartScrolling() {
        if (this.pauseScrolling) {
            this.pauseScrolling = false;
            this.request(this.displayScrollLeft, this.displayScrollTop);
        }
    }

    setupScrolling() {
        this.scrolling = true;
        this.removeScrolling();
    }

    @Bind
    onMouseWheel(event) {
        var animationData = this.scrollAnimation.animationData;
        this.scrollAnimation.stop();

        var deltaX = 0, deltaY = 0;
        var useAnimation = false;

        var deltaMode = event.deltaMode;
        if (deltaMode === undefined) {
            useAnimation = true;
            deltaY = -event.wheelDelta / 120;
            this.trigger('log', `deltaMode=undefined, event.wheelDelta=${event.wheelDelta}`);
        }
        else {
            // FIXME: what is page supposed to be?
            var ratio = WheelRatios[event.deltaMode];
            useAnimation = wheelAlwaysAnimates || event.deltaMode !== DOM_DELTA_PIXEL;

            deltaX = event.deltaX * ratio;
            deltaY = event.deltaY * ratio;
            this.trigger('log', `deltaMode=${event.deltaMode}, event.deltaX=${event.deltaX} event.deltaY=${event.deltaY} event.wheelDelta=${event.wheelDelta}`);
        }

        this.animationEnabled = useAnimation = this.animation === 'enabled' || useAnimation;

        // Large delta values don't work nicely with animation.
        if (useAnimation && (Math.abs(deltaX) > 100 || Math.abs(deltaY) > 100)) {
            deltaX /= 10;
            deltaY /= 10;
        }

        var newDirectionLeft = deltaX < 0 ? -1 : 1;
        var newDirectionTop = deltaY < 0 ? -1 : 1;

        var requestLeft, requestTop;

        if (animationData) {
            requestLeft = animationData.finalLeft + deltaX;
            requestTop = animationData.finalTop + deltaY;
        }
        else {
            requestLeft = this.requestedScrollLeft + deltaX;
            requestTop = this.requestedScrollTop + deltaY;
        }

        var sameDirection = (newDirectionLeft === this.directionLeft || this.directionLeft === 0)
                         && (newDirectionTop === this.directionTop || this.directionTop === 0);

        var didHorizontalScroll = this.horizontalScroll && deltaX && requestLeft >= 0 && requestLeft <= Math.max(0, this.contentWidth - this.innerWidth);
        var didVerticalScroll = this.verticalScroll && deltaY && requestTop >= 0 && requestTop <= Math.max(0, this.contentHeight - this.innerHeight);

        if (!sameDirection || didHorizontalScroll || didVerticalScroll) {
            event.preventDefault();
        }

        this.directionLeft = newDirectionLeft;
        this.directionTop = newDirectionTop;

        this.userEvent = true;

        if (useAnimation) {
            this.scrollAnimation.scroll(this.requestedScrollLeft, this.requestedScrollTop, requestLeft, requestTop, this.animationDuration);
        }
        else {
            this.request(requestLeft, requestTop);
            this.updateScroll();
        }
    }

    get scrollTransform() {
        return translate(-this.displayScrollLeft, -this.displayScrollTop);
    }

    get verticalLeft() {
        return this.viewWidth - this.scrollBarSize - this.scrollBarMargin;
    }

    get horizontalTop() {
        return this.viewHeight - this.scrollBarSize - this.scrollBarMargin;
    }

    // vertical track

    get verticalTrackTransform() {
        return translate(this.verticalLeft, this.scrollBarMargin);
    }

    get verticalTrackWidth() {
        return this.scrollBarSize;
    }

    get verticalTrackHeight() {
        var size = this.viewHeight - this.scrollBarMargin * 2;
        if (this.horizontalScroll) {
            // we need to allow space for the horizontal scroll as well.
            size -= this.scrollBarMargin + this.scrollBarSize;
        }
        return size;
    }

    // horizontal track

    get horizontalTrackTransform() {
        return translate(this.scrollBarMargin, this.horizontalTop);
    }

    get horizontalTrackWidth() {
        var size = this.viewWidth - this.scrollBarMargin * 2;
        if (this.verticalScroll) {
            // we need to allow space for the horizontal scroll as well.
            size -= this.scrollBarMargin + this.scrollBarSize;
        }
        return size;
    }

    get horizontalTrackHeight() {
        return this.scrollBarSize;
    }

    // vertical thumb

    get verticalThumbTransform() {
        return translate(this.verticalLeft,
            this.scrollBarMargin + (this.verticalTrackHeight - this.verticalThumbHeight) * (this.displayScrollTop / (this.contentHeight - this.innerHeight) || 0));
    }

    get verticalThumbWidth() {
        return this.scrollBarSize;
    }

    get verticalThumbHeight() {
        return Math.max(10, Math.min(1, Math.max(0, this.innerHeight / this.contentHeight || 0)) * this.verticalTrackHeight);
    }

    // horizontal thumb

    get horizontalThumbTransform() {
        return translate(this.scrollBarMargin + (this.horizontalTrackWidth - this.horizontalThumbWidth) * (this.displayScrollLeft / (this.contentWidth - this.innerWidth) || 0),
            this.horizontalTop);
    }

    get horizontalThumbWidth() {
        return Math.max(10, Math.min(1, Math.max(0, this.innerWidth / this.contentWidth || 0)) * this.horizontalTrackWidth);
    }

    get horizontalThumbHeight() {
        return this.scrollBarSize;
    }

    // Events

    onVerticalTrackMouseMove(event) {
        if (event.buttons) {
            event.preventDefault();
            var trackHeight = this.verticalTrackHeight;
            var thumbHeight = this.verticalThumbHeight;
            var halfThumb = thumbHeight / 2;
            this.requestedScrollTop = Math.min(trackHeight - thumbHeight, Math.max(0, event.offsetY - halfThumb)) / (trackHeight - this.verticalThumbHeight) * (this.contentHeight - this.innerHeight);
            this.updateScroll();
        }
    }

    onHorizontalTrackMouseMove(event) {
        if (event.buttons) {
            event.preventDefault();
            var trackWidth = this.horizontalTrackWidth;
            var thumbWidth = this.horizontalThumbWidth;
            var halfThumb = thumbWidth / 2;
            this.request(Math.min(trackWidth - thumbWidth, Math.max(0, event.offsetX - halfThumb)) / (trackWidth - thumbWidth) * (this.contentWidth - this.innerWidth), this.requestedScrollTop);
            this.updateScroll();
        }
    }

    get scrollActive() {
        return this.scrolling || this.trackHovered || this.scrollInteraction.active;
    }

    @Bind
    thumbHover() {
        this.trackHovered = true;
        this.removeScrolling.cancel();
        this.removeScrolling();
    }

    render() {
        return <div
            ref={ this.element }
            class={ ScrollContainerCSS.outerView }
            class={ this.className }
            class-active={ this.scrollActive }
            style={ this.style }
            tabIndex="1"
            onFocus={ () => this.focused = true }
            onBlur={ () => this.focused = false }
            onWheel={ this.onMouseWheel }>

            <InteractiveView class={ ScrollContainerCSS.overflowView }
                style-width={ this.innerWidth }
                style-height={ this.innerHeight }
                interaction={{ name: 'scroll' }}>
                <div class={ ScrollContainerCSS.innerView } style-transform={ this.scrollTransform }>
                    { this.children }
                </div>
            </InteractiveView>

            <if condition={this.verticalScroll}>
                <div class={ScrollContainerCSS.scrollbar}
                    class="twist-scrollbar-vertical"
                    onMouseOver={ this.thumbHover }>
                    <InteractiveView ref={ this.verticalTrack } class={ ScrollContainerCSS.track }
                        style-transform={ this.verticalTrackTransform }
                        style-width={ this.verticalTrackWidth }
                        style-height={ this.verticalTrackHeight }
                        class="twist-scrollbar-track"
                        interaction={{ name: 'scrollbar', model: { type: 'track', x: 0, y: true, track: this.verticalTrack } }} />

                    <InteractiveView ref={ this.verticalThumb } class={ ScrollContainerCSS.thumb }
                        style-transform={ this.verticalThumbTransform }
                        style-width={ this.verticalThumbWidth }
                        style-height={ this.verticalThumbHeight }
                        class="twist-scrollbar-thumb"
                        interaction={{ name: 'scrollbar', model: { type: 'thumb', x: 0, y: true, track: this.verticalTrack, thumb: this.verticalThumb } }} />
                </div>
            </if>

            <if condition={this.horizontalScroll}>
                <div class={ScrollContainerCSS.scrollbar}
                    class="twist-scrollbar-horizontal"
                    onMouseOver={ this.thumbHover }>

                    <InteractiveView ref={ this.horizontalTrack } class={ ScrollContainerCSS.track }
                        style-transform={ this.horizontalTrackTransform }
                        style-width={ this.horizontalTrackWidth }
                        style-height={ this.horizontalTrackHeight }
                        class="twist-scrollbar-track"
                        interaction={{ name: 'scrollbar', model: { type: 'track', x: true, y: 0, track: this.horizontalTrack } }} />

                    <InteractiveView ref={ this.horizontalThumb } class={ ScrollContainerCSS.thumb }
                        style-transform={ this.horizontalThumbTransform }
                        style-width={ this.horizontalThumbWidth }
                        style-height={ this.horizontalThumbHeight }
                        class="twist-scrollbar-thumb"
                        interaction={{ name: 'scrollbar', model: { type: 'thumb', x: true, y: 0, track: this.horizontalTrack, thumb: this.horizontalThumb } }} />
                </div>
            </if>

        </div>;
    }

}
