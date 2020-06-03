const qiniuUploader = require('./qiniuUploader');
const { QINIU_CDN, } = require('./config');
const { callCloudBook, } = require('./cloud');

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

const chooseImageAsync = () => {
  return new Promise(resolve => {
    wx.chooseImage({
      count: 1,
      sizeType: ['original'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePaths = res.tempFilePaths;
        console.log('[API] [chooseImage] success: ', tempFilePaths);
        resolve(tempFilePaths);
      },
      fail: (err) => {
        console.log('[API] [chooseImage] fail: ', err);
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
        console.log('[API] [scan] success: ', res);
        resolve(res);
      },
      fail: function (err) {
        console.log('[API] [scan] fail: ', err);
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
        console.log(`[API] [getStorage] [${key}] success: `, res);
        resolve(res.data);
      },
      fail: function (err) {
        console.log(`[API] [getStorage] [${key}] fail: `, err);
        resolve();
      },
    });
  });
}

const setStorageAsync = (key, data) => {
  return new Promise(resolve => {
    wx.setStorage({
      key,
      data,
      success: (res) => {
        console.log(`[API] [setStorage] [${key}] success: `, res);
        resolve(res);
      },
      fail: function (err) {
        console.log(`[API] [setStorage] [${key}] fail: `, err);
        resolve();
      },
    });
  });
}

const removeStorageAsync = (key) => {
  return new Promise(resolve => {
    wx.removeStorage({
      key,
      success (res) {
        console.log(`[API] [removeStorage] [${key}] success: `, res);
        resolve(res);
      },
      fail: function (err) {
        console.log(`[API] [removeStorage] [${key}] fail: `, err);
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

const getUrlVersion = (cover = '') => {
  if (!cover) return;

  const [ url, search ]= ('' + cover).split('?');

  // [v=1, a=2]
  const list = (search || '').split('&');

  // { v: 1, a: 2 }
  const query = list.reduce((memo, item) => {
    const [k, v] = item.split('=');
    if (k) memo[k] = v;
    return memo;
  }, {});

  return query;
}

const increateUrlVersion = (cover, v = 0) => {
  if (!cover) return;

  const [ url, search ]= ('' + cover).split('?');

  const query = getUrlVersion(cover);
  
  query.v = parseInt(v, 10) + 1;

  const rList = Object.keys(query).reduce((memo, key) => {
    memo.push(key + '=' + query[key]);
    return memo;
  }, [])

  return url + (rList.length ? '?' + rList.join('&') : '');
}

const removeUrlVersion = (cover) => {
  if (!cover) return;

  const [ url, search ]= ('' + cover).split('?');

  const query = getUrlVersion(cover);

  const rList = Object.keys(query).reduce((memo, key) => {
    if (key !== 'v') {
      memo.push(key + '=' + query[key]);
    }

    return memo;
  }, [])

  return url + (rList.length ? '?' + rList.join('&') : '');
}

const qiniuUpload = (file, token, filename) => {
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
        console.log('[API] [Qiniu] fileURL: ', res.fileURL);
        resolve(res.fileURL);
      },
      (error) => {
        resolve();
        console.error('error: ', error);
      },
      // null,
      { key: filename, region: options.region },
      (progress) => {
        console.log('上传进度', progress.progress);
        console.log('已经上传的数据长度', progress.totalBytesSent);
        console.log('预期需要上传的数据总长度', progress.totalBytesExpectedToSend);
      },
    );
  });
}

const noop = function () {}

/**
 * 录书有两种方式
 * 扫码：ISBN -> 根据 ISBN 查是否录入 -> 爬虫拿到书的信息 -> 写数据
 * 手动录书：根据 ISBN 查是否录入 -> 写数据
 */
const recordBookByScanOrHand = async function (libId, isbn, book) {
  const result = await callCloudBook({
    type: 'scan',
    data: { libId, isbn, },
  });

  // 1. 方法调用失败
  if (!result || !result.success) {
    return;
  }

  // 2. 数据库存在，提示已经录入
  if (result.data) {
    return { ...result, existed: true, };
  }

  // 3. 来自手动
  let source = book ? { success: true, data: book } : await callCloudBook({ type: 'spider', data: { isbn }, });

  // 4. 爬虫失败
  if (!source || !source.success) return;

  // 5. 自动录入数据库
  return await callCloudBook({
    type: 'create',
    data: { ...source.data, libId, },
  });
}

module.exports = {
  omit: omit,
  noop: noop,
  getUrlVersion: getUrlVersion,
  removeUrlVersion: removeUrlVersion, 
  increateUrlVersion: increateUrlVersion,
  qiniuUpload: qiniuUpload,
  formatTime: formatTime,
  scanAsync: scanAsync,
  getStorageAsync: getStorageAsync,
  setStorageAsync: setStorageAsync,
  removeStorageAsync: removeStorageAsync,
  chooseImageAsync: chooseImageAsync,
  recordBookByScanOrHand: recordBookByScanOrHand,
}
