const { callCloudBook } = require('../../utils/cloud')

Page({
  data: {
    loading: true,
    loadingMore: false,
    bookList: [],
    sortField: '',
    sortType: '', // asc, desc
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
    });
  },

  // 下拉加载
  onReachBottom: function () {
    const { loadingMore, sortField, sortType, pagination } = this.data;

    if (loadingMore || this.data.bookList.length == this.data.pagination.total) return;

    this.fetchBookList({
      libId: this.libId,
      sortField,
      sortType,
      page: pagination.page,
      pageSize: pagination.pageSize,
    });
  },

  onBarTap: function () {
    wx.navigateTo({
      url: '/pages/search/index',
    });
  },

  fetchBookList: function (params) {
    if (params.page === 1) {
      this.setData({ loading: true, });
    } else {
      this.setData({ loadingMore: true });
    }

    return callCloudBook({
      type: 'query',
      data: params,
    })
    .then(res => {
      const { list = [], page, total } = (res && res.data) || {};

      const hasList = list && list.length > 0;

      if (!list || !list.length) {
        return this.setData({ loading: false, loadingMore: false, });
      }

      this.setData({
        loading: false,
        loadingMore: false,
        bookList: page === 2 ? list : [
          ...this.data.bookList,
          ...list,
        ],
        pagination: {
          ...this.data.pagination,
          ...(hasList ? { page, total, } :{}),
        },
      });
    })
  },

  sortBook: function (e) {
    const { type } = e.currentTarget.dataset || {};

    let { sortField, sortType } = this.data;

    const sortTypeList = ['asc', 'desc'];
    sortType = sortField !== type ? 'asc' : sortTypeList[(sortTypeList.indexOf(sortType) + 1) % sortTypeList.length];
    sortField = type;

    if (sortField === 'default') {
      sortType = '';
      sortField = '';
    }

    this.setData({
      sortType,
      sortField,
    });

    const params = {
      libId: this.libId,
      sortField, // ['', 'create_time', 'complete', 'rate'],
      sortType,
      pageSize: 10,
      page: 1,
    };

    console.log(params)

    this.fetchBookList(params);
  },

  onBookTap: function (e) {
    const { _id } = e.detail || {}

    wx.navigateTo({
      url: `/pages/bookForm/index?bookid=${_id}`,
    });
  },

})