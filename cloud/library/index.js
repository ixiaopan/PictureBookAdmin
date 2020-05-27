const cloud = require('wx-server-sdk');

cloud.init();

const db = cloud.database();

const _ = db.command;

const userDB = db.collection('users');
const libraryDB = db.collection('libraries');

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

const checkValid = (library) => {
  // 1. 字段校验：标题不得超过6个字
  if (!library) {
    return { success: false, msg: '书馆信息不得为空~', };
  }
  if (!library.title) {
    return { success: false, msg: '书馆名称不得为空~', };
  }

  if (library.title.length > 6) {
    return { success: false, msg: '书馆名称不得超过6个字~', };
  }
}


/**
 * {
 *  user: {},
 *  library: {},
 *  _openid: ''
 * }
 */
async function createLibrary({ library, user, } = {}) {
  // 1. 校验
  const error = checkValid(library);
  if (error) {
    return error;
  }

  // 2.
  let libraryDoc = null;
  try {
    libraryDoc = await libraryDB.add({ data: library, });

    await userDB.doc(user.uid).update({
      data: {
        ...omit(user, 'uid'),
        library: libraryDoc._id,
        libraries: _.unshift(libraryDoc._id),
      },
    });

    // { _id: '', errMsg: 'collection.add:ok' }
    console.log('[createLibrary] library success: ', libraryDoc);
  } catch(e) {
    console.error('[createLibrary] library fail: ', e);
  }

  // 3.
  return { 
    success: true,
    data: {
      libId: libraryDoc._id,
    },
  };
}

/**
 * {
 *   libId: '',
 *   xx: '',
 * }
 */
async function updateLibrary({ libId, ...res } = {}) {
  // 1. 校验
  const error = checkValid(res);
  if (error) {
    return error;
  }

  try {
    const result = await libraryDB.doc(libId).update({ data: res });

    // { stats: { updated: 1 }, errMsg: 'document.update:ok' }
    console.log('[updateLibrary] success:', result);

    return { success: true, };

  } catch(err) {
    console.error('[updateLibrary] fail:', err);
  }
}

exports.main = async (event) => {
  const { type, data, } = event || {};

  switch (type) {
    case 'create':
      return createLibrary(data);

    case 'update':
      return updateLibrary(data);

    case 'remove':
      break;

    default:
  }
  
}
