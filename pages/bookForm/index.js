const { $Toast } = require('../../dist/base/index');

const { chooseImageAsync, scanAsync, qiniuUpload } = require('../../utils/util');

const { 
  callCloudBook,
  callCloudQiniuToken
} = require('../../utils/cloud');

Page({
  data: {
    loading: true,
 
    disabled: true,

    // 预览图片用的
    previewSrc: '',

    // 扫码数据
    library_inner_index: '',

    // 有值说明是编辑状态
    bookid: '',

    // 自动填充的表单数据：来自detail或者扫码录书
    scan: {
      cover: '',
      title: '',
      isbn: '',
      price: '', 
      author: '', 
      translator: '', 
      pubdate: '', 
      publisher: '', 
      pages: '',
      author_intro: '', 
      summary: '',
    },
  },

  locked: false,

  formData: {},

  // 强校验：名称、ISBN、封面必填
  requiredFields: ['title', 'isbn'],

  // 全局的书馆ID
  libId: '',

  onLoad(query) {
    const { bookid } = query || {};

    // 缓存全局的书馆信息
    this.libId = getApp().globalData.libraryInfo.libId;

    // -- 1. 修改
    if (bookid) {
      wx.setNavigationBarTitle({
        title: '修改书本信息',
      });

      callCloudBook({
        type: 'detail',
        data: {
          libId: this.libId,
          _id: bookid,
        },
      })
      .then(res => {
        if (!res || !res.success || !res.data) {
          this.setData({ loading: false, });

          $Toast({ content: '查询失败，请重试!', type: 'error', });

          setTimeout(() => { wx.navigateBack(); }, 1000);

          return;
        }

        this.setData({ 
          bookid,
          loading: false,
          scan: res.data,
          disabled: !(this.requiredFields.every(field => res.data[field]) && !!res.data.cover),
        });

        this.requiredFields.forEach(key => this.formData[key] = res.data[key]);
      });

      return;
    }

    // -- 2. 是手动录入的
    wx.setNavigationBarTitle({
      title: '录入书本信息',
    });
    this.setData({ loading: false, });
  },

  onScanCode: function (e) {
    const { type } = e.currentTarget.dataset || {};

    scanAsync().then(res => {
      if (!res || !res.result) {
        return $Toast({ content: '扫描失败，请重试!', type: 'error', });
      }

      this.setData({ [type]: res.result, });
    });
  },

  onChooseBookCover: function () {
    chooseImageAsync().then(tempFilePaths => {
      this.setData({ 
        previewSrc: tempFilePaths, 
        disabled: !this.checkValid(true),
      });
    });
  },

  onInput: function (e) {
    const { type } = e.currentTarget.dataset;

    const value = e.detail.value;

    this.formData[type] = value;

    this.setData({ disabled: !this.checkValid(), });
  },

  checkValid: function(ignoreCover) {
    return this.requiredFields.every(field => this.formData[field]) && (ignoreCover || this.data.previewSrc || this.data.scan.cover);
  },

  onCreateRecord: function (e) {
    console.log('record form data: ', e.detail.value);

    const { 
      title, isbn, 
      library_inner_index,
      price, author, translator, 
      pubdate, publisher, pages,
      author_intro, summary,
    } = e.detail.value || {};

    // prevent repeat
    if (this.locked) { return; }

    this.locked = true;

    this.setData({ disabled: true, });

    wx.showLoading({ title: '正在保存', });

    new Promise(resolve => {
      // 说明是手动上传了
      if (this.data.previewSrc) {
        return callCloudQiniuToken().then(token => { resolve(qiniuUpload(previewSrc[0], token)); });
      }

      resolve(this.data.scan.cover);
    })
    .then(cover => {
      const params = {
        ...(this.data.bookid ? { _id: this.data.bookid } : {}),

        libId: this.libId,

        cover,

        title, isbn, 

        library_inner_index,

        price, author, translator, 

        pubdate, publisher, pages,

        author_intro, summary,
      };

      callCloudBook({
        type: this.data.bookid ? 'update' : 'create',
        data: params,
      })
      .then(res => {
        if (!res || !res.success) {
          this.locked = false;

          wx.hideLoading();

          this.setData({ disabled: false, });

          $Toast({ content: res && res.msg || '保存失败，请重试!', type: 'error', });

          return;
        }

        wx.hideLoading();

        wx.showToast({ title: '保存成功', });

        setTimeout(() => wx.navigateBack(), 1000);
      });
    });
  },
})
