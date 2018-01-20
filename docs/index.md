# Virtual Scrolling in Twist

The [twist-virtual-scroller](https://github.com/adobe/twist-virtual-scroller) library provides a virtual scrolling component for Twist. This allows you to render huge scrolling lists of tens of thousands of items, without any performance problems.

The idea behind virtual scrolling is to only render the items that are visible on the screen at any moment in time. We don't, however, want to reposition the items from JavaScript on every scroll event, because we won't be able to keep up with the framerate - if the browser has to call into JavaScript for us to update all the positions, there will be a delay before the changes to the DOM get rendered on screen, and that leads to a noticeable lag.

At a high level, the virtual scroller works as follows:

1. You implement a layout algorithm in terms of _virtual items_ - basically, the data model for the list/grid. The virtual scroller includes the [Knuth-Plass algorithm](https://en.wikipedia.org/wiki/Line_wrap_and_word_wrap) as one example, but you can implement your own. The result of this layout is that every item has a size and position relative to the content container (_not_ the viewport).
2. You provide a mapping from virtual items to actual items - the virtual scroller handles the instantiation of the actual items.
3. The virtual scroller looks at the viewport and renders all the items that are actually in view (plus some buffer around it), adding them to the DOM. These are positioned using _absolute positioning_, relative to the content container.
4. As you scroll, the browser handles re-rendering, because the positions are constraint based - this is really fast, because it's using the GPU. At the same time, the virtual scroller sits there, listening for changes to the scroll position (and resize events). When the scroll position gets to the point when new items will become visible, the virtual scroller renders them and adds them to the DOM, as well as removing any items that have gone out of view.

A good way to imagine the virtual scroller, is to imagine you're looking down on a conveyor belt in a cupcake factory - you can only see a small portion of the conveyor belt, and to you it looks like a continuous stream of cupcakes passing by. For all you know, the conveyor belt could be going on forever. But actually, there are people at the beginning of the conveyor belt putting new cupcakes on, and people at the end taking them off - so there are really only a constant number of cupcakes on the conveyor belt at any one time.

## Overview

TODO
