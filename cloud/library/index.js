const cloud = require('wx-server-sdk');
const xlsx = require('node-xlsx');

cloud.init({
  env: 'picturebook-427v3',
});

const db = cloud.database();
const _ = db.command;

const bookDB = db.collection('books');
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

/**
 * 生成书馆二维码
 */
async function createQRCode ({ libId } = {}) {
  try {
    const { buffer } = await cloud.openapi.wxacode.get({
      path: 'page/welcome/index',
      width: 430
    });

    const { fileID } =  await cloud.uploadFile({
      cloudPath: libId + '/wxacode.png',
      fileContent: buffer,
    });

    // 
    const res = await cloud.getTempFileURL({
      fileList: [ fileID ],
    });

    const { tempFileURL } = res.fileList[0] || {};

    return { success: true, data: { qrcodeURL: tempFileURL }, };
  } catch (err) {
    console.error('[createQRCode] fail:', err);
  }
}

const exportLibrary = async function ({ libId } = {}) {
  try {
    const libRes = await libraryDB.where({ _id: libId }).get();

    const { books } = libRes.data[0] || {};

    let allBooks = await bookDB.where({ libId, _id: _.in(books) }).get();

    allBooks = allBooks.data;

    if (!allBooks || !allBooks.length) {
      return;
    }

    // 1.
    const rowFields = ['isbn', 'title', 'cover', 'price', 'author', 'translator', 'pubdate', 'publisher', 'pages', 'author_intro', 'summary', 'rate', 'numRaters'];
    const rowHeader = ['isbn', '名称', '封面', '价格', '作者', '译者', '出版时间', '出版社', '总页数', '作者简介', '内容简介', '评分', '评价人数'];

    // 2.
    const table = allBooks.reduce((memo, book) => {
      const record = rowFields.map(key => book[key]);

      memo.push(record);

      return memo;
    }, []);
    table.unshift(rowHeader);

    // 
    const buffer = await xlsx.build([{
      name: 'sheet',
      data: table,
    }]);
    const result =  await cloud.uploadFile({
      cloudPath: libId + '/library.xlsx',
      fileContent: buffer,
    });

    // 
    const { fileID } = result || {};
    const res = await cloud.getTempFileURL({
      fileList: [ fileID ],
    });
    const { tempFileURL } = res.fileList[0] || {};

    return { success: true, data: { fileUrl: tempFileURL }, };
  } catch (e) {
    console.error('[cloud] [exportLibrary] fail: ', e);
  }
}

exports.main = async (event) => {
  const { type, data, } = event || {};

  console.log(`[library] [${type}] start: `, data);

  switch (type) {
    case 'create':
      return createLibrary(data);

    case 'update':
      return updateLibrary(data);

    case 'remove':
      break;

    case 'qrcode':
      return createQRCode(data);
   
    case 'export':
      return exportLibrary(data);

    default:
  } 
}
