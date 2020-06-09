const cloud = require('wx-server-sdk');

cloud.init({
  env: 'picturebook-427v3',
});

const db = cloud.database();
const userDB = db.collection('users');

const systemError = {
  success: false,
  errCode: 60001,
  errMsg: '系统错误，请重试~',
};

exports.main = async () => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  // 1.
  let userDoc = null;
  try {
    // 1.1
    const userRes = await userDB.where({ _openid: openid, }).get();

    userDoc = userRes.data[0];

    // 1.2 create it if the user does not exist
    if (!userDoc) {
      userDoc = await userDB.add({
        data: {
          _openid: openid,
          library: '', // current library
          libraries: [], // one can have many libraries
        },
      });
    }
  } catch(error) {
    console.log('[create/get user] fail: ', error);
    return systemError;
  }

  // { _id: '', errMsg: 'collection.add:ok' }
  console.log('[create/get user] success: ', userDoc);

  // 2. 从未拥有过书馆 => 前端显示【创建书馆页面】
  if (!userDoc.library) return {
    success: true,
    data: {
      userInfo: {
        uid: userDoc._id,
      },
    },
  };

  // 3. 查询用户当前书馆(one can own more than one libraries)
  let libraryDoc = null;
  try { // 默认情况下，如果获取不到记录，方法会抛出异常
    libraryDoc = await db.collection('libraries').doc(userDoc.library).get();
  } catch (error) {
    console.error('[get library] fail: ', error);
    return systemError;
  }

  // { data: { _id: '', address: '' } }
  console.log('[get library] success: ', libraryDoc);

  const {
    _id: libId,
    title, cover,
    address, contact, telephone,
    book_count,
  } = libraryDoc.data || {};

  const { _id: uid, nickName = '', avatarUrl = '', library, libraries, } = userDoc;

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
