# Twist Virtual Scroller

[![Build Status](https://travis-ci.org/adobe/twist-virtual-scroller.svg?branch=master)](https://travis-ci.org/adobe/twist-virtual-scroller) [![Greenkeeper badge](https://badges.greenkeeper.io/adobe/twist-virtual-scroller.svg)](https://greenkeeper.io/)

This is a library containing a virtual scroller component for [Twist](https://github.com/adobe/twist), including some example layout algorithms such as Knuth-Plass.

See the [twist-virtual-scroller documentation](docs/index.md) for usage and API details.

## Setup

To use the virtual scroller in your Twist application, you'll need to install `@twist/virtual-scroller` from NPM, and also add it to the libraries in your `.twistrc` file. For example, if you're using [React-Twist](https://github.com/adobe/react-twist) with the virtual scroller, a minimal `.twistrc` file will look like:

```json
{
    "libraries": [
        "@twist/react",
        "@twist/virtual-scroller"
    ]
}
```

Note that the virtual scroller provides UI components, and so requires an implementation of Twist components - this means that it can't be used just with Twist core, but requires a framework implementation, like [React-Twist](https://github.com/adobe/react-twist).

## Example

To play with the example in this repo, run:

```
npm install
npm run watch
```

Then go to `http://localhost:9000/` in your browser.
