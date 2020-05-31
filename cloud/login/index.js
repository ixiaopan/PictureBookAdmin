const cloud = require('wx-server-sdk');

cloud.init({
  env: 'picturebook-427v3',
});

const db = cloud.database();
const userDB = db.collection('users');

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  // 1. 
  const userRes = await userDB.where({ _openid: openid, }).get();

  // { data: [], errMsg: 'collection.get:ok' }
  console.log('查询用户信息: ', userRes);

  let userDoc = userRes.data[0];

  if (!userDoc) {
    try {
      userDoc = await userDB.add({
        data: { 
          _openid: openid, 
          library: '', // current library
          libraries: [],
        },
      });
  
      // { _id: '', errMsg: 'collection.add:ok' }
      console.log('[create user] success: ', userDoc);
    } catch (e) {
      console.log('[create user] fail: ', e);
    }
  }

  // 创建失败 => 前端显示【错误页面】
  if (!userDoc) {
    return { 
      errCode: 10, 
      success: false, 
      msg: '系统错误，请重试~',
    };
  }

  // 2. 新用户 => 前端显示【创建页面】
  if (!userDoc.library) return {
    success: true,
    data: {
      userInfo: {
        uid: userDoc._id,
      },
    },
  };

  // 3. 查询书馆
  let libraryDoc = null;
  try { // 默认情况下，如果获取不到记录，方法会抛出异常
    libraryDoc = await db.collection('libraries').doc(userDoc.library).get();
  } catch (e) {}

  // { data: { _id: '', address: '' } }
  console.log('查询书馆信息: ', libraryDoc);

  // 4. 查询书馆异常 => 前端显示【错误页面】
  if (!libraryDoc) {
    return { 
      errCode: 10, 
      success: false, 
      msg: '系统错误，请重试~',
    };
  }

  // 5. 自定义数据字段 => 前端显示【首页】
  const { 
    _id: libId, 
    title, cover,
    address, contact, telephone,
    book_count,
  } = libraryDoc.data || {};

  const { _id: uid, library, libraries, nickName = '', avatarUrl = '', } = userDoc;

  return {
    success: true,
    data: {
      userInfo: {
        uid,
        nickName,
        avatarUrl,
        library, 
        libraries,
      },
      libraryInfo: {
        libId, 
        title, 
        cover,
        address, 
        contact, 
        telephone,
        book_count,
      },
    },
  };
}
