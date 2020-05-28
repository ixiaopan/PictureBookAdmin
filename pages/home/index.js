const { $Toast } = require('../../dist/base/index');

Page({
  data: {
    loading: false,
  },

  onShow() {
    const { title = '' } = getApp().globalData.libraryInfo || {};
    wx.setNavigationBarTitle({ title, });
  },

  onScanTap: function (e) {
    const { isbn } = e.detail;

    if (!isbn) {
      return $Toast({ content: '扫描失败，请重试!', type: 'error', });
    }

    wx.navigateTo({
      url: `/pages/scanResult/index?isbn=${isbn}`,
    });
  },
});

