const { scanAsync, } = require('../../utils/util');

Component({
  externalClasses: ['i-class'],

  data: {
    list: {
      scan: {
        type: 'scan',
        title: '扫码录书',
        image: '/images/scan-fill.png'
      },
      hand: {
        type: 'hand',
        title: '手动录书',
        image: '/images/hand-record-fill.png',
      },
      recom:  {
        type: 'recom',
        title: '读者荐购',
        image: '/images/star-fill.png',
      },
      forward: {
        type: 'forward',
        title: '敬请期待',
        image: '/images/forward-fill.png',
      }
    },
  },

  properties: {
    areas: Array,
  },

  methods: {
    onAreaTap: function (e) {
      const { type } = e.currentTarget.dataset || {};
      
      switch (type) {
        case 'hand':
          wx.navigateTo({ url: '/pages/bookForm/index', });
          break;
        
        case 'scan':
          scanAsync().then(res => {
            this.triggerEvent('scantap', { isbn: res && res.result });   
          });
          break;
        
        default:
      }
    },
  },
})
