const cloud = require('wx-server-sdk')
const rp = require('request-promise')

cloud.init({
  env: 'picturebook-427v3',
});

const db = cloud.database();

const bookDB = db.collection('books');
const libraryDB = db.collection('libraries');

const _ = db.command;

function calculateComplete(book) {
  const fieldList = [
    'cover', 'title', 'isbn', 'price', 'author', 
    'pubdate', 'publisher', 'author_intro', 'summary'
  ];

  const existedField = fieldList.reduce((memo, field) => memo += book[field] ? 1 : 0, 0);

  return Math.round(existedField / fieldList.length * 100);
}

async function spiderDouban({ isbn } = {}) {
  // "image":"https://img3.doubanio.com\/view\/subject\/m\/public\/s29524313.jpg",
  // "title":"SQL基础教程",
  // "isbn13":"9787115455024",
  // "price":"CNY 79.00",
  // "author": ["MICK"],
  // "translator":["孙淼","罗勇"],
  // "pubdate": "2017-6-1",
  // "publisher":"人民邮电出版社",
  // "pages":"320",
  // "author_intro": "作者简介：\nMICK\n日本资深数据库工程师，就职于SI企业，致力于商业智能和数据仓库的开发。为CodeZine（http:\/\/codezine.jp）及IT杂志WEB+DB PRESS撰写技术文章。著作有《跟达人学SQL》《跟达人学DB设计》，是Joe Celko's SQL Puzzles and Answers,Second Edition、Joe Celko's SQL for Smarties,Fourth Edition: Advanced SQL Programming的日文版的译者。\n译者简介：\n孙淼\n从事对日软件设计和研发工作十余年，曾于2007年至2009年赴日学习工作，2015年至今再次长期赴日工作。"
  // "summary":"本书是畅销书《SQL基础教程》第2版，介绍了关系数据库以及用来操作关系数据库的SQL语言的使用方法。书中通过丰富的图示、大量示例程序和详实的操作步骤说明，让读者循序渐进地掌握SQL的基础知识和使用技巧，切实提高编程能力。每章结尾设置有练习题，帮助读者检验对各章内容的理解程度。另外，本书还将重要知识点总结为“法则”，方便读者随时查阅。第2版除了将示例程序更新为对应新版本的DB的SQL之外，还新增了一章，介绍如何从应用程序执行SQL。",
  // "rating": {"max":10,"numRaters":286,"average":"8.9","min":0},
  // "tags": [{"count":245,"name":"SQL","title":"SQL"},{"count":147,"name":"数据库","title":"数据库"}]

  const doubanAPI = `https://api.douban.com/v2/book/isbn/${isbn}?apikey=0df993c66c0c636e29ecbb5344252a4a`;

  let result = null;

  try {
    result = await rp(doubanAPI);
    result = JSON.parse(result);
  } catch (e) {
    console.log('[cloud][spider] error: ', e);
  }

  if (!result) return;

  const { 
    image, 
    isbn13, 
    title, 
    price, author, translator, 
    pubdate, publisher, pages, 
    author_intro, summary,
    rating,
  } = result || {};

  const { average: rate, numRaters } = rating || {};

  return {
    success: true,
    data: {
      cover: image,
      isbn: isbn13, 
      title,
      price, 
      author: (author || []).join(','),
      translator: (translator || []).join(','),
      pubdate, publisher, pages, 
      author_intro, summary,
      rate, numRaters,
    },
  };
}

async function getBookListRefInLibrary(libId) {
  const libRes = await libraryDB.where({ _id: libId }).get();

  const myLib = libRes.data[0] || {};

  const { books } = myLib;

  return await bookDB.where({ libId, _id: _.in(books) });
}

/**
 * 录入新书
 * {
 *   libId: ''
 *   isbn: ''
 * }
 */
async function createBook(book) {
  book = {
    ...book, 
    create_time: +new Date(), // 首次录入时间
    complete: calculateComplete(book), // 信息完整度
  };

  try {
    const bookListRef = await getBookListRefInLibrary(book.libId);

    const bookRes = await bookListRef.where({ isbn: book.isbn }).get();
    const existedBookDoc = bookRes.data[0];

    let result = null, docId;
    if (existedBookDoc) {
      docId = existedBookDoc._id;
      await bookDB.doc(docId).update({ data: book, });
    } else {
      result = await bookDB.add({ data: book, });
      docId = result._id;
    }

    await libraryDB.doc(book.libId).update({ 
      data: {
        books: _.unshift([ docId ]),
        book_count: _.inc(1),
      },
    });

    console.log('[createBook] success: ', result);
  
    return { 
      success: true, 
      data: { ...book, _id: docId },
    };
  } catch (e) {
    console.error('[createBook] fail: ', e);
  }
}

