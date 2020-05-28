const { scanAsync, recordBookByScan, formatTime } = require('../../utils/util');

Page({
  data: {
    loading: true,
    scanBook: {},
    existed: false,
  },

  onLoad: function (query) {
    // 是从首页的『扫码录书』进来的
    this.getBookByScanISBN((query || {}).isbn);
  },

  onBookTap: function (e) {
    const { _id } = e.detail || {}

    wx.navigateTo({
      url: `/pages/bookForm/index?bookid=${_id}`,
    });
  },

  getBookByScanISBN: function (isbn) {
    const libId = getApp().globalData.libraryInfo.libId;

    this.setData({  loading: true, });

    return recordBookByScan(libId, isbn)
      .then(({ existed, data } = {}) => {
        this.setData({ 
          loading: false,
          existed: !!existed,
          scanBook: {
            ...data,
            _create_time: formatTime(new Date(data.create_time), 'YYYY-MM-DD hh:mm:ss'),
          },
        });
      })
      .catch(() => {
        this.setData({  loading: false, });

        $Toast({ content: '查询失败，请重试!', type: 'error', });

        setTimeout(() => {
          wx.navigateBack();
        }, 1000);
      });
  },
  
  onContinueScan: function () {
    scanAsync().then(res => {
      const isbn = (res || {}).result;

      if (!isbn) {
        return $Toast({ content: '扫描失败，请重试!', type: 'error', });
      }

      this.getBookByScanISBN(isbn);
    });
  },
})