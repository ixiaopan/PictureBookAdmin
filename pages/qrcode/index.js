const { 
  callCloudLibrary
} = require('../../utils/cloud');

Page({
  data: {
    canvasW: 0,
    canvasH: 0,
    libraryInfo: {},
  },

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
      // this.drawLogo(officialImage);

      // 4.
      // officialImage && this.drawTitle(officialImage.imageH);
    });
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

  getClippedImage: function (src, frame, proportion = 1) {
    return new Promise(resolve => {
      wx.getImageInfo({
        src,
        success: data => {
          if (!data) {
            return resolve();
          }

          const { width, height, path } = data || {};

          // h / w > ratio,  => 宽度为准
          // h / w < ratio,  => 高度为准
          let nextImgHeight, nextImgWidth;
          const ratio = height / width;
          if (frame.height / frame.width < ratio) {
            nextImgHeight = frame.height * proportion;
            nextImgWidth = nextImgHeight / ratio;
          } else {
            nextImgWidth = frame.width * proportion;
            nextImgHeight = nextImgWidth * ratio;
          }

          resolve({ nextImgWidth, nextImgHeight, path });
        },
        fail: () => {
          resolve();
        },
      });
    });
  },

  saveToAlbum: function () {
    wx.canvasToTempFilePath({
      canvas: this.canvas,
      success: (res) => {
        console.log('canvasToTempFilePath： ', res);
  
        wx.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success() {
            wx.showToast({ title: '保存成功', });
          },
          fail(err) {
            if (/fail(.)*auth/.test(err.errMsg)) {
              wx.showModal({
                title: '提示',
                content: '您未授权读取相册，请点击底部按钮打开授权！',
                success(res) {
                  if (res.confirm) {
                    wx.openSetting({
                      success(settingdata) {
                        if (settingdata.authSetting['scope.writePhotosAlbum']) {
                          wx.showToast({ title: '可以保存二维码啦~', icon: 'none' });
                        } else {
                          wx.showToast({ title: '保存失败，请重试~', icon: 'none' });
                        }
                      },
                    });
                  }
                },
              });
            }
          },
        });
      },
      fail: (err) => {
        console.log(err);
      },
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

      return this.getClippedImage(qrcodeURL, this.canvas, 0.8).then(result => {
        if (!result) return wx.showToast({ title: '二维码生成失败，请重试~', icon: 'none' });

        const { nextImgWidth, nextImgHeight, path } = result;

        console.log('next', nextImgWidth, nextImgHeight);

        // https://developers.weixin.qq.com/community/develop/doc/000aca768303600d4c4aea6fd5d000?_at=1590855420372
        return new Promise((resolve) => {
          const image = this.canvas.createImage();
          image.src = path;
          image.onload = () => {
            this.ctx.drawImage(
              image, 
              (this.canvas.width - nextImgWidth) / this.pixelRatio / 2,
              // (this.canvas.height - nextImgHeight) / this.pixelRatio / 4 * 3, // 有 title
              (this.canvas.height - nextImgHeight) / this.pixelRatio / 2, // 无 title
              nextImgWidth / this.pixelRatio, 
              nextImgHeight / this.pixelRatio
            );

            resolve({ imageW: nextImgWidth, imageH: nextImgHeight, });
          };
        });
      });
    });
  },

  drawLogo: function ({ imageH } = {}) {
    const circleX = this.canvas.width / this.pixelRatio / 2;
    const cirlceY = (this.canvas.height - imageH) / this.pixelRatio / 4 * 3 + imageH / 2 / this.pixelRatio;
    const r = 48;

    this.getClippedImage(this.data.libraryInfo.cover, { width: 2 * r, height: 2 * r }, 1).then(result => {
      if (!result) return wx.showToast({ title: '二维码生成失败，请重试~', icon: 'none' });

      const { nextImgWidth, nextImgHeight, path } = result;

      console.log('next', nextImgWidth, nextImgHeight);

      const image = this.canvas.createImage();
      image.src = path;
      image.onload = () => {
        this.ctx.beginPath();
        this.ctx.arc(circleX, cirlceY, r, 0, 2 * Math.PI);
        this.ctx.stroke();
        this.ctx.clip();
        this.ctx.drawImage(image, circleX - r, cirlceY - r, nextImgWidth / this.pixelRatio, nextImgHeight / this.pixelRatio);
      };
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
})
