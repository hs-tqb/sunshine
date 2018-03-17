
const app = getApp();
// pages/index/index.js
Page({
  /**
   * 页面的初始数据
   */
  data: {
    params: '',
    avw: 0,
    avh: 0,
    productId:'',
    merchantId:'',
  },
  onLoad(opts) {
    let merchantId = opts.scene? decodeURIComponent(opts.scene): undefined;
    
    // 缓存期限30天
    let timestamp = Date.now();
    // 如果有传值, 则覆盖缓存
    if ( merchantId ) {
      wx.setStorageSync('merchantId', merchantId);
      wx.setStorageSync('merchantIdTime', timestamp);
    } 
    // 如果没传值
    else {
      let aliveTime = 30 * 24 * 60 * 60 * 1000;   // 毫秒数
      // 并且有缓存, 切缓存是在30天内, 则获取
      if ( +(wx.getStorageSync('merchantIdTime')||0) + aliveTime > timestamp ) {
        merchantId = wx.getStorageSync('merchantId');
      }
    }
    
    // 更新显示
    this.setData({
      merchantId: merchantId
    });

    // 获取 productId
    wx.request({
      url   : app.api.getProductionInfo,
      data  :{ merchantId:merchantId },
      success:(resp)=>{
        app.log(`_______${app.api.getProductionInfo}_______`);
        app.log(resp)
        app.log(`_______${app.api.getProductionInfo}_______`);

        if ( resp.data.state===0 ) {
          return wx.showModal({
            title:'请求错误',
            showCancel:false,
            content:resp.data.message||'getProductionInfo',
            confirmColor:'#e54628'
          });
        }

        // 更新全局数据
        app.globalData.productId  = resp.data.data.productId;
        app.globalData.merchantId = resp.data.data.merchantId;
        app.globalData.orderTimeLimitMin = (resp.data.data.acceptableDays || 10)-1; // 如果包含今天，需要-1
        app.globalData.orderTimeLimitMax = resp.data.data.maxBuyDays || 60;
        app.globalData.orderDaysLimitMin = resp.data.data.leastDays  || 3;


        // 更新显示
        if ( !merchantId ) {
          this.setData({
            merchantId: resp.data.data.merchantId
          });
        }

        // 获取城市
        wx.request({
          url   : app.api.getCities,
          data  : { productId: resp.data.data.productId },
          method: 'POST',
          success:resp=>{
            app.log(`_______${app.api.getCities}_______`);
            app.log(resp)
            app.log(`_______${app.api.getCities}_______`);

            app.globalData.allCities = resp.data.data.areaList || [];
          }
        })
      }
    });
  },
  navToList() {
    // 埋点
    app.tdsdk.event({
      id: 'MyOrder',
    });
    app.util.navigate({
      url:'/pages/list/list'
    });
  },
  onShow() {
    // 埋点
    app.tdsdk.event({
      id: 'Home',
    });
  },
  navToOrder() {
    // 埋点
    app.tdsdk.event({
      id: 'Buy',
    });
    app.util.navigate({
      url:'/pages/order/add/calendar/calendar'
    });
  },
  longtap() {
    return;
    wx.showModal({
      title:'已清空缓存',
      showCancel:false,
      confirmColor:'#e54628'
    })
    wx.clearStorage();
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