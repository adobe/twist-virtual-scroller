/*
 *  Copyright 2018 Adobe Systems Incorporated. All rights reserved.
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

import DecoratorUtils from '@twist/core/src/internal/utils/DecoratorUtils';

// Supported options of @InteractionManager, with their default values
let DEFAULT_OPTIONS = {
};

export default DecoratorUtils.makeClassDecorator((target, args = {}) => {

    // Set the properties passed in via the @InteractionManager arguments (or use the default value)
    Object.keys(DEFAULT_OPTIONS).forEach(key => {
        let value = args.hasOwnProperty(key) ? args[key] : DEFAULT_OPTIONS[key];
        target.prototype[key] = value;
    });

    // If the user passed in properties we don't recognise, emit a warning
    Object.keys(args).forEach(key => {
        if (!DEFAULT_OPTIONS.hasOwnProperty(key)) {
            console.warn(`${key} is not a valid option for @InteractionManager - ignoring.`);
        }
    });
});
