const { $Toast } = require('../../dist/base/index');
const { chooseImageAsync, qiniuUpload, getUrlVersion, removeUrlVersion, increateUrlVersion } = require('../../utils/util');
const { DEFAULT_LIBRARY_LOGO, } = require('../../utils/config');
const {
  callCloudLibrary,
  callCloudQiniuToken,
} = require('../../utils/cloud');

const App = getApp();

Page({
  data: {
    disabled: true,

    // 默认书馆头像
    defaultSrc: DEFAULT_LIBRARY_LOGO,
    // 预览书馆图
    previewSrc: '',

    // 创建和修改共用一个表单
    updateLibMode: false,

    // 用户信息
    userInfo: {},

    // 书馆信息
    libraryFormValue: {
      libId: '',
      title: '',
      cover: '',
      address: '',
      contact: '',
      telephone: '',
    },
  },

  // 按钮防重复点击
  locked: false,

  // 搜集要校验的表单数据
  formData: {},

  // 必填字段校验
  requiredFields: ['title'],

  onLoad: function (query) {
    // 支持创建、修改
    let { updateLibMode } = query || {};

    updateLibMode = updateLibMode === 'true';

    const { userInfo, libraryInfo } = getApp().globalData || {};

    this.setData({
      userInfo,

      ...(updateLibMode ? {
        disabled: false,

        updateLibMode,

        libraryFormValue: libraryInfo,

        defaultSrc: libraryInfo.cover || DEFAULT_LIBRARY_LOGO,
      } : {}),
    });
  },

  onChooseImg: function () {
    chooseImageAsync().then(tempFilePaths => this.setData({ previewSrc: tempFilePaths }));
  },

  onInput: function (e) {
    const { type } = e.currentTarget.dataset;

    const value = e.detail.value;

    this.formData[type] = value;

    this.setData({ disabled: !this.checkValid(), });
  },

  checkValid: function() {
    return this.requiredFields.every(field => this.formData[field]) && (this.data.previewSrc || this.data.defaultSrc);
  },

  //
  onCreateLibrary: function (e) {
    const { title = '', contact = '', telephone = '', address = '' } = e.detail.value || {};

    // prevent repeat
    if (this.locked) { return; }

    this.locked = true;

    this.setData({ disabled: true, });

    const {
      updateLibMode,
      userInfo, libraryFormValue,
      previewSrc, defaultSrc,
    } = this.data || {};

    wx.showLoading({ title: updateLibMode ? '正在保存' : '正在创建' });

    new Promise(async (resolve) => {
      if (previewSrc) {  // 手动选择了，更新 fileId
        // 同名覆盖上传，一个书馆的图片路径是唯一的
        const keyToOverwrite = updateLibMode ? libraryFormValue.libId + '/logo' : previewSrc[0].split('//')[1];

        const token = await callCloudQiniuToken({
          type: 'token',
          data: { keyToOverwrite, }
        })

        // 上传失败则是空的
        const fileUrl = await qiniuUpload(previewSrc[0], token, keyToOverwrite);

        // 如果不是修改模式，这个就是 0；如果是修改模式，这个就是当前的版本
        const { v = 0 } = getUrlVersion(libraryFormValue.cover) || {};

        // 版本加1强制清除CDN
        resolve(increateUrlVersion(fileUrl, v));
      }

      resolve(defaultSrc);
    })
    .then(cover => {
      console.log('final library url: ', cover);

      // 由上传失败，带过来的空值
      if (!cover) {
        return this.showError();
      }

      const params = {
        cover, title,
        contact, telephone, address,
      };

      // 修改模式
      if (updateLibMode) {
        callCloudLibrary({
          type: 'update',
          data: {
            libId: libraryFormValue.libId,
            ...params,
          },
        })
        .then(async res => {
          if (!res || !res.success) {
            return this.showError(res);
          }

          // 更新下才主动刷新 CDN, don't care fail or not
          await callCloudQiniuToken({
            type: 'refresh',
            data: {
              imageUrlList: [ removeUrlVersion(cover) ],
            },
          });

          // 更新全局书馆信息
          App.updateLibraryInfo(params);

          this.showSuccess();
        });

        return;
      }

      // 创建模式
      callCloudLibrary({
        type: 'create',
        data: {
          library: params,
          user: userInfo,
        },
      })
      .then(res => {
        if (!res || !res.success) {
          return this.showError(res);
        }

        wx.hideLoading();

        wx.showToast({ title: '创建成功', });

        // 更新全局书馆信息
        App.updateLibraryInfo({ ...params, libId: res.data.libId, });

        setTimeout(() => { wx.reLaunch({ url: '/pages/home/index', }); }, 1000);
      });
    });
  },

  showSuccess: function () {
    wx.hideLoading();

    wx.showToast({ title: '保存成功', });

    setTimeout(() => wx.navigateBack(), 1000);
  },

  showError: function (err) {
    wx.hideLoading();

    this.locked = false;

    this.setData({ disabled: false, });

    $Toast({
      content: err && err.msg || (this.data.updateLibMode ? '修改失败，请重试!' : '创建失败，请重试!'),
      type: 'error',
    });
  },
});
