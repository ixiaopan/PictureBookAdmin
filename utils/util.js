const qiniuUploader = require('./qiniuUploader');
const { QINIU_CDN } = require('./config');

const formatTime = (date, fmt) => {
  date = date || new Date();

  if (/(Y+)/.test(fmt)) {
    fmt = fmt.replace(RegExp.$1, (date.getFullYear() + '').substr(4 - RegExp.$1.length));
  }

  const o = {
    'M+': date.getMonth() + 1,
    'D+': date.getDate(),
    'h+': date.getHours(),
    'm+': date.getMinutes(),
    's+': date.getSeconds()
  };

  for (let k in o) {
    if (new RegExp('('+k+')').test(fmt)) {
      var str = o[k] + '';
      fmt = fmt.replace(RegExp.$1, (RegExp.$1.length === 1) ? str : ('00' + str).substr(str.length));
    }
  }

  return fmt;
}

const chooseImageAsync = (beforeCb) => {
  return new Promise(resolve => {
    wx.chooseImage({
      count: 1,
      sizeType: ['original'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePaths = res.tempFilePaths;
        console.log('选择图片: ', tempFilePaths);
        resolve(tempFilePaths);
      },
      fail: () => {
        resolve();
      },
    });
  });
}

const scanAsync = () => {
  return new Promise(resolve => {
    wx.scanCode({
      onlyFromCamera: true,
      scanType: ['barCode'],
      success: function (res) {
        resolve(res);
      },
      fail: function () {
        resolve();
      },
    });
  });
  
}

const getStorageAsync = (key) => {
  return new Promise(resolve => {
    wx.getStorage({
      key,
      success: (res) => {
        console.log(`getstorage [${key}] success: `, res);
        resolve(res.data);
      },
      fail: function (err) {
        console.log(`getstorage [${key}] fail: `, err);
        resolve();
      },
    });
  });
}

const omit = (obj, keyList) => {
  keyList = Array.isArray(keyList) ? keyList : [ keyList ];

  const nextObj = {};

  Object.keys(obj).forEach(k => {
    if (keyList.indexOf(k) == -1) {
      nextObj[k] = obj[k];
    }
  });

  return nextObj;
}

const qiniuUpload = (file, token) => {
  const options = {
    region: 'ECN',
    uptoken: token,
    domain: QINIU_CDN,
    shouldUseQiniuFileName: false,
  };

  qiniuUploader.init(options);

  return new Promise(resolve => {
    qiniuUploader.upload(
      file,
      (res) => {
        console.log('fileURL: ' + res.fileURL);
        resolve(res.fileURL);
      },
      (error) => {
        console.error('error: ', error);
      },
      null,
      (progress) => {
        console.log('上传进度', progress.progress);
        console.log('已经上传的数据长度', progress.totalBytesSent);
        console.log('预期需要上传的数据总长度', progress.totalBytesExpectedToSend);
      },
    );
  });
}

const noop = function () {}

module.exports = {
  omit: omit,
  noop: noop,
  qiniuUpload: qiniuUpload,
  formatTime: formatTime,
  scanAsync: scanAsync,
  getStorageAsync: getStorageAsync,
  chooseImageAsync: chooseImageAsync
}
