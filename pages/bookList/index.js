const { $Toast } = require('../../dist/base/index');
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

  deleting: false,

  onLoad: function () {
    this.libId = getApp().globalData.libraryInfo.libId;

    this.fetchBookList({
      libId: this.libId,
    });
  },

  // 页面滚动时执行
  onPageScroll: function (e) {
    console.log(e);
    
    this.setData({
      sticky: e.scrollTop > 60
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

  onScanSearch: function (e) {
    const isbn = e.detail;

    if (!isbn) {
      return;
    }

    wx.navigateTo({
      url: '/pages/search/index?isbn=' + isbn,
    })
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

    this.fetchBookList(params);
  },

  onBookTap: function (e) {
    const { _id } = e.detail || {};

    wx.navigateTo({
      url: `/pages/bookForm/index?bookid=${_id}`,
    });
  },

  onDeleteBook: function (e) {
    const { _id } = e.detail || {};

    if (this.deleting) return;

    this.deleting = true;

    callCloudBook({
      type: 'delete',
      data: {
        libId: this.libId,
        _id,
      },
    }).then(ok => {
      this.deleting = false;

      if (!ok) {
        return $Toast({  content: '删除失败', type: 'error', });
      }

      $Toast({  content: '删除成功', type: 'success', });

      this.setData({
        bookList: this.data.bookList.filter(item => item._id !== _id),
      });
    });
  },
})
