const { WELCOME_POSTER } = require('../../utils/config');

const App = getApp();

Page({
  data: {
    loading: true,
    landingPoster: WELCOME_POSTER,
  },

  onLoad: function () {
    // 判断用户是否创建了图书馆，无显示欢迎；有进入管理页
    App.loginPromise.then(result => {
      const { errCode, data = {} } = result || {};

      // TODO: 错误提示
      if (errCode === 10) {
        return console.log('onload error', result);
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
