const { callCloudBook, } = require('../../utils/cloud');

Page({
  data: {
    loading: false,
    resultList: [],
    autofocus: false,
    editing: false,
  },

  onLoad: function (query) {
    const { isbn } = query || {};

    this.setData({
      autofocus: !isbn,
      editing: !isbn,
      loading: !!isbn,
    });

    if (isbn) {
      this.searchByScanISBN(isbn);
    }
  },

  searchByScanISBN: function (isbn) {
    this.setData({ loading: true, });

    callCloudBook({
      type: 'scan',
      data: {
        libId: getApp().globalData.libraryInfo.libId,
        isbn,
      },
    })
    .then(res => {
      this.setData({
        loading: false,
        resultList: res && res.data ? [ res.data ] : [],
      });
    })
  },

  onSeach: function (e) {
    this.startSearch(e.detail);
  },

  startSearch: function (bookname) {
    this.setData({ loading: true, });

    callCloudBook({
      type: 'search',
      data: {
        libId: getApp().globalData.libraryInfo.libId,
        bookname,
      },
    })
    .then(res => {
      this.setData({
        loading: false,
        resultList: res && res.data || [],
      });
    });
  },

  onBookTap: function (e) {
    const { _id } = e.detail || {};

    wx.navigateTo({
      url: `/pages/bookForm/index?bookid=${_id}`,
    });
  },
})
