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

const SHORT_THRESHOLD = 0.5;
const SNAP_POINTS = [ [ 1, 4, 1.0 ], [ 1, 3, 1.0 ], [ 1, 2, 1.25 ], [ 2, 3, 1.0 ], [ 3, 4, 1.0 ] ];

export default class KnuthPlass {

    constructor(getAspectRatio) {
        this.getAspectRatio = getAspectRatio;
    }

    _calculateBadness(availableWidth, contentWidth, isLast, shortLastLinePenalty) {
        var badness, isShort;
        if (contentWidth < availableWidth * 0.1) {
            return 1000;
        }
        else {
            badness = this._calculateDelta(availableWidth, contentWidth);
            isShort = contentWidth < availableWidth * SHORT_THRESHOLD;
            if (isShort) {
                if (isLast) {
                    badness *= shortLastLinePenalty;
                }
                else {
                    badness += (availableWidth - contentWidth) / availableWidth;
                }
            }
            return badness;
        }
    }

    _calculateDelta(availableWidth, contentWidth) {
        var delta;
        delta = contentWidth - availableWidth;
        if (contentWidth < availableWidth) {
            delta /= contentWidth;
        }
        else {
            delta /= availableWidth;
        }
        return delta * delta;
    }

    _calculateShortLastLinePenalty(assets, rowWidth, cellHeight) {
        let numAssets = assets.length;
        let minCells = 0;
        let maxCells = 2 * Math.ceil(rowWidth / cellHeight);
        for (var i = 0, k = 0, ref = Math.min(maxCells, numAssets - 1); k <= ref; i = k += 1) {
            let asset = assets[numAssets - 1 - i];
            let width = this.getAspectRatio(asset) * cellHeight;
            if (width >= rowWidth) {
                break;
            }
        }
        let penalty = (i - minCells) / (maxCells - minCells);
        return penalty * penalty;
    }

    calculateBreaks(assets, rowWidth, cellGap, cellHeight) {
        let minCellWidth = cellHeight * 0.80;
        let numAssets = assets.length;
        let maxCellWidth = rowWidth * 1.1;
        let shortLastLinePenalty = this._calculateShortLastLinePenalty(assets, rowWidth, cellHeight);
        let totalWidth = new Array(numAssets);
        let width = 0;
        for (let i = 0, k = 0, len = assets.length; k < len; i = ++k) {
            let asset = assets[i];
            let aspectRatio = this.getAspectRatio(asset);
            width += Math.max(minCellWidth, Math.min(maxCellWidth, aspectRatio * cellHeight));
            totalWidth[i] = width;
        }
        let bestBadness = new Array(numAssets);
        let bestBreak = new Array(numAssets);
        for (let i = 0, l = 0, len1 = assets.length; l < len1; i = ++l) {
            let isLast = i === numAssets - 1;
            let contentWidth = i === 0 ? totalWidth[i] : totalWidth[i] - totalWidth[i - 1];
            let currentBestBadness = i === 0 ? 0 : bestBadness[i - 1];
            currentBestBadness += this._calculateBadness(rowWidth, contentWidth, isLast, shortLastLinePenalty);
            let currentBestBreak = i - 1;
            let availableWidth = rowWidth;
            for (let j = i - 2, m = j; m >= -1; j = m += -1) {
                availableWidth -= cellGap;
                if (availableWidth <= 0) {
                    break;
                }
                if (j === -1) {
                    contentWidth = totalWidth[i];
                }
                else {
                    contentWidth = totalWidth[i] - totalWidth[j];
                }
                let numCells = i - j;
                if (numCells >= 5 && availableWidth * 2 < contentWidth) {
                    break;
                }
                let badness = 0;
                if (j > -1) {
                    badness += bestBadness[j];
                }
                badness += this._calculateBadness(availableWidth, contentWidth, isLast, shortLastLinePenalty);
                if (badness < currentBestBadness) {
                    currentBestBadness = badness;
                    currentBestBreak = j;
                }
            }
            bestBadness[i] = currentBestBadness;
            bestBreak[i] = currentBestBreak;
        }
        let breaks = [];
        let currentBreak = numAssets - 1;
        while (currentBreak >= 0) {
            breaks.unshift(currentBreak);
            currentBreak = bestBreak[currentBreak];
        }
        let widths = [];
        let previousBreak = -1;
        for (let o = 0, len2 = breaks.length; o < len2; o++) {
            currentBreak = breaks[o];
            if (previousBreak === -1) {
                width = totalWidth[currentBreak];
            }
            else {
                width = totalWidth[currentBreak] - totalWidth[previousBreak];
            }
            widths.push(width);
            previousBreak = currentBreak;
        }
        return [ breaks, widths ];
    }

