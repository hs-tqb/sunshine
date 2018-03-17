// pages/order/add/result/result.js
const app = getApp();
Page({

  /**
   * 页面的初始数据
   */
  data: {
  },
  onLoad() {
    this.setData({
      ...app.globalData.contractInfo,
      cities: app.globalData.contractInfo.cities.map(item=>item.cityName).join(', '),
    });
    // 更新全局数据
    app.globalData.hasAddOrder = false;
  },
  handleLongPress: function(e) {
    // wx.scanCode({ onlyFromCamera: false });
  },
  share:e=>{
    app.log('share');
    wx.showShareMenu({
      withShareTicket: true
    })
  },
  backToHome: function() {
    // 返回首页
    wx.navigateBack({
      delta: 4
    });
  },
  onShareAppMessage: function (res) {
    if (res.from === 'button') {
      // 来自页面内转发按钮
      // console.log(res.target)
    }
    return {
      title: '晴空万里宝',
      path: '/pages/index/index',
      imageUrl: '/pages/images/bg-share.jpg',
    }

    // 埋点
    app.tdsdk.event({
      id: 'Share',
    });
  }
})