const touchObj = {
  dir: '',
  diff: 0,

  startX: 0,
  startY: 0,
  startTime: 0,
};

Component({
  externalClasses: ['i-class'],

  properties: {
    threshold: {
      type: Number,
      value: 40,
    },
    requiredOffset: {
      type: Number,
      value: 100,
    },
    restrictOffset: {
      type: Number,
      value: 150,
    },
    restrictTime: {
      type: Number,
      value: 450,
    },
  },

  methods: {
    onTouchStart: function (e) {
      const { pageX, pageY } = e.changedTouches[0];

      touchObj.startX = pageX;
      touchObj.startY = pageY;
      touchObj.startTime = +new Date();

      touchObj.dir = '';
      touchObj.diff = 0;
    },

    onTouchMove: function (e) {
      const { pageX, pageY } = e.changedTouches[0];

      const diffX = pageX - touchObj.startX;
      const diffY = pageY - touchObj.startY;

      // 
      if (Math.abs(diffY) < this.properties.restrictOffset && Math.abs(diffX) > Math.abs(diffY)) {
        touchObj.diff = diffX;
        touchObj.dir = diffX > 0 ? 'right' : 'left';
        this.triggerEvent('touchmoving', touchObj);
      } 

      if (Math.abs(diffX) < this.properties.restrictOffset && Math.abs(diffY) > Math.abs(diffX)) {
        touchObj.diff = diffY;
        touchObj.dir = diffY > 0 ? 'down' : 'up';
        this.triggerEvent('touchmoving', touchObj);
      }
    },

    onTouchEnd: function () {
      const endTime = +new Date();

      console.log(touchObj)

      // 在时间内滑动指定距离
      if (endTime - touchObj.startTime <= this.properties.restrictTime) {
        if (Math.abs(touchObj.diff) > this.properties.requiredOffset) {
          this.triggerEvent('swipe' + touchObj.dir);
        } else {
          this.triggerEvent('release');
        }
      } else if (Math.abs(touchObj.diff) > this.properties.threshold) { // 超过门槛
        this.triggerEvent('swipe' + touchObj.dir);
      } else {
        this.triggerEvent('release');
      }
    },
  },
})
