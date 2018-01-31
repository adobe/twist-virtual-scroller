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
import Timer from './Timer';
import TouchManager from './TouchManager';

function prioritySort(interactionA, interactionB) {
    return interactionB.priority - interactionA.priority;
}

export default class TouchMapper extends SignalDispatcher {

    @Observable active = false;

    state = {
        event: null,
        interactionName: null,
        currentInteraction: null,
        newInteraction: null
    };

    interactionsList = [];

    constructor(allowHtmlDrag = false, enabledInputs) {
        super();

        this.touchManager = this.link(new TouchManager());
        this.touchManager.allowHtmlDrag = allowHtmlDrag;

        if (enabledInputs) {
            Object.assign(this.touchManager.enabledInputs, enabledInputs);
        }
        this.listenTo(this.touchManager, 'click', this.onClick);
        this.listenTo(this.touchManager, 'start', this.onStart);
        this.listenTo(this.touchManager, 'update', this.onUpdate);
        this.listenTo(this.touchManager, 'end', this.onEnd);
        this.listenTo(this.touchManager, 'reset', this.onReset);
        this.listenTo(this.touchManager, 'gestureChange', this.onChange);
        this.listenTo(this.touchManager, 'wait', this.onWait);

        this.link(() => this.clearWait());

        this.waitTimers = [];
    }

    @Memoize
    static get instance() {
        return new this();
    }

    addNodeEvents(node, callback) {
        this.touchManager.addNodeEvents(node, callback);
    }

    pushInteraction(interaction) {
        this.interactionsList.push(interaction);
    }

    removeInteraction(interaction) {
        var interactionsList = this.interactionsList;
        var index = interactionsList.indexOf(interaction);
        if (index !== -1) {
            interactionsList.splice(index, 1);
        }
    }

    pushState(interactionName, event, model) {
        this.state.interactionName = interactionName;
        this.state.eventState = null;
        this.state.event = event;
        this.touchManager.start(event, model);
    }

    updateState(eventState) {
        var state = this.state;
        state.eventState = eventState;

        if (eventState !== 'wait') {
            this.clearWait();
        }

        var possibleStates = [];

        this.interactionsList.forEach(function(interaction) {
            var computedPriority = interaction.priority;
            if (computedPriority !== false) {
                possibleStates.push({
                    interaction,
                    priority: computedPriority
                });
            }
        });

        if (!possibleStates.length) {
            this.resetInteraction();
            return;
        }

        possibleStates.sort(prioritySort);

        var newInteraction = possibleStates[0].interaction;
        // Prevent changing the current interaction.
        if (newInteraction === this.state.currentInteraction) {
            return;
        }

        this.state.newInteraction = newInteraction;
    }

    resetInteraction() {
        this.state.newInteraction = null;

        var interaction = this.state.currentInteraction;
        if (interaction) {
            interaction.started = false;
            if (interaction.reset) {
                interaction.reset(this.state);
            }
            this.state.currentInteraction = null;
            this.trigger('currentInteraction');
        }

        this.active = false;
    }

    updateCurrentInteraction() {
        var newInteraction = this.state.newInteraction;
        if (!newInteraction) {
            return;
        }

        this.resetInteraction();
        this.state.currentInteraction = newInteraction;

        this.trigger('currentInteraction');
        this.active = true;
    }

    propagateInteractionEvent(name) {
        this.updateCurrentInteraction();
        this.triggerInteractionEvent(name);
    }

    triggerInteractionEvent(name) {
        var interaction = this.state.currentInteraction;
        if (!interaction) {
            return;
        }

        this.interactionEvent(interaction, name);

        var fn = interaction[name];
        if (fn) {
            fn.call(interaction);
        }
    }

    get waitTime() {
        if (this.waitStart) {
            return BrowserUtils.getTime() - this.waitStart;
        }
        else {
            return 0;
        }
    }

    wait(milliseconds) {
        let timer = new Timer;
        timer.setTimeout(() => {
            this.updateState('wait');
        }, milliseconds);
        this.waitTimers.push(timer);
    }

    clearWait() {
        this.waitTimers.forEach((timer) => timer.dispose());
        this.waitTimers = [];
        this.waitStart = null;
    }

    onClick() {
        this.updateState('click');
        this.propagateInteractionEvent('click');
        this.resetInteraction();
    }

    onStart() {
        this.updateState('drag');
        this.updateCurrentInteraction();
        var interaction = this.state.currentInteraction;
        if (interaction) {
            this.interactionEvent(interaction, 'start');
            if (interaction.start) {
                interaction.start();
            }
            interaction.started = true;
        }
    }

    onUpdate(event) {
        this.state.event = event;
        this.onUpdateHandler();
    }

    @Task
    onUpdateHandler() {
        var interaction = this.state.currentInteraction;
        if (interaction && interaction.started && interaction.update) {
            interaction.update();
        }
    }

    onEnd() {
        var interaction = this.state.currentInteraction;
        if (interaction && interaction.started) {
            interaction.started = false;
            if (interaction.end) {
                interaction.end();
            }
        }
    }

    onWait() {
        this.waitStart = BrowserUtils.getTime();
        this.updateState('wait');
    }

    onReset() {
        this.resetInteraction();
    }

    onChange() {
        this.updateState('gestureChange');
        this.propagateInteractionEvent('gestureChange');

        var interaction = this.state.currentInteraction;
        if (interaction && !interaction.started) {
            this.touchManager.resetStartOffsets();
        }
    }

    get processingEvent() {
        return this.touchManager.listening;
    }

    interactionEvent(/* interaction, name */) {
        // overwrite this if needed.
    }

}
