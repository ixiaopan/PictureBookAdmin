const { setStorageAsync, getStorageAsync, removeStorageAsync, scanAsync } = require('../../utils/util');
const { CACHE_KEY_MAP } = require('../../utils/config');

Component({
  externalClasses: ['i-class'],

  properties: {
    dynamic: {
      type: Boolean,
      value: false,
    },

    editing: {
      type: Boolean,
      value: false,
    },

    autofocus: {
      type: Boolean,
      value: false,
    }
  },

  data: {
    historyList: [],
    inputVal: '',
    editing: false,
    focused: false,
  },

  lifetimes: {
    attached() {
      // 自适应多种情况
      this.setData({
        editing: this.properties.editing,
      });

      setTimeout(() => {
        this.setData({
          focused: this.properties.autofocus,
        });
      }, 500);

      getStorageAsync(CACHE_KEY_MAP.SEARCH_HISTORY).then(res => {
        try {
          res = JSON.parse(res);
        } catch (e) {}
  
        this.setData({
          historyList: res || [],
        });
      });
    },
  },

  methods: {
    // 选中历史记录
    searchByHistoryKeyword: function (e) {
      const { index } = e.currentTarget.dataset || {};

      const inputVal = this.data.historyList[index];

      this.setData({ 
        inputVal, 
        editing: false,
      });

      // 3. 发起搜索，通知上层显示搜索结果
      this.triggerEvent('search', inputVal);
    },

    // 清除缓存
    clearSearchHistory: function () {
      removeStorageAsync(CACHE_KEY_MAP.SEARCH_HISTORY).then(ok => {
        if (ok) {
          this.setData({
            historyList: [],
          });
        }
      });
    },

    // 
    onBarTap: function () {
      this.triggerEvent('bartap');
    },

    onScanTap: function () {
      scanAsync().then(res => {
        const isbn = res && res.result;
        this.triggerEvent('scansearch', isbn);
      });
    },

    // 
    onFocus: function () {
      this.setData({
        editing: true,
      });
    },

    onConfirm: function () {
      // 1.
      const { inputVal, historyList } = this.data;
      let nextHistoryList = [ ...historyList ];
      if (nextHistoryList.indexOf(inputVal) <= -1) {
        nextHistoryList.unshift(inputVal);
      }
      // 取前8个
      nextHistoryList = nextHistoryList.slice(0, 8);

      // don't care fail or not
      setStorageAsync(CACHE_KEY_MAP.SEARCH_HISTORY, JSON.stringify(nextHistoryList));

      // 2.
      this.setData({
        editing: false,
        historyList: nextHistoryList,
      });

      // 3. 发起搜索，通知上层显示搜索结果
      this.triggerEvent('search', inputVal);
    },

    onEditCancel: function () {
      // 有的话隐藏
      if (this.data.inputVal) {
        this.setData({
          editing: false,
        });
      } else { // 在没有输入的情况的返回上一级
        wx.navigateBack();
      }
    },

    onInput: function (e) {
      const { value } = e.detail || {};

      this.setData({
        inputVal: value,
      });
    },

    onClearInput: function () {
      this.setData({
        inputVal: '',
        editing: true,
      });

      setTimeout(() => {
        this.setData({
          focused: true,
        });
      }, 500);
    },

    onBlur: function () {
      this.setData({
        focused: false,
      })
    }
  },
})
