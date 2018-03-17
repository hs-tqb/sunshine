
const app = getApp();
// const test  = require('./test.js');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    price :10,
    prices: [5,10,20,50],
    modalShow  :false,
    modalActive:false,
    modalLeave :false,

    payoutInfo :[],
    triggerInfo:[],
    triggerExplain :'',
    triggerStandard:'',
    stations:'',
  },
  // 事件绑定
  changePrice(e) {
    this.setData({
      modalShow :true,
      modalLeave:false,
      modalActive:false
    });
    setTimeout(() => {
      this.setData({
        modalActive: true
      });
    }, 10);
  },
  closeModal(e) {
    this.setData({
      modalLeave: true,
    });
    setTimeout(()=>{
      this.setData({
        modalShow:false
      });      
    }, 200);
  },
  doChangePrice(e) {
    let price = this.data.prices[ e.target.dataset.index ]; 
    
    // 更新全局信息
    app.globalData.contractInfo.payFee = price;

    // 埋点
    app.tdsdk.event({
      id: 'ChanPri',
      params: {
        key1:price
      }
    });

    this.setData({
      price,
      ...this.parseOrderInfo(app.globalData.contractInfo)
    });
    this.closeModal();
  },

  payforOrder() {
    app.util.navigate({
      url: '/pages/order/add/contacts/contacts',
    });
    // 检测是否已经绑定手机
    // wx.request({
    //   url: app.api.checkAccountBinded,
    //   data:{},
    //   success(resp) {
    //     // 如果已绑定, 直接跳付款; 否则跳绑定
    //     wx.navigateTo({
    //       url: resp.bind === 1 ? '../add/pay/pay': '../add/contacts/contacts',
    //     });
    //   }
    // })


    // 埋点
    app.tdsdk.event({
      id: 'CfmPlan'
    });
  },
  onLoad(opts) {
    app.globalData.contractInfo.payFee = this.data.price;
    let parsedData = this.parseOrderInfo( app.globalData.contractInfo );
    let stations   = parsedData.triggerInfo.map(item=>{
      return item.cityName + ' ' + item.cityId;
    }).join('，');
    
    this.setData({
      ...parsedData,
      stations
    });
  },
  // 解析订单信息
  parseOrderInfo(data) {
    let calendar  = app.globalData.calendarPage;
    let price = data.payFee || this.data.price;
    if ( !calendar ) return;
    // 赔付
    let payoutInfo = data.payoutRuleParam.split('|').map((item,temp)=>{
      temp = item.split(':');
      return {
        day:temp[0],
        sum:app.util.formatMoney(+temp[1]*price*100)
      };
    });
    
    // 更新全局信息
    app.globalData.contractInfo.maxPayout = payoutInfo[payoutInfo.length-1].sum;
    
    // 触发    
    let triggerInfo = app.globalData.contractInfo.cities.map(item=>{
      return { cityName:item.cityName, cityId:item.cityId, description:`日降水量 > ${data.threshold}mm` };
    });
    // 触发解释
    let triggerExplain  = this.parseTriggerExplain(data.threshold);
    // 触发标准
    let triggerStandard = `> ${data.threshold}mm`;
    /*
    // 赔付
    let payout  = data.contract[0].payoutRuleParam.split('|').map((item,temp)=>{
      temp = item.split(':');
      return {
        day:temp[0],
        sum:app.util.formatMoney(temp[1])
      };
    });
    // 触发
    let trigger = data.contract.map(item=>{
      return {
        cityName:item.cityName, 
        description:`${item.weatherType} ${item.opType} ${item.triggerRuleParam}${item.unit}`
      };
    });
    */

    return { payoutInfo, triggerInfo, triggerExplain, triggerStandard };
  },
  parseTriggerExplain(val) {
    var exp = '';
    if ( val <= 10 ) {
      exp = '小雨';
    } else if ( val <= 25 ) {
      exp = '中雨'
    } else if ( val <= 50 ) {
      exp = '大雨'
    } else {
      exp = '暴雨'
    }

    return exp;
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