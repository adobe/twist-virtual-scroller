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

import BaseLayoutComponent from '../BaseLayoutComponent';

/**
 * PlaceholderItem is used internally by {@link LazyLoader} as a view that merely "holds space"
 * for its loading item.
 * @protected
 */
@VirtualComponent({ events: [ 'expand', 'stop' ] })
export default class PlaceholderItem extends BaseLayoutComponent {

    @Attribute lazyWidth = -1;
    @Attribute lazyHeight = -1;

    constructor() {
        super();
        this.layoutAttributes(() => this.lazyWidth, () => this.lazyHeight);
    }

    expand() {
        this.trigger('expand');
        return true;
    }

    stopPendingItem() {
        this.trigger('stop');
    }

    updateLayout(width, height) {
        var lazyWidth = this.lazyWidth;
        var lazyHeight = this.lazyHeight;
        this.width = lazyWidth === -1 ? width : lazyWidth;
        this.height = lazyHeight === -1 ? height : lazyHeight;
    }

}
