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

import LayoutContainer from './LayoutContainer';

/**
 * A layout that positions its children on top of each another, completely covering its area.
 */
@VirtualComponent
export default class OverlappingLayout extends LayoutContainer {

    updateLayout(width, height) {
        this.width = 0;
        this.height = 0;
        this.children.forEach((item) => {
            item.parent = this;
            item.layout(this.left, this.top, width, height);
            this.width = Math.max(this.width, item.width);
            this.height = Math.max(this.height, item.height);
        });

        super.updateLayout(width, height);
    }

}
