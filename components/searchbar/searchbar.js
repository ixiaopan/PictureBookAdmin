Component({
  externalClasses: ['i-class'],

  properties: {},

  data: {
  },

  methods: {
    onBarTap: function () {
      this.triggerEvent('bartap');
    }
  },
})
