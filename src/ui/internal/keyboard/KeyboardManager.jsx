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

import { SignalDispatcher } from '@twist/core';
import BrowserUtils from '../utils/BrowserUtils';
import KeyboardParser from './KeyboardParser';

class StateObject extends SignalDispatcher {
}

export default class KeyboardManager extends SignalDispatcher {
    ignoredInputElements = [ 'input', 'textarea' ];

    constructor(context, handlers, element = window, ignoreInput = true) {
        super();
        this.context = context;
        this.handlers = handlers;
        this.keyboardParser = new KeyboardParser();
        this.state = new StateObject();
        this.install(element);
        this.ignoreInput = ignoreInput;
    }

    install(element) {
        this.link(BrowserUtils.addEventListener(element, 'keydown', this.onKeyDown));
        this.link(BrowserUtils.addEventListener(element, 'keypress', this.onKeyPress));
        this.link(BrowserUtils.addEventListener(element, 'keyup', this.onKeyUp));
    }

    @Bind
    onKeyDown(event) {
        this.triggerEvent('down', event);
    }

    @Bind
    onKeyPress(event) {
        this.triggerEvent('press', event);
    }

    @Bind
    onKeyUp(event) {
        this.triggerEvent('up', event);
    }


    triggerEvent(name, event) {
        if (!event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey) {
            if (this.ignoreInput && document.activeElement && this.ignoredInputElements.indexOf(document.activeElement.tagName.toLowerCase()) >= 0) {
                return;
            }
        }

        let handlers = [];
        let eventObject = { name, handlers, event };

        this.keyboardParser.matchKeyBinding(event, (keyBindingName) => {
            handlers.push({ keyBindingName, handled: false });
        });

        // Embedders have a chance to modify the events list in this callback.
        this.trigger('before', eventObject);

        handlers.forEach((handler) => {
            let { keyBindingName } = handler;

            // Try to execute name:[up|down|press] first.
            handler.handled = this.executeHandler(keyBindingName + ':' + name, keyBindingName, event, name)
                || this.executeHandler(keyBindingName, keyBindingName, event, name);
        });

        this.trigger('after', eventObject);
    }

    /**
     * Execute event callback
     * @param  {string} key            - Interaction name. e.g. "move-left:up"
     * @param  {string} keyBindingName - Key name. e.g. "move-left"
     * @param  {KeyboardEvent} event
     * @param  {string} eventName      - e.g. "up"
     * @return {Boolean}
     */
    executeHandler(key, keyBindingName, event, eventName) {
        if (!this.handlers.hasOwnProperty(key)) {
            return false;
        }

        var handler = this.handlers[key];
        if (typeof handler === 'function') {
            handler.call(this.context, event, eventName);
        }
        else {
            this.state[keyBindingName] = eventName !== 'keyup';
            this.state.trigger(keyBindingName);
        }

        return true;
    }

}
