const { $Toast } = require('../../dist/base/index');

const { 
  chooseImageAsync, scanAsync, 
  qiniuUpload, recordBookByScanOrHand,
  getUrlVersion, increateUrlVersion, removeUrlVersion
} = require('../../utils/util');

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
    isbn: '',

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

  async onLoad(query) {
    const { bookid } = query || {};

    this.libId = getApp().globalData.libraryInfo.libId;

    // -- 1. 修改
    if (bookid) {
      wx.setNavigationBarTitle({
        title: '修改书本信息',
      });

      const res = await callCloudBook({
        type: 'detail',
        data: {
          libId: this.libId,
          _id: bookid,
        },
      })

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

      return;
    }

    // -- 2. 手动录入
    wx.setNavigationBarTitle({
      title: '录入书本信息',
    });
    this.setData({ loading: false, });
  },

  onScanCode: function (e) {
    const { type } = e.currentTarget.dataset || {};

    scanAsync().then(res => {
      if (!res || !res.result) return;
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

    new Promise(async (resolve) => {
      if (this.data.previewSrc) { // 说明是手动上传了
        // 同名覆盖上传，一本书的图片路径是唯一的
        const keyToOverwrite = this.libId + '/' + isbn;

        const token = await callCloudQiniuToken({
          type: 'token',
          data: { keyToOverwrite, }
        })

        // 上传失败则是空的
        const fileUrl = await qiniuUpload(this.data.previewSrc[0], token, keyToOverwrite);

        // 如果不是修改模式，这个就是 0；如果是修改模式，这个就是当前的版本
        const { v = 0 } = getUrlVersion(this.data.scan.cover);

        // 版本加1强制清除CDN
        resolve(increateUrlVersion(fileUrl, v));
      }

      resolve(this.data.scan.cover);
    })
    .then(cover => {
      console.log('final book url: ', cover);

      // 由上传失败，带过来的空值, 直接拒绝;
      if (!cover) { 
        return this.showError();
      }

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

      // 修改模式
      if (this.data.bookid) {
        return callCloudBook({ type: 'update', data: params, }).then(async res => {
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

          this.showSuccess();
        });
      }

      // 手动创建模式
      return recordBookByScanOrHand(this.libId, isbn, params).then(result => {
        if (!res || !res.success) {
          return this.showError(res);
        }

        if (res.existed) {
          return this.showError({ msg: '你已经录入过此书~'});
        }

        this.showSuccess();
      });
    });
  },

  showSuccess: function () {
    wx.hideLoading();

    wx.showToast({ title: '保存成功', });

    setTimeout(() => wx.navigateBack(), 1000);
  },

  showError: function (err) {
    this.locked = false;

    this.setData({ disabled: false, });

    wx.hideLoading();

    $Toast({ content: err && err.msg || '保存失败，请重试!', type: 'error', });
  },
})
