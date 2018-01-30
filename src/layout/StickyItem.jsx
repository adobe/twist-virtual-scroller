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

import BaseLayoutComponent from './BaseLayoutComponent';

/**
 * An item that "sticks" itself to the top of the viewport when it reaches the top.
 */
@Prototype({ sticky: true })
@VirtualComponent
export default class StickyItem extends BaseLayoutComponent {

    @Observable fixed = false;
    @Observable fixedLeft = 0;
    @Observable fixedTop = 0;

    @Attribute stickyWidth = -1;
    @Attribute stickyHeight = -1;

    constructor() {
        super();
        this.layoutAttributes(() => this.stickyWidth, () => this.stickyHeight);
    }

    updateLayout(width, height) {
        var stickyWidth = this.stickyWidth;
        var stickyHeight = this.stickyHeight;
        this.width = stickyWidth === -1 ? width : stickyWidth;
        this.height = stickyHeight === -1 ? height : stickyHeight;
    }

}
