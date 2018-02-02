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

import { StickyItem } from '@twist/virtual-scroller';

/**
 * UI view for a group header
 */
@ViewComponent
export class GroupHeaderView {

    getContainerStyle() {
        return {
            'backgroundColor': 'rgba(0, 0, 0, 0.3)',
            'color': 'white',
            'fontWeight': 'bold'
        };
    }

    render() {
        return this.renderContainer(
            <div>{ this.layoutItem ? this.layoutItem.data.text : null }</div>
        );
    }
}

/**
 * Virtual component (for layout) for a group header
 */
@LayoutComponent({ view: GroupHeaderView })
export default class GroupHeaderItem extends StickyItem {
}
