const { DEFAULT_LIBRARY_LOGO, } = require('../../utils/config');
const { callCloudBook, } = require('../../utils/cloud');

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

  exporting: false,

  exportData: function () {
    if (this.exporting) return;

    this.exporting = true;

    wx.showLoading({ title: '正在导出', });

    callCloudBook({
      type: 'export',
      data: { libId: this.data.libraryInfo.libId },
    }).then(res => {
      const { fileUrl } = res.data || {};

      wx.hideLoading();

      this.exporting = false;

      wx.showModal({
        content: '文件已导出到 ' + fileUrl,
        showCancel: false,
        confirmText: '复制',
        success (res) {
          if (res.confirm) {
            wx.setClipboardData({
              data: fileUrl,
            });
          }
        }
      });
    });
  },
})
