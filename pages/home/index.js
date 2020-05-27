const { $Toast } = require('../../dist/base/index');

const { 
  callCloudBook,
} = require('../../utils/cloud');

Page({
  data: {
    loading: false,
    scanBook: {
    }
  },

  libId: '',

  onLoad() {
    this.libId = getApp().globalData.libraryInfo.libId;
  },

  onShow() {
    const { title = '' } = getApp().globalData.libraryInfo || {};
    wx.setNavigationBarTitle({ title, });
  },

  onBookTap: function (e) {
    const { _id } = e.detail || {}

    wx.navigateTo({
      url: `/pages/record/index?bookid=${_id}`,
    });
  },

  onScanTap: function (e) {
    const { isbn } = e.detail;

    this.setData({
      loading: true,
    });

    callCloudBook({
      type: 'scan',
      data: {
        libId: this.libId,
        isbn,
      },
    })
    .then(result => {
      // 1. 查询失败
      if (!result || !result.success) {
        this.setData({ loading: false, });
        return $Toast({ content: '查询失败，请重试!', type: 'error', });
      }

      // 2. 数据库存在
      if (result.data) {
        this.setData({ 
          loading: false,
          scanBook: result.data,
        });

        return $Toast({ content: '已经录入~', type: 'error', });
      }

      // 不存在，自动爬虫
      callCloudBook({
        type: 'spider',
        data: { isbn, },
      })
      .then(res => {
        if (!res || !res.success) {
          this.setData({ loading: false, });
          return $Toast({ content:  '录入失败，请重试!', type: 'error', });
        }

        // 自动写入数据
        callCloudBook({
          type: 'create',
          data: {
            ...res.data,
            libId: this.libId,
          },
        })
        .then(ret => {
          if (ret && ret.success) {
            this.setData({
              loading: false,
              scanBook: {
                ...res.data,
                _id: ret.data._id,
              },
            });
          }
        })
        .catch(() => {
          this.setData({ loading: false, });
          return $Toast({ content:  '录入失败，请重试!', type: 'error', });
        });
      });
    });
  },
})
