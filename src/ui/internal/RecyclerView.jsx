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

import { ObservableArray, ObjectId } from '@twist/core';

class RecycledView {
    @Observable layoutItem = null;
}

/**
 * RecyclerView displays a view for each item in a collection, much like `<repeat>`.
 * Unlike `<repeat>`, RecyclerView reuses individual views (and binds them to new data),
 * rather than detaching and reattaching components. There is always a fixed number of
 * views in the pool; this number is increased as needed to accommodate each view.
 *
 * Note that this class does not perform any logic in deciding which views to render;
 * it always renders every view given to it. VirtualScroll and layout classes determine
 * that earlier in the process, during the collection phase.
 */
@Component
export default class RecyclerView {

    @Attribute view;
    @Attribute collection;
    @Attribute capacity = 10;

    constructor() {
        super();
        var initalViews = new Array(this.capacity);
        for (var i = 0; i < initalViews.length; ++i) {
            initalViews[i] = new RecycledView();
        }

        this.views = new ObservableArray(initalViews);
        this.watchCollection(() => this.collection, this.updateVisibleViews);
    }

    @Bind
    updateVisibleViews(collection) {
        if (!collection) {
            return;
        }

        var itemById = this.itemById || {};
        var newItemById = {};
        var busySlotsLength = this.views.length;

        // Assume that every slot is free.
        var busySlots = new Array(busySlotsLength);
        for (let i = 0; i < busySlotsLength; ++i) {
            busySlots[i] = false;
        }

        var newItems = [];

        for (let i = 0, l = collection.length; i < l; ++i) {
            // Let's figure out if we already have this item and mark it's slot busy.
            let item = collection[i];
            let id = ObjectId.get(item);
            if (itemById.hasOwnProperty(id)) {
                let slot = itemById[id];
                newItemById[id] = slot;
                busySlots[slot] = true;
                continue;
            }

            newItems.push(item);
        }

        var firstFreeSlot = 0;

        var newSlots = 0;

        // now that we know what slots cannot change, we can fill with new items.
        for (var i = 0, l = newItems.length; i < l; ++i) {
            let item = newItems[i];
            let id = ObjectId.get(item);

            // Let's allocate a free slot to this item.
            for (; firstFreeSlot < busySlotsLength; ++firstFreeSlot) {
                if (!busySlots[firstFreeSlot]) {
                    break;
                }
            }

            let recycledView, slot;
            if (firstFreeSlot < busySlotsLength) {
                // We actually found a spot for this item.
                recycledView = this.views.base[firstFreeSlot];
                slot = firstFreeSlot;

                // This is now officially busy.
                busySlots[slot] = true;
            }
            else {
                ++newSlots;
                recycledView = new RecycledView();
                slot = this.views.length;
                this.views.push(recycledView);
            }

            newItemById[id] = slot;

            recycledView.layoutItem = item;
        }

        if (!newSlots) {
            // All done, now we can hide any unused slots.
            for (let i = 0; i < busySlotsLength; ++i) {
                if (!busySlots[i]) {
                    // this item is not busy. free it from the display list.
                    var view = this.views.base[i];
                    view.layoutItem = null;
                }
            }
        }
        else {
            // console.log("Created ", newSlots, " slots");
        }

        this.itemById = newItemById;
    }

    render() {
        return <using value={ this.view } as={ ItemView }>
            <repeat collection={ this.views } as={ view }>
                <ItemView layoutItem={ view.layoutItem } />
            </repeat>
        </using>;
    }

}
