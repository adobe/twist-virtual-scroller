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
 * An interactive container component - this allows interaction (e.g. drag/drop) of an item in the
 * virtual scroller.
 *
 * This is used internally by the scrollbar, and also for
 */
@Component
export default class InteractiveView {

    @Attribute interaction;
    @Observable element;

    constructor() {
        super();

        // When the element changes we need to attach the right event listeners
        this.watch(() => this.element, element => {
            let touchMapper = this.scope && this.scope.touchMapper;

            if (element && !element.touched && touchMapper) {
                element.touched = true;
                touchMapper.addNodeEvents(element, ev => {
                    let data = this.interaction;
                    touchMapper.pushState(data.name, ev, data.model);
                });
                // Note: we don't remove the event listener because it gets shared even if the DOM node gets rebound to something else.
                // Not sure if we need to be more careful about this; for now just following what we did previously.
            }
        });
    }

    render() {
        return <div key="interactive" {...this.undeclaredAttributes()} ref={ this.element } >
            { this.children }
        </div>;
    }
}
