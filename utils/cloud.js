const callCloudLogin = () => {
  return wx.cloud.callFunction({
    name: 'login',
    data: {},
  })
  .then(res => {
    const { result } = res || {};

    if (!result || !result.success) {
      console.log('[cloud] [login] empty');
    }

    console.log('[cloud] [login] success: ', result);

    return result;
  })
  .catch(err => {
    console.log('[cloud] [login] catch: ', err);
  });
}

const callCloudLibrary = ({ type, data } = {}) => {
  return wx.cloud.callFunction({
    name: 'library',
    data: {
      type, 
      data,
    },
  })
  .then(res => {
    const { result } =  res || {};

    if (!result || !result.success) {
      console.log('[cloud] [library] empty');
    }

    console.log(`[cloud] [library] [${type}] success: `, result);

    return result;
  })
  .catch(err => {
    console.log(`[cloud] [library] [${type}] catch: `, err);
  });
}

const callCloudBook = ({ type, data } = {}) => {
  return wx.cloud.callFunction({
    name: 'book',
    data: { type, data, },
  })
  .then(res => {
    const { result } =  res || {};

    if (!result || !result.success) {
      console.log(`[cloud] [book] [${type}] empty`);
    }

    console.log(`[cloud] [book] [${type}] success: `, result);

    return result;
  })
  .catch(err => {
    console.log(`[cloud] [book] [${type}] catch: `, err);
  });
}

const callCloudQiniuToken = ({ type, data } = {}) => {
  return wx.cloud.callFunction({
    name: 'token',
    data: { type, data },
  })
  .then(res => {
    console.log(`[cloud] [qiniu-token] ${type} success: `, res);
    return res && res.result;
  })
  .catch(err => {
    console.log(`[cloud] [qiniu-token] ${type} fail: `, err);
  });
}

module.exports = {
  callCloudLogin: callCloudLogin,
  callCloudBook: callCloudBook,
  callCloudLibrary: callCloudLibrary,
  callCloudQiniuToken: callCloudQiniuToken,
}
