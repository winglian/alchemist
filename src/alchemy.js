define(['alchemist', 'enquire', 'lodash'], function(Alchemist, enquire, _) {

  var children = [];
  var init = function() {
    // locate candidate image elements in the DOM
    var demo = document.getElementById('demo_img');
    var els = [demo];
    // bind a new Alchemist to each of these image elements
    _(els).forEach(function(el) {
      var alkemist = new Alchemist(el);
      children.push(alkemist);
    });

    _([1,2,3,4,5,6,7]).forEach(function(quality) {
      (function(quality) {
        var ems = 10 + quality * 10;
        enquire.register("screen and (min-width: " + ems + "em)", {
          match: function() {
            _(children).forEach(function(alchemist){
              alchemist.upgradeTarget(quality);
            });
          }
        });
      })(quality);
    });
  };

  getChildren = function() {
    return children;
  };

  return {
    init: init,
    getChildren: getChildren
  };

});
