const { DEFAULT_LIBRARY_LOGO, } = require('../../utils/config');
const { callCloudLibrary } = require('../../utils/cloud');

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

    callCloudLibrary({
      type: 'export',
      data: { libId: this.data.libraryInfo.libId },
    }).then(res => {
      this.exporting = false;

      wx.hideLoading();

      if (!res || !res.data || !res.data.fileUrl) {
        return wx.showToast({
          title: '导出失败，请重试~',
        });
      }

      const { fileUrl } = res.data;

      wx.showModal({
        content: '文件已导出到 ' + fileUrl,
        showCancel: false,
        confirmText: '复制',
        success (res) {
          if (res.confirm) {
            wx.setClipboardData({ data: fileUrl, });
          }
        },
      });
    });
  },
})
