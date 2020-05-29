Component({
  externalClasses: ['i-class'],

  properties: {
    inputVal: {
      type: String,
    }
  },

  data: {},

  methods: {
    onBarTap: function () {
      this.triggerEvent('bartap');
    },

    onSearch: function (e) {
      const { value } = e.detail || {};

      this.triggerEvent('searchblur', value);
    },
    onInput: function (e) {
      const { value } = e.detail || {};

      this.triggerEvent('searchinput', value);
    }
  },
})
