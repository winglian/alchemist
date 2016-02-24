const Alchemist = (function(_) {
  //'use strict';

  const TRANSPARENT_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNgYAAAAAMA' +
    'ASsJTYQAAAAASUVORK5CYII=';

  const AlchemistPrototype = Object.create(HTMLImageElement.prototype);

  const concatenateBuffers = function(b1, b2) {
    const newBuffer = new Uint8Array(b1.length + b2.length);
    newBuffer.set(b1, 0);
    newBuffer.set(b2, b1.length);

    return newBuffer;
  };

  AlchemistPrototype.getSrcMeta = function() {
    // fire off a HEAD request to the src and grab the X-Alchemist-Meta-Json header
    const xhr = new XMLHttpRequest();
    const self = this;
    xhr.open('HEAD', this._src);
    xhr.addEventListener('load', function() {
      const metaHeaderJson = xhr.getResponseHeader('x-amz-meta-alchemist');
      // parse the header as json and store in srcMeta
      self.srcMeta = JSON.parse(metaHeaderJson);
      self.loadInitialData();
    });
    xhr.send();
  };

  AlchemistPrototype.onResizeHandler = function(e) {
    const self = this;
    // get the width of this in pixels and compare to the meta we have
    const width = this.width;
    // TODO account for Retina/HiDPI?
    // calculate the % width of the current size to the actual image size
    const actualWidth = this.naturalWidth;
    var relativeWidth = width / actualWidth;
    // clamp relative width from (0,1];
    relativeWidth = Math.min(1, relativeWidth);
    relativeWidth = Math.max(0.01, relativeWidth);
    var nextRange;
    // multiply the % width to the image size
    var neededBytes = Math.ceil(relativeWidth * this.srcMeta.contentLength);
    if (neededBytes <= this.buffer.length) {
      return;
    }
    // use the next largest scan byte range
    for (var i = 0; i < this.srcMeta.sos.length; i++) {
      nextRange = this.srcMeta.sos[i];
      if (nextRange >= neededBytes) {
        break;
      }
    }
    if (nextRange < neededBytes) {
      nextRange = this.srcMeta.contentLength + 1;
    }
    // fire off an xhr for the required byte ranges
    this.getSrcDataRange(this.buffer.length, nextRange - 1, function(err, buffer) {
      // concatenate the image buffer we already have cached with the xhr response
      self.buffer = concatenateBuffers(self.buffer, buffer);
      var bufferToRender = self.buffer;
      if (nextRange < self.srcMeta.contentLength) {
        // set src with new buffer data and append 0xFFD9 bytes if necessary
        const eoiBuffer = new Uint8Array(0xFFD9);
        bufferToRender = concatenateBuffers(self.buffer, eoiBuffer)
      }
      // set src with new buffer data and append 0xFFD9 bytes if necessary
      self.src = window.URL.createObjectURL(new Blob([bufferToRender], {type: 'image\/jpeg'}));
      if (nextRange >= self.srcMeta.contentLength) {
        // if we now have the full image, remove the onResize listener
        self.removeEventListener(self.thisResizeListener);
        window.removeEventListener(self.windowResizeListener);
      }
    });
  };

  AlchemistPrototype.loadInitialData = function() {
    const self = this;

    // fire off an xhr for the required byte ranges
    this.getSrcDataRange(0, this.srcMeta.sos[1] - 1, function(err, buffer) {
      if (err) {
        return self.handleError(err);
      }
      // concatenate the image buffer we already have cached with the xhr response
      self.buffer = concatenateBuffers(self.buffer, buffer);
      const eoiBuffer = new Uint8Array(0xFFD9);
      // set src with new buffer data and append 0xFFD9 bytes if necessary
      self.src = window.URL.createObjectURL(new Blob([concatenateBuffers(self.buffer, eoiBuffer)], {type: 'image\/jpeg'}));
      // finally fire off resize event so we load enough data appropriate for the current viewport
      var resizeEvent;
      if (UIEvent) {
        resizeEvent = new UIEvent('resize');
      } else {
        resizeEvent = window.document.createEvent('UIEvents');
        resizeEvent.initUIEvent('resize', true, false, window, 0);
      }
      self.dispatchEvent(resizeEvent);
    });
  };

  AlchemistPrototype.getSrcDataRange = function(rangeStart, rangeEnd, callback) {
    const xhr = new XMLHttpRequest();

    xhr.open('GET', this._src, true);
    xhr.responseType = 'arraybuffer';
    xhr.setRequestHeader('Range', 'bytes=' + rangeStart + '-' + rangeEnd);
    xhr.addEventListener('load', function () {
      if (xhr.status === 200 || xhr.status == 206) {
        const arrayBufferView = new Uint8Array(xhr.response);
        return callback(null, arrayBufferView);
      }
    }, false);
    xhr.send();
  };

  AlchemistPrototype.createdCallback = function() {
    // Load in a transparent PNG for now
    this._src = this.src;
    this.src = TRANSPARENT_PNG;
    this.buffer = new Uint8Array(0);
    this.srcMeta = {};
    const debouncedResizeHandler = _.debounce(this.onResizeHandler.bind(this), 100, {maxWait: 500});
    this.thisResizeListener = this.addEventListener('resize', debouncedResizeHandler); // TODO debounce
    this.windowResizeListener = window.addEventListener('resize', debouncedResizeHandler); // TODO debounce
    this.getSrcMeta();
  };

  AlchemistPrototype.attachedCallback = function() {
  };

  AlchemistPrototype.detachedCallback = function() {
    // eh, do we really care about this?
  };

  AlchemistPrototype.attributeChangedCallback = function() {
    // other than src, do we really care about this either?
    // let's assume for now src value isn't gonna change
  };

  return document.registerElement('x-alchemist', {
    prototype: AlchemistPrototype,
    extends: 'img'
  });

})(_);