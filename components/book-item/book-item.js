let tapLocked = false;

Component({
  externalClasses: ['i-class'],

  properties: {
    book: {
      type: Object,
    },

    isReader: {
      type: Boolean,
      value: false,
    },
  },

  data: {
    offset: 0,
  },

  methods: {
    onTouchMoving: function (e) {
      const { dir, diff } = e.detail;

      this.setData({ 
        offset: dir == 'left' ? Math.max(-120, diff) : 0,
      });
    },

    onSwipeLeft: function () {
      this.setData({ offset: -120 });
    },

    onRelease: function () {
      if (this.data.offset) {
        this.setData({ offset: 0, });
        tapLocked = true;
      }
    },

    onTransitionEnd: function () {
      tapLocked = false;
    },

    onBookTap: function () {
      if (tapLocked) return;

      this.triggerEvent('booktap', this.properties.book);
    },

    onDeleteItem: function () {
      this.triggerEvent('deletebook', this.properties.book);
    },
  },
});