    calculateRowLayout(assets, contentWidth, rowWidth, startPosition, endPosition, cellGap, cellHeight, snapThreshold) {
        if (snapThreshold === null || snapThreshold === undefined) {
            snapThreshold = 0.05;
        }
        let minCellWidth = 0.80 * cellHeight;
        let numAssets = assets.length;
        let aspectRatios = new Array(numAssets);
        for (let i = 0, k = 0, len = assets.length; k < len; i = ++k) {
            let asset = assets[i];
            aspectRatios[i] = this.getAspectRatio(asset);
        }
        let minAspectRatio = Math.min.apply(Math, aspectRatios);
        let maxAspectRatio = Math.max.apply(Math, aspectRatios);
        let availableWidth = (endPosition - startPosition) - (numAssets - 1) * cellGap;
        let shortThresholdWidth = availableWidth * SHORT_THRESHOLD;
        let isShort = contentWidth < shortThresholdWidth;
        let subdivisions = 0;
        if (minAspectRatio > 0.95 * maxAspectRatio) {
            subdivisions = numAssets;
            if (isShort) {
                let averageCellWidth = contentWidth / numAssets;
                let n = Math.floor(availableWidth / averageCellWidth);
                if (n >= numAssets) {
                    if (this._calculateDelta(availableWidth, averageCellWidth * n) < this._calculateDelta(availableWidth, averageCellWidth * (n + 1))) {
                        subdivisions = n;
                    }
                    else {
                        subdivisions = n + 1;
                    }
                }
                if (averageCellWidth * subdivisions < shortThresholdWidth) {
                    subdivisions = 0;
                }
            }
        }
        if (subdivisions > 0) {
            let widths = new Array(numAssets);
            let evenCellWidth = availableWidth / subdivisions;
            let x = startPosition;
            let width;
            for (let i = 0, l = 0, ref = numAssets - 1; l <= ref; i = l += 1) {
                width = Math.round(startPosition + (i * cellGap) + (i + 1) * evenCellWidth) - x;
                widths[i] = width;
                x += width + cellGap;
            }
            if (subdivisions === numAssets) {
                widths[numAssets - 1] = endPosition - (x - width - cellGap);
            }
            return widths;
        }
        if (isShort) {
            let widths = new Array(numAssets);
            for (let i = 0, m = 0, len1 = assets.length; m < len1; i = ++m) {
                let asset = assets[i];
                widths[i] = Math.floor(this.getAspectRatio(asset) * cellHeight);
            }
            return widths;
        }
        let totalWidth = new Array(numAssets);
        let width = 0;
        for (let i = 0, o = 0, len2 = aspectRatios.length; o < len2; i = ++o) {
            let aspectRatio = aspectRatios[i];
            width += Math.max(minCellWidth, Math.min(aspectRatio * cellHeight, rowWidth * 1.1));
            totalWidth[i] = width;
        }
        let totalMinimumWidth, scale;
        if (contentWidth < availableWidth) {
            totalMinimumWidth = (minCellWidth * numAssets) * 0.75;
            scale = (availableWidth - totalMinimumWidth) / (contentWidth - totalMinimumWidth);
        }
        else {
            totalMinimumWidth = 0;
            scale = availableWidth / contentWidth;
        }
        let bestSnapPosition;
        let bestSnapDelta = snapThreshold * rowWidth;
        let bestSnapIndex = -1;
        for (let i = 0, p = 0, ref1 = numAssets - 2; p <= ref1; i = p += 1) {
            let minimumWidth = (totalMinimumWidth / numAssets) * (i + 1);
            let cellEndPosition = startPosition + minimumWidth + (i * cellGap) + scale * (totalWidth[i] - minimumWidth);
            for (let q = 0, len3 = SNAP_POINTS.length; q < len3; q++) {
                let snap = SNAP_POINTS[q];
                let numerator = snap[0];
                let denominator = snap[1];
                let deltaAdjust = snap[2];
                let snapPosition = Math.round((numerator / denominator) * (rowWidth - (denominator - 1) * cellGap) + (numerator - 1) * cellGap);
                let snapDelta = Math.abs(cellEndPosition - snapPosition) / deltaAdjust;
                if (snapDelta < bestSnapDelta) {
                    bestSnapPosition = snapPosition;
                    bestSnapDelta = snapDelta;
                    bestSnapIndex = i;
                }
            }
        }
        if (bestSnapIndex >= 0) {
            let leftAssets = assets.slice(0, bestSnapIndex + 1);
            let rightAssets = assets.slice(bestSnapIndex + 1);
            let leftSnapFraction = (bestSnapPosition - startPosition) / (endPosition - startPosition);
            let rightSnapFraction = (endPosition - bestSnapPosition) / (endPosition - startPosition);
            let leftSnapThreshold = snapThreshold * leftSnapFraction * (2 - leftSnapFraction);
            let rightSnapThreshold = snapThreshold * rightSnapFraction * (2 - rightSnapFraction);
            let leftWidths = this.calculateRowLayout(leftAssets, totalWidth[bestSnapIndex], rowWidth, startPosition, bestSnapPosition, cellGap, cellHeight, leftSnapThreshold);
            let rightWidths = this.calculateRowLayout(rightAssets, totalWidth[numAssets - 1] - totalWidth[bestSnapIndex], rowWidth, bestSnapPosition + cellGap, endPosition, cellGap, cellHeight, rightSnapThreshold);
            return leftWidths.concat(rightWidths);
        }
        let widths = new Array(numAssets);
        let x = startPosition;
        for (let i = 0, r = 0, ref2 = numAssets - 2; r <= ref2; i = r += 1) {
            let minimumWidth = (totalMinimumWidth / numAssets) * (i + 1);
            width = Math.round(startPosition + minimumWidth + (i * cellGap) + scale * (totalWidth[i] - minimumWidth)) - x;
            widths[i] = width;
            x += width + cellGap;
        }
        widths[numAssets - 1] = endPosition - x;
        return widths;
    }
}
