const { $Toast } = require('../../dist/base/index');

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

      if (!res || !res.success) {
        return $Toast({  content: '导出失败，请重试~', type: 'error', });
      }

      if (!res.data) {
        return $Toast({ content: '书馆还没有任何书哦~', type: 'warning', });
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
