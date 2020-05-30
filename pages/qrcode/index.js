const { 
  callCloudLibrary
} = require('../../utils/cloud');

Page({
  data: {
    canvasW: 0,
    canvasH: 0,
    libraryInfo: {},
  },

  imageW: 0,
  imageH: 0,

  ctx: null,
  canvas: null,
  pixelRatio: 1,

  onLoad() {
    this.setData({
      libraryInfo: getApp().globalData.libraryInfo,
    });
  },

  onReady() {
    // https://developer.mozilla.org/zh-CN/docs/Web/API/CanvasRenderingContext2D
    this.getContext().then(async ({ ctx, canvas, pixelRatio } = {}) => {
      this.canvas = canvas;
      this.ctx = ctx;
      this.pixelRatio = pixelRatio;

      // 1.
      ctx.beginPath();
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2.
      const officialImage = await this.drawOfficialQRCode();

      // 3.
      officialImage && this.drawTitle(officialImage.imageH);
    });
  },

  drawTitle: function (imageH) {
    this.ctx.beginPath();
    this.ctx.fillStyle = '#00A2ED';
    this.ctx.font = '18px PingFang-Medium';

    const title = this.data.libraryInfo.title;
    const { width } = this.ctx.measureText(title);

    this.ctx.fillText(
      title, 
      (this.canvas.width / this.pixelRatio - width) / 2, 
      (this.canvas.height - imageH) / this.pixelRatio / 4 * 2
    );
  },

  getContext: function () {
    const { pixelRatio , windowWidth } = wx.getSystemInfoSync();

    // 缩放比例
    const scale = 320 / 260;
    const canvasW = windowWidth * 0.8;
    const canvasH = windowWidth * 0.8 * scale;

    this.setData({ canvasW, canvasH, });

    return new Promise(resolve => {
      // 获取实例，保证高清屏幕
      wx.createSelectorQuery().select('#my-canvas').fields({ node: true }).exec(res => {
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');

        canvas.width = canvasW * pixelRatio;
        canvas.height = canvasH * pixelRatio;

        ctx.scale(pixelRatio, pixelRatio);

        resolve({ ctx, canvas, pixelRatio });
      });
    });
  },

  drawOfficialQRCode: function () {
    return callCloudLibrary({
      type: 'qrcode',
      data: {
        libId: this.data.libraryInfo.libId,
      }
    })
    .then(res => {
      const { qrcodeURL } = (res || {}).data || {}

      if (!qrcodeURL) return;

      return this.getImageMeta(qrcodeURL).then(result => {
        if (!result) return wx.showToast({ title: '加载失败，请重试', });

        const { width, height, path } = result || {};

        // h / w > ratio,  => 宽度为准
        // h / w < ratio,  => 高度为准
        let nextImgHeight, nextImgWidth;
        const ratio = height / width;
        if (this.canvas.height / this.canvas.width < ratio) {
          nextImgHeight = this.canvas.height * 0.8;
          nextImgWidth = nextImgHeight / ratio;
        } else {
          nextImgWidth = this.canvas.width * 0.8;
          nextImgHeight = nextImgWidth * ratio;
        }

        console.log('next', nextImgWidth, nextImgHeight);

        // https://developers.weixin.qq.com/community/develop/doc/000aca768303600d4c4aea6fd5d000?_at=1590855420372
        return new Promise((resolve) => {
          const image = this.canvas.createImage();
          image.src = path;
          image.onload = () => {
            this.ctx.drawImage(
              image, 
              (this.canvas.width - nextImgWidth) / this.pixelRatio / 2,
              (this.canvas.height - nextImgHeight) / this.pixelRatio / 4 * 3, 
              nextImgWidth / this.pixelRatio, 
              nextImgHeight / this.pixelRatio
            );

            resolve({ imageW: nextImgWidth, imageH: nextImgHeight, });
          };
        });
      });
    });
  },

  drawLogo: function () {

  },

  getImageMeta: function (src) {
    return new Promise(resolve => {
      wx.getImageInfo({
        src,
        success: data => {
          resolve(data);
        },
        fail: () => {
          resolve()
        },
      });
    });
  },


  saveToAlbum: function () {
    wx.canvasToTempFilePath({
      canvasId: 'my-canvas',
      success: (res) => {
        console.log('canvasToTempFilePath： ', res);
  
        wx.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success() {
            wx.showToast({ title: '保存成功', });
          },
        });
      },
      fail: (err) => {
        console.log(err);

        // TODO:
        if (err.errMsg == 'saveImageToPhotosAlbum:fail auth deny') {
          wx.showModal({
            title: '提示',
            content: '您未授权，请点击底部按钮打开授权！',
            showCancel: false
          });
        }
      },
    });
  },

})
