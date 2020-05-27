const { callCloudBook } = require('../../utils/cloud')

Page({
  data: {
    loading: true,
    bookList: [],

    pagination: {
      page: 1,
      pageSize: 10,
      total: 0,
    },
  },

  libId: '',

  onLoad: function () {
    this.libId = getApp().globalData.libraryInfo.libId;

    this.fetchBookList({
      libId: this.libId,
    })
  },

  fetchBookList: function (params) {
    this.setData({
      loading: true,
    });

    return callCloudBook({
      type: 'query',
      data: params,
    })
    .then(res => {
      const { list, page, total } = (res && res.data) || {};

      const hasList = list && list.length > 0;

      this.setData({
        loading: false,
        bookList: list,
        pagination: {
          ...this.data.pagination,
          ...(hasList ? { page, total, } :{}),
        },
      });
    })
  },

  sortBook: function (e) {
    // 默认
    const params = {
      libId: this.libId,
      sortType: '', // ['', 'creat_time', 'complete', 'rate'],
      sortMode: 'ascend', // ['ascend', 'descend' 由大到小，时间由远到近] 
      pageSize: 10,
      page: 1,
    };

    this.fetchBookList(params);
  },

  onBookTap: function (e) {
    const { _id } = e.detail || {}

    wx.navigateTo({
      url: `/pages/record/index?bookid=${_id}`,
    });
  },

})