/*
 *  Copyright 2017 Adobe Systems Incorporated. All rights reserved.
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

/* global describe it afterEach */

import assert from 'assert';
import { render } from '@twist/react/test-utils';
import { ObservableArray, TaskQueue } from '@twist/core';
import RecyclerView from '@twist/virtual-scroller/src/ui/internal/RecyclerView';

@Component
class RecycledView {
    @Attribute layoutComponent;
    render() {
        return <div>{ this.layoutComponent || '-' }</div>;
    }
}

describe('RecyclerView', () => {

    afterEach(() => {
        render.dispose();
    });

    it('recycles views', () => {
        const collection = new ObservableArray([ 1, 2, 3 ]);
        const domNode = render(<RecyclerView capacity={4} view={RecycledView} collection={collection} />);

        // Four views should be created, even though we only have three items.
        assert.equal(domNode.outerHTML, `<div><div>1</div><div>2</div><div>3</div><div>-</div></div>`);
        collection.push(4);
        TaskQueue.run();

        // Adding a fourth replaces the last item's contents.
        assert.equal(domNode.outerHTML, `<div><div>1</div><div>2</div><div>3</div><div>4</div></div>`);

        collection.pop();
        TaskQueue.run();

        // Removing the last item reverts it to an unused state.
        assert.equal(domNode.outerHTML, `<div><div>1</div><div>2</div><div>3</div><div>-</div></div>`);

        collection.push(4);
        collection.push(5);
        TaskQueue.run();

        // Expanding it past its capacity causes it to add additional views.
        assert.equal(domNode.outerHTML, `<div><div>1</div><div>2</div><div>3</div><div>4</div><div>5</div></div>`);
    });
});
