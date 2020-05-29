const { callCloudBook, } = require('../../utils/cloud');
const { setStorageAsync, getStorageAsync, removeStorageAsync } = require('../../utils/util');
const { CACHE_KEY_MAP } = require('../../utils/config');

Page({
  data: {
    loading: false,
    resultList: [],
    searchedName: '',
    inputName: '',
    historyList: [],
  },

  onLoad: function () {
    getStorageAsync(CACHE_KEY_MAP.SEARCH_HISTORY).then(res => {
      try {
        res = JSON.parse(res);
      } catch (e) {}

      this.setData({
        historyList: res || [],
      });
    });
  },

  // 选中历史记录
  searchByHistoryKeyword: function (e) {
    const { index } = e.currentTarget.dataset || {};

    const inputName = this.data.historyList[index];

    this.setData({
      inputName,
    });

    this.onSearchBlur({ detail: inputName });
  },

  // 输入中的
  onSearchInput: function (e) {
    const bookname = e.detail;

    this.setData({
      inputName: bookname,
      searchedName: '',
    });
  },

  // 最终搜索的
  onSearchBlur: function (e) {
    const val = e.detail;

    if (val) {
      this.startSearch(val);
    }
  },

  startSearch: async function (bookname) {
    let nextHistoryList = [ ...this.data.historyList ];

    if (nextHistoryList.indexOf(bookname) <= -1) {
      nextHistoryList.unshift(bookname);
    }

    // 取前8个
    nextHistoryList = nextHistoryList.slice(0, 8);

    this.setData({
      loading: true,
      historyList: nextHistoryList,
      searchedName: '',
    });

    await setStorageAsync(CACHE_KEY_MAP.SEARCH_HISTORY, JSON.stringify(nextHistoryList));

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
        searchedName: bookname,
      });
    });
  },

  // 清除缓存
  clearSearchHistory: function () {
    removeStorageAsync(CACHE_KEY_MAP.SEARCH_HISTORY).then(res => {
      if (res) {
        this.setData({
          historyList: [],
        });
      }
    });
  },

  onBookTap: function (e) {
    const { _id } = e.detail || {};

    wx.navigateTo({
      url: `/pages/bookForm/index?bookid=${_id}`,
    });
  },
})