/**
 * 更新书的数据
 * {
 *   _id: '',
 *   xx: ''
 * }
 */
async function updateBook({  _id, ...rest } = {}) {
  rest = { 
    ...rest, 
    updated_time: +new Date(), // 最后更新时间
    complete: calculateComplete(rest), // 信息完整度
  };

  try {
    await bookDB.doc(_id).update({ data: rest });
    return { success: true, };
  } catch (e) {
    console.error('[updateBook] fail: ', e);
  }
}

/**
 * 删除一本书
 * {
 *   libId: ''
 *   _id: '',
 * }
 */
async function deleteBook({ libId, _id } = {}) {
  try {
    const result = await bookDB.doc(_id).remove();

    console.log('[deleteBook] result', result);

    // TODO: 更新书馆的字段
    await libraryDB.doc(libId).update({ 
      data: {
        books: _.pull(_id),
        book_count: _.inc(-1),
      },
    });
  
    return { success: true, };
  } catch (e) {
    console.error('[deleteBook] fail: ', e);
  }
}

/**
 * 根据ID获取书本详情
 * {
 *   _id
 * }
 */
async function queryBookDetailById({ _id } = {}) {
  try {
    const result = await bookDB.doc(_id).get();
    return { success: true, data: result.data, };
  } catch(e) {
    console.error('[queryBookDetailById] fail: ', e);
  }
} 

/**
 * 条件查询：默认、录入时间、信息完整度、评分
 * {
 *   libId
 * }
 */
async function queryBookList({ libId, page = 1, pageSize = 10, sortField = '', sortType = '' } = {}) {
  try {
    let bookListRef = await getBookListRefInLibrary(libId);

    if (sortField) {
      // create_time, rate, complete asc 升序, desc 降序
      bookListRef = await bookListRef.orderBy(sortField, sortType); // 
    }

    const { total } = await bookListRef.count();
    const listRes = await bookListRef.skip(pageSize * (page - 1)).limit(pageSize).get();

    return {
      success: true,
      data: {
        list: listRes.data || [],
        pageSize,
        page: page + 1,
        total,
      }, 
    };
  } catch(e) {
    console.error('[queryBookList] fail: ', e);
  }
}

/**
 * 扫码拿到 ISBN 查询，在不在数据库
 * {
 *   libId: ''
 *   isbn: '',
 * }
 */
async function queryBookDetailByScan({ libId, isbn } = {}) {
  try {
    const bookListRef = await getBookListRefInLibrary(libId);
 
    const bookRes = await bookListRef.where({ isbn }).get();
    const existedBookDoc = bookRes.data[0];

    return { success: true, data: existedBookDoc, };
  } catch (e) {
    console.error('[cloud] [bookDetailByScan] fail: ', e);
  }
}

/**
 * 根据搜索模糊查询
 */
async function queryBookListBySearch({ libId, bookname } = {}) {
  try {
    const bookListRef = await getBookListRefInLibrary(libId);
 
    const bookRes = await bookListRef.where({ 
      title: db.RegExp({
        regexp: '.*' + bookname + '.*',
        options: 'i',
      }),
    }).get();

    return { success: true, data: bookRes.data || [], };
  } catch (e) {
    console.error('[cloud] [queryBookListBySearch] fail: ', e);
  }
}

exports.main = async (event) => {
  const { type, data } = event || {};

  console.log(`[book] [${type}] start: `, data);

  switch (type) {
    case 'spider':
      return spiderDouban(data);
    
    case 'create':
      return createBook(data);

    case 'update':
      return updateBook(data);

    case 'delete':
      return deleteBook(data);

    case 'query':
      return queryBookList(data);

    case 'detail':
      return queryBookDetailById(data);

    case 'scan':
      return queryBookDetailByScan(data);
    
    case 'search':
      return queryBookListBySearch(data);
    
    default:
  }
};
