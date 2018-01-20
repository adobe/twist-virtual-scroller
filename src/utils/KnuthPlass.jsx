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

// Converted from coffeescript using http://coffeescript.org/

var KnuthPlass;

KnuthPlass = (function() {
    KnuthPlass.prototype.SHORT_THRESHOLD = 0.5;

    KnuthPlass.prototype.SNAP_POINTS = [ [ 1, 4, 1.0 ], [ 1, 3, 1.0 ], [ 1, 2, 1.25 ], [ 2, 3, 1.0 ], [ 3, 4, 1.0 ] ];

    function KnuthPlass(getAspectRatio) {
        this.getAspectRatio = getAspectRatio;
    }

    KnuthPlass.prototype._calculateBadness = function(availableWidth, contentWidth, isLast, shortLastLinePenalty) {
        var badness, isShort;
        if (contentWidth < availableWidth * 0.1) {
            return 1000;
        }
        else {
            badness = this._calculateDelta(availableWidth, contentWidth);
            isShort = contentWidth < availableWidth * this.SHORT_THRESHOLD;
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
    };

    KnuthPlass.prototype._calculateDelta = function(availableWidth, contentWidth) {
        var delta;
        delta = contentWidth - availableWidth;
        if (contentWidth < availableWidth) {
            delta /= contentWidth;
        }
        else {
            delta /= availableWidth;
        }
        return delta * delta;
    };

    KnuthPlass.prototype._calculateShortLastLinePenalty = function(assets, rowWidth, cellHeight) {
        var asset, i, k, maxCells, minCells, numAssets, penalty, ref, width;
        numAssets = assets.length;
        minCells = 0;
        maxCells = 2 * Math.ceil(rowWidth / cellHeight);
        for (i = k = 0, ref = Math.min(maxCells, numAssets - 1); k <= ref; i = k += 1) {
            asset = assets[numAssets - 1 - i];
            width = this.getAspectRatio(asset) * cellHeight;
            if (width >= rowWidth) {
                break;
            }
        }
        penalty = (i - minCells) / (maxCells - minCells);
        return penalty * penalty;
    };

    KnuthPlass.prototype.calculateBreaks = function(assets, rowWidth, cellGap, cellHeight) {
        var aspectRatio, asset, availableWidth, badness, bestBadness, bestBreak, breaks, contentWidth, currentBestBadness, currentBestBreak, currentBreak, i, isLast, j, k, l, len, len1, len2, m, maxCellWidth, minCellWidth, numAssets, numCells, o, previousBreak, shortLastLinePenalty, totalWidth, width, widths;
        minCellWidth = cellHeight * 0.80;
        numAssets = assets.length;
        maxCellWidth = rowWidth * 1.1;
        shortLastLinePenalty = this._calculateShortLastLinePenalty(assets, rowWidth, cellHeight);
        totalWidth = new Array(numAssets);
        width = 0;
        for (i = k = 0, len = assets.length; k < len; i = ++k) {
            asset = assets[i];
            aspectRatio = this.getAspectRatio(asset);
            width += Math.max(minCellWidth, Math.min(maxCellWidth, aspectRatio * cellHeight));
            totalWidth[i] = width;
        }
        bestBadness = new Array(numAssets);
        bestBreak = new Array(numAssets);
        for (i = l = 0, len1 = assets.length; l < len1; i = ++l) {
            asset = assets[i];
            isLast = i === numAssets - 1;
            if (i === 0) {
                contentWidth = totalWidth[i];
                currentBestBadness = 0;
            }
            else {
                contentWidth = totalWidth[i] - totalWidth[i - 1];
                currentBestBadness = bestBadness[i - 1];
            }
            currentBestBadness += this._calculateBadness(rowWidth, contentWidth, isLast, shortLastLinePenalty);
            currentBestBreak = i - 1;
            availableWidth = rowWidth;
            for (j = m = i - 2; m >= -1; j = m += -1) {
                availableWidth -= cellGap;
                if (availableWidth <= 0) {
                    break;
                }
                if (j === -1) {
                    contentWidth = totalWidth[i];
                }
                else {
                    numCells = i - j;
                    contentWidth = totalWidth[i] - totalWidth[j];
                }
                numCells = i - j;
                if (numCells >= 5 && availableWidth * 2 < contentWidth) {
                    break;
                }
                badness = 0;
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
        breaks = [];
        currentBreak = numAssets - 1;
        while (currentBreak >= 0) {
            breaks.unshift(currentBreak);
            currentBreak = bestBreak[currentBreak];
        }
        widths = [];
        previousBreak = -1;
        for (o = 0, len2 = breaks.length; o < len2; o++) {
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
    };

    KnuthPlass.prototype.calculateRowLayout = function(assets, contentWidth, rowWidth, startPosition, endPosition, cellGap, cellHeight, snapThreshold) {
        var SNAP_POINTS, aspectRatio, aspectRatios, asset, availableWidth, averageCellWidth, bestSnapDelta, bestSnapIndex, bestSnapPosition, cellEndPosition, deltaAdjust, denominator, evenCellWidth, i, isShort, k, l, leftAssets, leftSnapFraction, leftSnapThreshold, leftWidths, len, len1, len2, len3, m, maxAspectRatio, minAspectRatio, minCellWidth, minimumWidth, n, numAssets, numerator, o, p, q, r, ref, ref1, ref2, rightAssets, rightSnapFraction, rightSnapThreshold, rightWidths, scale, shortThresholdWidth, snap, snapDelta, snapPosition, subdivisions, totalMinimumWidth, totalWidth, width, widths, x;
        if (snapThreshold === null || snapThreshold === undefined) {
            snapThreshold = 0.05;
        }
        SNAP_POINTS = this.SNAP_POINTS;
        minCellWidth = 0.80 * cellHeight;
        numAssets = assets.length;
        aspectRatios = new Array(numAssets);
        for (i = k = 0, len = assets.length; k < len; i = ++k) {
            asset = assets[i];
            aspectRatios[i] = this.getAspectRatio(asset);
        }
        minAspectRatio = Math.min.apply(Math, aspectRatios);
        maxAspectRatio = Math.max.apply(Math, aspectRatios);
        availableWidth = (endPosition - startPosition) - (numAssets - 1) * cellGap;
        shortThresholdWidth = availableWidth * this.SHORT_THRESHOLD;
        isShort = contentWidth < shortThresholdWidth;
        if (minAspectRatio > 0.95 * maxAspectRatio) {
            subdivisions = numAssets;
            if (isShort) {
                averageCellWidth = contentWidth / numAssets;
                n = Math.floor(availableWidth / averageCellWidth);
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
            widths = new Array(numAssets);
            evenCellWidth = availableWidth / subdivisions;
            x = startPosition;
            for (i = l = 0, ref = numAssets - 1; l <= ref; i = l += 1) {
                width = Math.round(startPosition + (i * cellGap) + (i + 1) * evenCellWidth) - x;
                widths[i] = width;
                x += width + cellGap;
            }
            if (subdivisions === numAssets) {
                widths[numAssets - 1] = endPosition - (x - width - cellGap);
            }
        }
        else {
            if (isShort) {
                widths = new Array(numAssets);
                for (i = m = 0, len1 = assets.length; m < len1; i = ++m) {
                    asset = assets[i];
                    widths[i] = Math.floor(this.getAspectRatio(asset) * cellHeight);
                }
            }
            else {
                totalWidth = new Array(numAssets);
                width = 0;
                for (i = o = 0, len2 = aspectRatios.length; o < len2; i = ++o) {
                    aspectRatio = aspectRatios[i];
                    width += Math.max(minCellWidth, Math.min(aspectRatio * cellHeight, rowWidth * 1.1));
                    totalWidth[i] = width;
                }
                if (contentWidth < availableWidth) {
                    totalMinimumWidth = (minCellWidth * numAssets) * 0.75;
                    scale = (availableWidth - totalMinimumWidth) / (contentWidth - totalMinimumWidth);
                }
                else {
                    totalMinimumWidth = 0;
                    scale = availableWidth / contentWidth;
                }
                bestSnapDelta = snapThreshold * rowWidth;
                bestSnapIndex = -1;
                for (i = p = 0, ref1 = numAssets - 2; p <= ref1; i = p += 1) {
                    minimumWidth = (totalMinimumWidth / numAssets) * (i + 1);
                    cellEndPosition = startPosition + minimumWidth + (i * cellGap) + scale * (totalWidth[i] - minimumWidth);
                    for (q = 0, len3 = SNAP_POINTS.length; q < len3; q++) {
                        snap = SNAP_POINTS[q];
                        numerator = snap[0];
                        denominator = snap[1];
                        deltaAdjust = snap[2];
                        snapPosition = Math.round((numerator / denominator) * (rowWidth - (denominator - 1) * cellGap) + (numerator - 1) * cellGap);
                        snapDelta = Math.abs(cellEndPosition - snapPosition) / deltaAdjust;
                        if (snapDelta < bestSnapDelta) {
                            bestSnapPosition = snapPosition;
                            bestSnapDelta = snapDelta;
                            bestSnapIndex = i;
                        }
                    }
                }
                if (bestSnapIndex >= 0) {
                    leftAssets = assets.slice(0, bestSnapIndex + 1);
                    rightAssets = assets.slice(bestSnapIndex + 1);
                    leftSnapFraction = (bestSnapPosition - startPosition) / (endPosition - startPosition);
                    rightSnapFraction = (endPosition - bestSnapPosition) / (endPosition - startPosition);
                    leftSnapThreshold = snapThreshold * leftSnapFraction * (2 - leftSnapFraction);
                    rightSnapThreshold = snapThreshold * rightSnapFraction * (2 - rightSnapFraction);
                    leftWidths = this.calculateRowLayout(leftAssets, totalWidth[bestSnapIndex], rowWidth, startPosition, bestSnapPosition, cellGap, cellHeight, leftSnapThreshold);
                    rightWidths = this.calculateRowLayout(rightAssets, totalWidth[numAssets - 1] - totalWidth[bestSnapIndex], rowWidth, bestSnapPosition + cellGap, endPosition, cellGap, cellHeight, rightSnapThreshold);
                    widths = leftWidths.concat(rightWidths);
                }
                else {
                    widths = new Array(numAssets);
                    x = startPosition;
                    for (i = r = 0, ref2 = numAssets - 2; r <= ref2; i = r += 1) {
                        minimumWidth = (totalMinimumWidth / numAssets) * (i + 1);
                        width = Math.round(startPosition + minimumWidth + (i * cellGap) + scale * (totalWidth[i] - minimumWidth)) - x;
                        widths[i] = width;
                        x += width + cellGap;
                    }
                    widths[numAssets - 1] = endPosition - x;
                }
            }
        }
        return widths;
    };

    return KnuthPlass;

})();

module.exports = KnuthPlass;
