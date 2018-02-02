# Virtual Scrolling in Twist

The [twist-virtual-scroller](https://github.com/adobe/twist-virtual-scroller) library provides a virtual scrolling component for Twist. This allows you to render huge scrolling lists of tens of thousands of items, without any performance problems.

The idea behind virtual scrolling is to only render the items that are visible on the screen at any moment in time. We don't, however, want to reposition the items from JavaScript on every scroll event, because we won't be able to keep up with the framerate - if the browser has to call into JavaScript for us to update all the positions, there will be a delay before the changes to the DOM get rendered on screen, and that leads to a noticeable lag.

At a high level, the virtual scroller works as follows:

1. You implement a layout algorithm in terms of _virtual layout components_ - basically, the data model for the list/grid. The virtual scroller various built-in layout components, such as a list, grid, and [Knuth-Plass](https://en.wikipedia.org/wiki/Line_wrap_and_word_wrap) layout, but you can also implement your own. The result of this layout is that every item has a size and position relative to the content container (_not_ the viewport).
2. The leaf layout components have a corresponding view component, that you declare when you define the class - for example `@LayoutComponent({ view: PhotoView }) class Photo { ... }`. This tells the virtual scroller what view to use (`PhotoView`) when one of the "virtual" layout items (`Photo`) is visible.
3. The virtual scroller looks at the viewport and renders all the items that are actually in view (plus some buffer around it), adding them to the DOM. These are positioned using _absolute positioning_, relative to the content container.
4. As you scroll, the browser handles re-rendering, because the positions are constraint based - this is really fast, because it's using the GPU. At the same time, the virtual scroller sits there, listening for changes to the scroll position (and resize events). When the scroll position gets to the point when new items will become visible, the virtual scroller renders them and adds them to the DOM, as well as removing any items that have gone out of view.

A good way to imagine the virtual scroller, is to imagine you're looking down on a conveyor belt in a cupcake factory - you can only see a small portion of the conveyor belt, and to you it looks like a continuous stream of cupcakes passing by. For all you know, the conveyor belt could be going on forever. But actually, there are people at the beginning of the conveyor belt putting new cupcakes on, and people at the end taking them off - so there are really only a constant number of cupcakes on the conveyor belt at any one time.

## API Overview

To use the virtual scroller, you start with the `VirtualScroll` component - this has quite a few configuration attributes, but the most important is telling it which directions you want to scroll in - via the `verticalScroll` and `horizontalScroll` attributes.

```js
import { VirtualScroll } from '@twist/virtual-scroller';

@Component
class MyView {
    render() {
        return <VirtualScroll verticalScroll={ true }>
           ...
        </VirtualScroll>;
    }
}
```

At this point, we have a vertically (top-down) scrolling view, but no content. The content is provided via layout components in JSX, but first we need to define the "leaf" items that we want to layout. There are two types of component you need to define:

* A `@LayoutComponent` is used inside the `<VirtualScroll/>` component to render the layout - this is just an in-memory JavaScript model, and doesn't correspond to anything on the DOM.
* Each layout component has a corresponding `@ViewComponent` that _does_ get rendered to the DOM. It's important to remember that view components get _reused_ as you scroll up and down - but only by layout components of the same type.

Here's a really simple example:

```js
@ViewComponent
class TODOItemView {
    render() {
        // We call renderContainer to render the given view in a container with the right positioning.
        return this.renderContainer(
            <div>{ this.layoutItem && this.layoutItem.data.description }</div>
        );
    }
}

@LayoutComponent({ view: ViewComponent })
class TODOItem {
}
```

Note that the layout component registers its view component via the `view` decorator option (`@LayoutComponent({ view: ... })`), and the view component gets its corresponding layout component via the `layoutItem` attribute. You pass data to the layout component via the `data` attribute.

Here's an example of a scrolling list of items:

```js
import { VirtualScroll, VerticalListLayout } from '@twist/virtual-scroller';

@Component
class MyView {
    render() {
        return <VirtualScroll verticalScroll={ true }>
            <VerticalListLayout>
                <repeat for={ item in this.todoItems }>
                    <TODOItem data={ item }/>
                <repeat>
            </VerticalListLayout>
        </VirtualScroll>;
    }
}
```

Notice that we _only_ use the layout component `TODOItem` here - the instantiation of the view component (`TODOItemView`) is handled by the virtual scroller.

### Layout Components

The virtual scroller comes with some built-in layout components:

* `VerticalListLayout` - A list of items that grows vertically (each item is full-width, and placed below the previous item).
* `HorizontalListLayout` - A list of items that grows horizontally (each item is full-height, and placed to the right of the previous item).
* `VerticalGridLayout` - A grid of fixed-size items that grows vertically (after filling a row of items, it moves to the next row below it).
* (TODO) `HorizontalGridLayout` - A grid of fixed-size items that grows horizontally (after filling a column of items, it moves to the next column to the right).
* `VerticalKnuthPlassLayout` - A [Knuth-Plass](https://en.wikipedia.org/wiki/Line_wrap_and_word_wrap) layout that grows vertically (it lays out variable-width items in rows, determining reasonable line breaks). Each row is a fixed height, but the items in a row have variable widths.
* `VerticalKnuthPlassLayout` - A Knuth-Plass layout that grows horizontally (it lays out variable-height items in columns, determining reasonable line breaks). Each column is a fixed with, but the items in a column have variable heights.

There's also a useful component called `LazyLoader` that allows you to lazily load content - this adds a fixed-size placeholder, and gives you a callback when the placeholder comes into view - at that point you can provide the actual items (e.g. if you need to fetch data from a server), and replace the placeholder with the actual layout of items.

### Sticky Items

Sometimes, you want a header that doesn't scroll with its content, but instead sticks to the top of the view (with the content scrolling underneath it). If you have multiple sections with headers, you want each header to scroll out of the view once you scroll past the end of the content for its section.

The Twist virtual scroller supports this via `StickyItem` - simply extend this when you create your layout component:

```js
import { StickyItem } from '@twist/virtual-scroller';

@LayoutComponent({ view: MyHeaderView })
class MyHeader extends StickyItem {
}
```

### Interaction

You can interact with elements in the virtual scroller (e.g. for click and drag events) in two ways:

1. By adding individual events to the views.
2. By providing an `interactionManager` to the `<VirtualScroll />` component.

The second approach works by listening for events on the scroll container, and then mapping these onto the items they correspond to. This is quite efficient if you want to do dragging within the virtual scroller - and it supports auto-scrolling if you drag to the edges of the view.

Note that if you want to use HTML5 drag-drop events, you need to set `<VirtualScroll allowHtmlDrag={ true } />` - otherwise, the interaction manager will interfere by capturing drag events.
