// pages/order/add/contacts/contacts.js
const app = getApp();
Page({
  /**
   * 页面的初始数据
   */
  data: {
    resendVfCodeCountDown: null,     // 重新发送验证码的倒计时
    resendVfCodeDelay    : 60,       // 重新发送的延迟(s),
    hasReadNotice        : true,
    insuredInfo          : {},
    orderable            : false,
  },

  onLoad() {
    let insuredInfo = (wx.getStorageSync("insuredInfo")||[{}])[0];

    this.name = insuredInfo.insuredName;
    this.idNumber = insuredInfo.insuredCard;
    this.phoneNumber = insuredInfo.insuredMobile;

    this.setData({
      insuredInfo
    })
  },
  /**
   * 内部处理函数
   */
  // 倒计时
  countDownTimer:0,
  countDown(cd) {
    clearTimeout( this.countDownTimer );

    if ( cd === 0 ) {
      this.setData({
        hasVfCodeSent: false
      });
      return;
    }
    
    this.setData({
      hasVfCodeSent: true,
      resendVfCodeCountDown: cd
    });

    this.countDownTimer = setTimeout(()=>{
      this.countDown(cd-1);
    }, 1000);
  },
  checkPhoneNumberValidity(pn) {
    return /^1[3456789]\d{9}$/.test(pn.trim());
  },
  checkIdNumberValidity(id) {
    return /^\d{17}[\dxX]$/.test(id);
  },
  /**
   * 事件绑定
   */
  closeModal(e) {
    if ( e.target.dataset.control === 'close' ) {
      this.setData({
        hasReadNotice:true
      });
    }
  },
  doPromise(e) {
    // 存储记录
    wx.setStorageSync('hasReadNotice', true);

    // 夹带确认
    this.confirmUserInfo();

    // 埋点
    app.tdsdk.event({
      id: 'CfmTrue'
    });
  },
  // 因为不需要驱动dom, 所以干脆放在data外面
  name:'',
  idNumber:'',
  phoneNumber: '',
  vfCode:'',
  inputTimer:-1,

  // 埋点, 一次性
  hasInpName:false,
  hasInpId  :false,
  hasInpPho :false,
  hasInpSMS :false,
  hasSentSMS:false,
  input(e) {
    this[e.target.dataset.name] = e.detail.value.trim();
    clearTimeout(this.inputTimer);
    this.inputTimer = setTimeout(()=>{
      this.setData({
        orderable:!!this.name 
                  && !!this.vfCode 
                  && this.checkIdNumberValidity(this.idNumber) 
                  && this.checkPhoneNumberValidity(this.phoneNumber)
      })
    }, 300);

    let id = '';
    if ( e.target.dataset.name === 'name' && !this.hasInpName ) {
      id="inpName";
      this.hasInpName = true;
    }
    else if ( e.target.dataset.name === 'idNumber' && !this.hasInpId ) {
      id="inpId";
      this.hasInpId = true;
    }
    else if ( e.target.dataset.name === 'phoneNumber' && !this.hasInpPho ) {
      id="inpPhe";
      this.hasInpPhe = true;
    }
    else if ( e.target.dataset.name === 'vfCode' && !this.hasInpSMS ) {
      id="inpSMS";
      this.hasInpSMS = true;
    }
    if ( !id ) return;
    // 埋点
    app.tdsdk.event({
      id: id
    });
  },
  // 发送验证码
  sendVfCode(e) {
    if ( this.data.hasVfCodeSent ) return;
    // 如果是无效的手机号
    if ( !this.checkPhoneNumberValidity(this.phoneNumber) ) {
      return wx.showModal({
        title: '发送失败',
        content: '请确认手机号码是否有效',
        showCancel:false,
        confirmColor:'#e54628'
      });
    }
    // 倒计时
    this.countDown(this.data.resendVfCodeDelay);
    // 发送
    wx.request({
      url  : app.api.sendVfCode,
      data : {mobile:this.phoneNumber},
      success:resp=>{
        app.log(`_______${app.api.sendVfCode}_______`);
        app.log(resp)
        app.log(`_______${app.api.sendVfCode}_______`);
        
        if ( resp.data.state !== 1 ) {
          wx.showModal({
            title: '发送失败',
            content: resp.data.message,
            showCancel:false,
            confirmColor:'#e54628'
          });
        }
      }
    });


    if ( this.hasSentSMS ) return;
    this.hasSentSMS = true;
    // 埋点
    app.tdsdk.event({
      id: 'SentSMS'
    });
  },

  // 确认用户信息
  confirmable:true,
  confirmUserInfo() {
    // 阻止重复提交
    if ( !this.confirmable ) return;
    this.confirmable = false;

    let text   = '';
    if ( !this.name ) {
      text = '请填写您的名字';
    } else if ( !this.checkIdNumberValidity(this.idNumber) ) {
      text = '请确保身份证号有效';
    } else if ( !this.checkPhoneNumberValidity(this.phoneNumber) ) {
      text = '请确保手机号码有效';
    } else if ( !this.vfCode ) {
      text = '请输入验证码';
    }

    if ( text ) {
      this.confirmable = true;
      return wx.showModal({
        title: '校验失败',
        content:text,
        showCancel: false,
        confirmColor:'#e54628'
      });
    }

    // 埋点
    app.tdsdk.event({
      id: 'CfmProf'
    });

    // 更新全局数据
    app.globalData.contractInfo.insuredInfo = [{
      insuredName  : this.name,
      insuredMobile: this.phoneNumber,
      insuredCard  : this.idNumber
    }];

    
    // 校验 手机号+验证码 的匹配
    if ( this.requestTask ) {
      this.requestTask.abort();
    }
    this.requestTask = wx.request({
      url    : app.api.checkVfCode,
      data   : { mobile:this.phoneNumber, verifyCode:this.vfCode },
      success: resp=>{
        app.log(`_______${app.api.checkVfCode}_______`);
        app.log(resp)
        app.log(`_______${app.api.checkVfCode}_______`);
        
        // 是否验证通过
        if ( resp.data.state !== 1 ) {
          this.confirmable = true;
          return wx.showModal({
            title  : '校验失败',
            content: '验证码错误, 请稍后重新获取',
            showCancel: false,
            confirmColor:'#e54628'
          });
        }

        // 是否已读协议
        let hasReadNotice = !!wx.getStorageSync('hasReadNotice');
        if ( !hasReadNotice ) {
          this.confirmable = true;
          return this.setData({
            hasReadNotice
          });
        }

        wx.setStorageSync("insuredInfo", app.globalData.contractInfo.insuredInfo);



        this.confirmable = true;
        app.util.navigate({
          url:'/pages/order/add/pay/pay'
        });
        
        return;


        // 如果是已经下过单
        if ( app.globalData.hasAddOrder ) {
          this.confirmable = true;
          return app.util.navigate({
            url:'/pages/order/add/pay/pay'
          });
        }

        
        let encodeInsuredInfo = [{
          ...app.globalData.contractInfo.insuredInfo[0],
          insuredName:encodeURIComponent(this.name)
        }];
        // 通过, 下单
        wx.request({
          url : app.api.addOrder,
          data: {
            mid:'wafer',
            contractId : app.globalData.contractInfo.contractId,
            payFee     : parseInt( (app.globalData.contractInfo.payFee).toFixed(2) * 100 ),
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
              app.globalData.hasAddOrder = true;
              app.util.navigate({
                url:'/pages/order/add/pay/pay'
              });
            }
            this.confirmable = true;
          }
        })
      }
    })

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