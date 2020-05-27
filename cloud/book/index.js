const cloud = require('wx-server-sdk')
const rp = require('request-promise')

cloud.init()

const db = cloud.database();

const bookDB = db.collection('books');
const libraryDB = db.collection('libraries');

const _ = db.command;

function calculateComplete(book) {
  const fieldList = [
    'cover', 'title', 'isbn', 
    'library_inner_index', 'price', 'author', 'translator', 
    'pubdate', 'publisher', 'author_intro', 'summary'
  ];

  const existedField = fieldList.reduce((memo, field) => memo += book[field] ? 1 : 0, 0);

  return Math.round(existedField / fieldList.length * 100);
}

/**
 * {
 * }
 */
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

  const { books } = libRes.data[0] || {};

  return await bookDB.where({ libId, _id: _.in(books) });
}

/**
 *
 * {
 *   libId: ''
 *   xx: ''
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

    let result = null;
    if (existedBookDoc) {
      await bookDB.doc(existedBookDoc._id).update({ data: book, });
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

    console.log('[createBook] success', result);
  
    return { 
      success: true, 
      data: {
        _id: result._id,
      },
    };
  } catch (e) {
    console.error('[createBook] fail: ', e);
  }
}

/**
 *
 * {
 *   libId: ''
 *   _id: '',
 *   xx: ''
 * }
 */
async function updateBook({ libId, _id, ...rest } = {}) {
  rest = { 
    ...rest, 
    updated_time: +new Date(), // 最后更新时间
    complete: calculateComplete(rest), // 信息完整度
  };

  try {
    await bookDB.where({ libId, }).doc(_id).update({ data: rest });
    return { success: true, };
  } catch (e) {
    console.error('[updateBook] fail: ', e);
  }
}

/**
 * TODO:
 * {
 *   libId: ''
 *   _id: '',
 * }
 */
async function removeBook({ libId, _id } = {}) {
  try {
    const result = await bookDB.where({ libId: libId, }).doc(_id).remove();

    // 更新书馆的字段
    await libraryDB.doc(libId).update({ 
      data: {
        books: _.pull(result._id),
        book_count: _.inc(-1),
      },
    });
  
    return { success: true };
  } catch (e) {
    console.error('[removeBook] fail: ', e);
  }
}

/**
 * {
 *   libId
 *   _id
 * }
 */
async function queryBookDetailById({ libId, _id } = {}) {
  try {
    const result = await bookDB.where({ libId, _id, }).get();
    return { success: true, data: result.data[0], };
  } catch(e) {
    console.error('[queryBookDetailById] fail: ', e);
  }
} 

/**
 * {
 *   libId
 * }
 */
async function queryBookList({ libId, page = 0, pageSize = 10, sortField = '', sortType = '' } = {}) {
  try {
    let bookListRef = await getBookListRefInLibrary(libId);

    if (sortField) {
      // create_time, rate, complete
      bookListRef = await bookListRef.orderBy(sortField, sortType); // asc 升序, desc 降序
    } 

    const totalList = bookListRef.count();

    const listRes = await bookListRef.skip(pageSize * page).limit(pageSize).get();

    return {
      success: true,
      data: {
        list: listRes.data || [],
        pageSize,
        page: page + 1,
        total: totalList,
      }, 
    };
  } catch(e) {
    console.error('[queryBookList] fail: ', e);
  }
}

/**
 * TODO:
 * {
 *   libId: ''
 *   _id/isbn: '',
 * }
 */
async function queryBookDetailByScan({ libId, isbn } = {}) {
  try {
    const bookListRef = await getBookListRefInLibrary(libId);
 
    const bookRes = await bookListRef.where({ isbn }).get();
 
    const existedBookDoc = bookRes.data[0];

    return { success: true, data: existedBookDoc, };
  } catch (e) {
    console.error('[cloud] [bookdetailbyscan] fail: ', e);
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

    case 'remove':
      return removeBook(data);

    case 'query':
      return queryBookList(data);

    case 'detail':
      return queryBookDetailById(data);

    case 'scan':
      return queryBookDetailByScan(data);

    default:
  }  
};
