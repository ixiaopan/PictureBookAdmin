const { $Toast } = require('../../dist/base/index');

const { scanAsync, recordBookByScanOrHand, formatTime } = require('../../utils/util');

Page({
  data: {
    loading: true,
    existed: false,
    scanBook: {},
  },

  // 是从首页的『扫码录书』进来的
  onLoad: function ({ isbn } = {}) {
    this.getBookByScanISBN(isbn);
  },

  onUnload: function () {
    // 打个标记，自动刷新书柜
    if (!this.data.existed) {
      getApp().updateAutoRefresh(true);
    }
  },

  getBookByScanISBN: function (isbn) {
    const libId = getApp().globalData.libraryInfo.libId;

    this.setData({ loading: true, });

    recordBookByScanOrHand(libId, isbn).then(res => {
      if (!res || !res.success) {
        return this.showError();
      }

      this.setData({ 
        loading: false,
        existed: !!res.existed,
        scanBook: {
          ...res.data,
          _create_time: formatTime(new Date(res.data.create_time), 'YYYY-MM-DD hh:mm:ss'),
        },
      });
    });
  },
  
  showError: function () {
    this.setData({ loading: false, });

    $Toast({ content: '查询失败，请重试!', type: 'error', });

    setTimeout(() => { wx.navigateBack(); }, 1000);
  },

  onBookTap: function (e) {
    const { _id } = e.detail || {}

    wx.navigateTo({
      url: `/pages/bookForm/index?bookid=${_id}`,
    });
  },

  onContinueScan: function () {
    scanAsync().then(res => {
      const isbn = (res || {}).result;

      if (!isbn) return;

      this.getBookByScanISBN(isbn);
    });
  },
  
  onGoShelf: function () {
    wx.switchTab({
      url: '/pages/bookList/index',
    });
  },
})