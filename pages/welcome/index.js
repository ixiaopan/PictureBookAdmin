const { WELCOME_POSTER } = require('../../utils/config');

const App = getApp();

Page({
  data: {
    error: null,
    loading: true,
    landingPoster: WELCOME_POSTER,
  },

  onLoad: function () {
    // 判断用户是否创建了图书馆，无显示欢迎；有进入管理页
    App.loginPromise.then(result => {
      const { errCode, data = {} } = result || {};

      // 系统出错
      if (errCode === 60001) {
        this.setData({
          loading: false,
          error: result,
        });

        return console.log('system error', result);
      }

      // 更新全局用户信息
      App.updateUserInfo(data.userInfo);

      // 进入首页
      if (data && data.libraryInfo) {
        App.updateLibraryInfo(data.libraryInfo);

        return wx.reLaunch({ url: '/pages/home/index' });
      }

      // 否则进入欢迎页
      this.setData({ loading: false, });
    });
  },

  onGetUserInfo: function (e) {
    const { userInfo } = e.detail || {};

    if (userInfo) { // 允许授权
      // 更新全局用户信息
      App.updateUserInfo(userInfo);

      wx.navigateTo({ url: '/pages/libraryForm/index' });
    }
  },
});
