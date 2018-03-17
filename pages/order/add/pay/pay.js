// pages/order/add/pay/pay.js
const app = getApp();

Page({

  /**
   * 页面的初始数据
   */
  data: {
    coupon: { state:'empty', code:'', amount:0.99, message:'' },
  },
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad() {
    // 更新全局信息
    app.globalData.contractInfo.finalPayFee = app.globalData.contractInfo.payFee

    this.setData({
      ...app.globalData.contractInfo,
      cities: app.globalData.contractInfo.cities.map(item=>item.cityName).join(', ')
      // payFee:10
    })
  },
  getRandomStr(len, str) {
    str = str || '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-';
    let l = str.length, 
        r = [];
    for (let i=0; i<len; i++) {
      r.push( str[Math.floor(Math.random()*l)] )
    }
    return r.join('');
  },
  addOrder() {
    // contractId: contractId,
    // // 购买金额 是每份价格 * 100 （单位是分）
    // orderPrice: Math.floor(contractModule.getPerPrice() * 100),
    // mobile     : __tqb_outerOrderInfo.user[0].phone,
    // couponCode : __tqb_outerOrderInfo.couponCode,
    // insuredInfo: safeguardInfo

    if ( this.requestTask ) {
      this.requestTask.abort();
    }

    let encodeInsuredInfo = [{
      ...app.globalData.contractInfo.insuredInfo[0],
      insuredName:encodeURIComponent(app.globalData.contractInfo.insuredInfo[0].insuredName)
    }];

    // 通过, 下单
    this.requestTask = wx.request({
      url : app.api.addOrder,
      data: {
        mid:'wafer',
        contractId : app.globalData.contractInfo.contractId,
        orderPrice : parseInt( (app.globalData.contractInfo.payFee).toFixed(2) * 100 ),
        mobile     : this.data.insuredInfo[0].insuredMobile,
        couponCode : this.data.coupon.code,
        insuredInfo: encodeInsuredInfo
      },
      success:resp=>{
        app.log(`_______${app.api.addOrder}_______`);
        app.log(resp)
        app.log(`_______${app.api.addOrder}_______`);
        
        if ( resp.data.state !== 1 ) {
          wx.showModal({
            title  : '下单失败',
            content: resp.data.message,
            showCancel: false,
            confirmColor:'#e54628'
          });
        } else {
          if ( resp.data.data.immediatePay == 1 ) {
            app.globalData.isOrderNeedToPay = true;
          } else {
            app.globalData.isOrderNeedToPay = false;
          }

          app.globalData.hasAddOrder = true;
          this.doPay();
        }
      }
    })
  },
  doPay() {
    // 如果没有下订单
    if ( !app.globalData.hasAddOrder ) {
      return this.addOrder();
    }

    // 埋点
    app.tdsdk.event({
      id: 'Pay'
    });

    // if ( app.globalData.contractInfo.finalPayFee === 0 ) {
    if ( !app.globalData.isOrderNeedToPay ) {
      return wx.redirectTo({
        url: '../result/result',
      });
    }

    if ( this.requestTask ) {
      this.requestTask.abort();
    }
    // 请求支付参数
    this.requestTask = wx.request({
      url : app.api.getPaymentParams,
      data: {
        // outTradeNo: this.getRandomStr(10),
        outTradeNo: app.globalData.contractInfo.contractId,
        totalFee  : parseInt( (app.globalData.contractInfo.finalPayFee).toFixed(2) * 100 ),
        // totalFee  : 1,
        body      : '101',
        rUrl      : 'null',
        openid    : app.globalData.openId 
      },
      header : { 'content-type':'application/json;charset=utf-8' },
      success:(resp)=>{
        app.log(`_______${app.api.getPaymentParams}_______`);
        app.log(resp)
        app.log(`_______${app.api.getPaymentParams}_______`);
        if ( resp.data.state !== 1 ) {
          return wx.showModal({
            title  : '发起请求失败',
            content: resp.data.message,
            showCancel: false,
            confirmColor:'#e54628'
          });
        }
          

        // 唤起支付
        wx.requestPayment({
          ...resp.data.data,
          success:resp=>{
            app.log(`_______payment success_______`);
            app.log(resp)
            app.log(`_______payment success_______`);

            // 埋点
            app.tdsdk.event({
              id: 'PayOK'
            });

            wx.showToast({
              title: '支付成功',
              icon: 'success',
              duration: 1000
            });

            wx.redirectTo({
              url: '../result/result',
            });

          },
          fail:resp=>{
            // if ( resp.data.state !== 1 ) {
            //   this.isPaying = false;
            //   return wx.showModal({
            //     title  : '支付失败',
            //     content: resp.data.message,
            //     showCancel: false,
            //     confirmColor:'#e54628'
            //   });
            // }
            app.log(`_______payment fail_______`);
            app.log(resp)
            app.log(`_______payment fail_______`);
          },
        })
      }
    })
    return;
  },

  // 输入优惠码
  couponInputTimer : -1,
  couponInputDelay : 500,
  couponRequestTask: null,
  couponInput(e) {
    let val         = e.detail.value.trim();
    let coupon      = { state:'', amount:0, code:val, message:'' };
    let finalPayFee = app.globalData.contractInfo.payFee;
    
    // 去除 超时任务 和 重复的请求
    clearTimeout(this.couponInputTimer);
    if ( this.couponRequestTask ) {
      this.couponRequestTask.abort();
    }
    // 如果清空了输入
    if ( !val ) {
      coupon.state   = 'empty';
      coupon.message = '';

      // 更新全局信息
      app.globalData.contractInfo.finalPayFee = finalPayFee;

      return this.setData({coupon, finalPayFee});
    }

    this.couponInputTimer = setTimeout(()=>{
      this.couponRequestTask = wx.request({
        url : app.api.findCoupons,
        data: {
          productId: app.globalData.productId,
          mobile   : this.data.insuredInfo[0].insuredMobile,
          coupons  : val
        },
        success:(resp)=>{

          if ( resp.data.state !== 1 ) {
            coupon.state   = 'error';
            coupon.message = '请求错误';
          } else {
            let amount = (resp.data.data? resp.data.data.discountAmount/100:0);
            if ( amount === 0 ) {
              coupon.state   = 'failed';
              coupon.message = '无效的优惠码'
            } else {
              coupon.state   = 'success';
              coupon.amount  = amount;
              finalPayFee    = (finalPayFee*100 - amount*100)/100;

              
              /**
               * 如果优惠金额大于订单金额, 置为 0
               * 理应直接置 0
               * 但这样会导致没法区分这个0是 初始值 还是 最终值
               * 所以置为 -1
               */
              app.globalData.contractInfo.finalPayFee
                  = finalPayFee
                  = finalPayFee<0 ? 0 : finalPayFee;

            }
          }

          this.setData({
            coupon,
            finalPayFee
          })
        }
      })
    }, this.couponInputDelay);
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