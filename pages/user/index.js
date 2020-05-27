const { DEFAULT_LIBRARY_LOGO, } = require('../../utils/config');

Page({
  data: {
    libraryInfo: {},

    // 默认书馆头像
    defaultSrc: DEFAULT_LIBRARY_LOGO,
  },

  onShow() {
    this.setData({
      libraryInfo: getApp().globalData.libraryInfo || {},
    });
  },
})