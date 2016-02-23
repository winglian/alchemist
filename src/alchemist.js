define(['lodash'], function(_) {
  // TODO curry a function that already knows if this is a HiDPI/Retina screen
  var Alchemist = function(el) {
    this.target = el;
    this.img_buffer_data = new Uint8Array();
    this.img_buffer_len = 0;
    this.getTarget = function() {
      return this.target;
    };
    this.img_api_data = {};

    this._upgradeTarget = function(quality) {
      // get the target's current quality
      var self = this;
      var current_quality = this.target.getAttribute('data-quality');
      if (quality <= current_quality)
        return;
      // get the id or url of the target
      var img_id = this.target.getAttribute('data-src-id');
      // TODO replace me with something scalable
      var url = 'http://gingerbeer.dvlpr.me/img/' + current_quality + '/' + quality + '/' + img_id;
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.responseType = 'arraybuffer';
      xhr.addEventListener('load', function () {
        if (xhr.status === 200 || xhr.status == 206) {
          var oldBufferView = self.img_buffer_data;
          var arrayBufferView = new Uint8Array(xhr.response);
          self.img_buffer_len = oldBufferView.length + arrayBufferView.length;
          self.img_buffer_data = new Uint8Array(self.img_buffer_len);
          self.img_buffer_data.set(oldBufferView, 0);
          self.img_buffer_data.set(arrayBufferView, oldBufferView.length);
          var blob = new Blob([self.img_buffer_data], {'type': 'image\/jpeg'});
          var objectURL = window.URL.createObjectURL(blob);
          self.target.setAttribute('data-quality', quality);
          self.target.src = objectURL;
        }
      }, false);
      xhr.send();
    };
    this.upgradeTarget = _.debounce(this._upgradeTarget, 300, {trailing: true, maxWait: 600});


    window.addEventListener('resize', function(e) {
      console.log(e);
    });
    _.bindAll();
  };

  return Alchemist;
});
