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

  methods: {
    onBookTap: function () {
      this.triggerEvent('booktap', this.properties.book);
    },
  },
});
