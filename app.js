const { callCloudLogin } = require('./utils/cloud');

wx.cloud.init({
  traceUser: true,
});

App({
  onLaunch: function () {
    this.loginPromise = callCloudLogin();
  },

  globalData: {
    userInfo: {},
    libraryInfo: {},
    windowHeight: 320,
    autoRefreshList: false, // 打个标记，从查看书柜
  },

  updateAutoRefresh: function (refresh) {
    this.globalData.autoRefreshList = refresh;
  },

  updateLibraryInfo: function (data) {
    this.globalData.libraryInfo = {
      ...this.globalData.libraryInfo,
      ...data,
    };
  },

  updateUserInfo: function (data) {
    this.globalData.userInfo = {
      ...this.globalData.userInfo,
      ...data,
    };
  },
})
