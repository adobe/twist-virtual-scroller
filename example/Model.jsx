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

import { ObservableArray } from '@twist/core';

var groupCount = 100;
var groupSize = 50;

class Item {
    constructor(id, text, aspectRatio) {
        this.id = id;
        this.text = text;
        this.aspectRatio = aspectRatio;
    }

    @Observable id;
    @Observable text;
    @Observable aspectRatio;
}

class Group {
    constructor(id) {
        this.id = id;
        this.items = new ObservableArray;
    }

    @Observable id;
    @Observable items;
}

export default class Model {
    @Observable groups;

    constructor() {
        this.groups = new ObservableArray;

        for (let groupId = 0; groupId < groupCount; groupId++) {
            let group = new Group(groupId);
            this.groups.push(group);

            for (let id = groupId * groupSize, max = (groupId + 1) * groupSize; id < max; id++) {
                group.items.push(new Item(id, `Photo ${id}`, Math.random() + 1));
            }
        }
    }

    moveItems(items, itemBefore, itemAfter) {
        let beforeId = itemBefore ? itemBefore.data._id : null;
        let afterId = itemAfter ? itemAfter.data._id : null;
        let itemIds = new Set(items.map((item) => item.id));

        this.groups.forEach((group) => {
            let groupItems = group.items;
            let insertAtBeginning = groupItems.at(0).id === afterId;
            for (var i = groupItems.length - 1; i >= 0; i--) {
                let item = groupItems.at(i);
                if (itemBefore && item.id === beforeId) {
                    groupItems.splice(i + 1, 0, ...items);
                }
                if (itemIds.has(item.id)) {
                    groupItems.splice(i, 1);
                }
            }
            if (insertAtBeginning) {
                groupItems.unshift(...items);
            }
        });
    }
}
