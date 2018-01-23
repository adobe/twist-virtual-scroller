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

import PlaceholderItem from './PlaceholderItem';

/**
 * A LazyItem can be used to hold space for an element that needs to load asynchronously.
 * When its loader's promise resolves, the placeholder space is replaced with the actual children of the LazyItem.
 */
@Component
export default class LazyItem {

    /** The width of the placeholder item. */
    @Attribute lazyWidth = -1;
    /** The height of the placeholder item. */
    @Attribute lazyHeight = -1;

    /**
     * A function that accepts one argument -- a Promise that will be resolved when the loader needs to abort --
     * and returns a promise that will resolve when the item has finished loading.
     *
     * @example
     *     function myLoader(reject) {
     *         reject.then(() => this.abortRequest());
     *         return this.startRequest();
     *     }
     *
     * @type {function(reject: Promise) => Promise}
     */
    @Attribute loader;
    @Observable data;

    @Observable loading = false;
    @Observable expanded = false;

    /**
     * Begin the loading process, if necessary. This function is called whenever this item is added to the
     * visible list, which may occur many times while in view, so it must be careful to not fire multiple requests.
     */
    expand() {
        if (this.expanded || this.loading) {
            return;
        }

        var loader = this.loader;
        if (!loader) {
            this.expanded = true;
            return;
        }

        this.loading = true;
        let abortPromise = new Promise(resolve => this.abortLoading = resolve);
        loader(abortPromise).then((data) => {
            if (this.isDisposed) {
                // Too late ignore the result.
                return;
            }
            this.data = data;
            this.abortLoading = null;
            this.loading = false;
            this.expanded = true;
        }, (err) => {
            if (err) {
                console.error(err);
            }
        });
    }

    /**
     * Abort the loading process, usually because the view is no longer visible.
     */
    stop() {
        if (this.abortLoading) {
            this.abortLoading();
            this.abortLoading = null;
            this.loading = false;
        }
    }

    dispose() {
        super.dispose();
        this.stop();
    }

    render() {
        return <g>
            <if condition={ this.expanded }>
                { this.renderChildren([ this.data ]) }
            </if>
            <else>
                <PlaceholderItem
                    onExpand={ this.expand() }
                    onStop={ this.stop() }
                    lazyWidth={ this.lazyWidth }
                    lazyHeight={ this.lazyHeight } />
            </else>
        </g>;
    }

}
