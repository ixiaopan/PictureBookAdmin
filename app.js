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
