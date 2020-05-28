const { callCloudBook } = require('../../utils/cloud')

Page({
  data: {
    loading: true,

    sortField: '',
    sortType: '', // asc, desc

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

    // this.fetchBookList(params);
  },

  onBookTap: function (e) {
    const { _id } = e.detail || {}

    wx.navigateTo({
      url: `/pages/record/index?bookid=${_id}`,
    });
  },

})