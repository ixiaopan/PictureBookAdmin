Page({
  data: {},

  onShow() {
    const { title = '' } = getApp().globalData.libraryInfo || {};
    wx.setNavigationBarTitle({ title, });
  },

  onScanTap: function (e) {
    const { isbn } = e.detail;

    if (!isbn) return;

    wx.navigateTo({
      url: `/pages/scanResult/index?isbn=${isbn}`,
    });
  },
});
