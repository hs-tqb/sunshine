//app.js
const util = require('./utils/util.js');
const api  = require('./api/index.js');

require('./tdweapp.js');

App({
  onLaunch: function (opts) {
    this.globalData.merchantId = opts.query.merchantId;

    /*
    // 获取 productId
    wx.request({
      url   : api.getProductionInfo,
      data  :{ merchantId:opts.merchantId },
      success:(resp)=>{
        this.log(`_______${api.getProductionInfo}_______`);
        this.log(resp)
        this.log(`_______${api.getProductionInfo}_______`);

        if ( resp.data.state===0 ) {
          return wx.showModal({
            title:'请求错误',
            showCancel:false,
            content:resp.data.message||'getProductionInfo',
            confirmColor:'#e54628'
          });
        }
        // 更新全局数据
        this.globalData.productId = resp.data.data.productId;
        this.globalData.merchantId = resp.data.data.merchantId;


        // 获取城市
        wx.request({
          url   : api.getCities,
          data  : { productId: resp.data.data.productId },
          method: 'POST',
          success:resp=>{
            this.log(`_______${api.getCities}_______`);
            this.log(resp)
            this.log(`_______${api.getCities}_______`);

            this.globalData.allCities = resp.data.data.areaList || [];
          }
        })
      }
    });
    */

    // 获取用户 openId
    let openId = wx.getStorageSync('openId');
    if ( openId ) {
      this.globalData.openId = openId;
      this.log(`_______从本地缓存获取_______`);
      this.log( openId );
      this.log(`_______从本地缓存获取_______`);
    } else {
      // 登录获取
      wx.login({
        success: res => {
          // 获取 openId
          wx.request({
            url    : api.getOpenId,
            data   : { code:res.code },
            // method : 'POST',
            success:resp=>{
              this.log(`_______${api.getOpenId}_______`);
              this.log(resp)
              this.log(`_______${api.getOpenId}_______`);
              
              this.globalData.openId = resp.data;
              wx.setStorageSync('openId', resp.data);
            }
          });
        }
      });
    };

    /* 检查登录是否有效
    wx.checkSession({
      success: ()=>{
        //session 未过期，并且在本生命周期一直有效
      },
      fail: ()=>{
        //登录态过期
        wx.login() //重新登录
      }
    })
    */

    /* 获取用户信息
    wx.getUserInfo({
      success: res => {
        this.globalData.userInfo = res.userInfo
      }
    });
    */
    
    // 获取用户信息
    wx.getSetting({
      success: res => {
        if (res.authSetting['scope.userInfo']) {
          // 已经授权，可以直接调用 getUserInfo 获取头像昵称，不会弹框
          wx.getUserInfo({
            success: res => {
              // 可以将 res 发送给后台解码出 unionId
              this.globalData.userInfo = res.userInfo
              // 由于 getUserInfo 是网络请求，可能会在 Page.onLoad 之后才返回
              // 所以此处加入 callback 以防止这种情况
              if (this.userInfoReadyCallback) {
                this.userInfoReadyCallback(res)
              }
            }
          })
        }
      }
    });
  },
  onShareAppMessage: function (res) {
    if (res.from === 'button') {
      // 来自页面内转发按钮
      // console.log(res.target)
    }
    return {
      title: '天气宝',
      path: '/pages/index/index',
      success: function(res) {
        // 转发成功
      },
      fail: function(res) {
        // 转发失败
      }
    }

    // 埋点
    app.tdsdk.event({
      id: 'Share',
    });
  },
  api : api,
  util: util,
  // log : console.log,
  log : ()=>{},
  globalData: {
    userInfo    : null,
    productId   : '',
    contractInfo: {},
    openId      : '',
    allCities   : [],
    hasAddOrder : false
  },
})
