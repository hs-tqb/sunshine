// pages/order/add/calendar/calendar.js

const app = getApp();
const now = new Date();


Page({

  /**
   * 页面的初始数据
   */
  data: {
    today      : null,
    monthOnShow: 3,                       // 显示几个月份
    // 因为这里data的创建是在页面打开之前, 所以取不到 app.globalData的动态数据
    // 所以, 直接在使用的地方调用 app.globalData.xxx, 而不是 this.orderTimeLimit.xxx
    // orderTimeLimit: {
    //   min: 0 * (24 * 60 * 60 * 1000), max: (60) * (24 * 60 * 60 * 1000)     // 限制未来几天不能购买
    //   min: app.globalData.orderTimeLimitMin||3 * (24 * 60 * 60 * 1000),
    //   max: app.globalData.orderTimeLimitMax * (24 * 60 * 60 * 1000)
    // },
    // orderDaysLimitMin: app.globalData.orderDaysLimitMin,                     // 选择的最小限制
    monthList  : [],

    showTips  : 'default',                // 下单操作的小贴士, 值为: default/discontinuity/valid, 对应 默认/选择不连续/有效 状态的不同文案提示
    orderable : false,                    // 是否可下单

    orderDateStart:'',
    orderDateEnd  :'',
    orderDateCount:0,
    orderCityCount:0,


    hasReadGuide:true
  },
  /**
   * 生命周期
   */
  onLoad() {    
    app.globalData.calendarPage = this;
    let date  = new Date();
    date.setHours(0);
    this.setData({
      today    : new Date(+date), // 重新new一个对象, 确保 data 里的数据保持独立
    });

    let monthList = this.getMonthList(date, this.data.monthOnShow);
    // 当月只剩最后一周的时候, 下月的前补足会把今日日期也给补上
    monthList = this.clearRepeatDays(monthList);
    // 恢复已选城市
    monthList = this.restoreCitySelection(monthList);
    // 因为用flex布局, 给月份内部再加一个周分组会更好处理
    monthList = this.groupMonthByWeek(monthList);

    this.setData({
      monthList   : monthList,
      hasReadGuide:!!wx.getStorageSync('hasReadGuide')
    });
    
    // 检查是否可以下单
    this.checkOrderable('fromCache', monthList);
  },
  onShow(opts) {
    // 如果在返回日历页的时候才刷新城市数据, 城市的显示会有延迟, 所以在city页面进行跨页面的刷新

    // 如果没有选定城市, 则不做其它处理
    // if (!app.selectedCity) return;
    // let dayObj = this.getDayObject(this.selectedDayIdxs);
    // dayObj.city = app.selectedCity;
    // this.refreshData('monthList');
    // this.checkOrderable();
  },
  /**
   * 内部 属性 和 函数
   * tips: 月份和星期从0开始
   */
  // 获取月份列表数据
  getMonthList(date, len) {
    let list = [];
    
    for (let i=0; i<len; i++) {
      list.push({
        date: { year:date.getFullYear(), month:date.getMonth(), day:date.getDate() }, 
        data: this.getDayList(date)
      });
      // 下一月的循环, 从一日开始算起
      date.setDate( 1 );
      date.setMonth( date.getMonth()+1 );
    }
    
    return list;
  },
  // 获取日期列表数据
  getDayList(date) {
    
    let list = [];
    let year = date.getFullYear(), month = date.getMonth();
    for ( let i=date.getDate(); i<this.getMonthLastDay(date)+1; i++ ) {
      list.push( this.initDayObject(year, month, i, 'normal') );
    }

    // 如果是从周日开始
    let prefixLen = date.getDay();
    let suffixLen = 6 - this.getMonthLastWeekday(date);
    // 我们的需求是从周一开始, 所以前后补足的长度需要做个处理
    prefixLen = prefixLen === 0? 6: prefixLen-1;
    suffixLen = suffixLen === 6? 0: suffixLen+1;

    list = this.getDaysPrefix(date, prefixLen)
            .concat(list)
            .concat( this.getNextMonthDaysSuffix(date, suffixLen) );

    return list;
  },
  // 将月份按照星期进行再分组
  groupMonthByWeek(monthList) {
    var arrMonthList = [];
    var arrMonth;
    var arrWeek;
    monthList.forEach(month=>{
      arrMonth = [];
      month.data.forEach((day,i)=>{        
        if ( i % 7 === 0 ) {
          arrWeek = [];          
          arrMonth.push(arrWeek);
        }
        arrWeek.push(day);
      });
      arrMonthList.push({date:month.date, data:arrMonth})
    });
    return arrMonthList;
  },
  // 清除重复天数
  clearRepeatDays(monthList) {
    let currM = monthList[0],
        nextM = monthList[1];
    if ( currM.data.length < 8 ) {
      nextM.data.some((item,i)=>{
        return item.type==='prefix'? (item.day=''): true
      });
    } 
    return monthList;
  },
  // ( 从缓存 )恢复已选择城市
  restoreCitySelection(monthList) {
    let selectedDays = this.getSelectedDaysStorage();
    selectedDays.forEach(d=>{
      monthList.filter(m=>{
        return m.date.year===d.year && m.date.month===d.month;
      }).forEach(m=>{
        m.data.some(d2=>{
          if ( d2.day===d.day ) {
            d2.city = d.city;
            d2.selected = true;
            return true;
          }
        })
      });
    });
    return monthList;
  },
  // 获取月份最后一天的日期
  getMonthLastDay(date) {
    date = new Date(+date);
    date.setDate( 1 );
    date.setMonth( date.getMonth()+1 );
    date.setDate( 0 );
    return date.getDate();
  },
  // 获取月份最后一天的星期
  getMonthLastWeekday(date) {
    date = new Date(+date);
    date.setMonth(date.getMonth() + 1);
    date.setDate(0);
    return date.getDay();
  },
  // 补足前日期
  getDaysPrefix(date, len) {
    let arr = [];
    if ( date.getDate()-len > 1 ) {
      // 如果长度在本月范围内
      let year = date.getFullYear(), month = date.getMonth();
      for ( let i=0; i<len; ) {
        i++;
        arr.unshift( this.initDayObject(year, month, date.getDate()-i, 'prefix') );
      }
    } else {
      // 如果长度涉及上个月
      arr = this.getPrevMonthDaysPrefix(date, len);
    }
 
    return arr;
  },
  // 补足上月
  getPrevMonthDaysPrefix(date, len) {
    let arr = [];
    date = new Date( +date );
    date.setDate(0);
    let year = date.getFullYear(), month = date.getMonth();
    for (let i=len; i>0; i--) {
      arr.push( this.initDayObject(year, month, date.getDate()-i+1, 'prefix') );
    }
    return arr;
  },
  // 补足下月
  getNextMonthDaysSuffix(date, len) {
    let arr = [];
    date = new Date( +date );
    date.setMonth( date.getMonth()+1 );
    let year = date.getFullYear(), month = date.getMonth();
    for ( let i=0; i<len; i++ ) {
      arr.push( this.initDayObject(year, month, undefined, 'suffix' ) );
    }
    return arr;
  },
  // 统一的day对象处理, year 和 month 主要是为了做日期判定
  // type 有: today, prefix, suffix, limit(合理但受限的)
  initDayObject (year, month, day, type) {
    // 是否可选
    var selectable = true;

    // 做筛选
    let today  = this.data.today;
    let tYear  = today.getFullYear(),
        tMonth = today.getMonth(),
        tDay   = today.getDate();

    if ( type === 'normal' ) {
      // 对3日内做处理 ( 未来3日内不能选定 )
      let temp = +new Date(year, month, day);
      if ( 
        temp < (+today) + app.globalData.orderTimeLimitMin * 86400000   
        || temp >= (+today) + app.globalData.orderTimeLimitMax * 86400000
      ) {
        type = "limit";
        selectable = false;
      }
      // 对今日做处理
      if (year === tYear && month === tMonth && day === tDay ) {
        day  = '今日';
        type = 'today';
      } 
    } else {
      selectable = false;
    }
    return { year, month, day, type, selectable };
  },
  // 根据下标获取当前日期对象
  getDayObject(idxs) {
    return this.data.monthList[+idxs[0]]['data'][+idxs[1]][+idxs[2]];
  },
  // 检测是否同一天 ( 因为 setData 的时候所有对象会被替换, 所以不能用 === 做比较 )
  isSameDay(d1, d2) {
    return d1.year===d2.year 
        && d1.month===d2.month
        && d1.day === d2.day;
  },
  // 刷新数据
  refreshData(name) {
    let obj = {};
    obj[name] = this.data[name];
    this.setData(obj);
  },
  /**
   * 事件绑定
   */
  // 选定某一天
  selectDay(e) {
    let target  = e.currentTarget, 
        dataset = target.dataset;

    // 如果不可选, 直接返回
    if ( !dataset.selectable ) return;


    let prevDay = this.selectedDay,
        dayIdxs = dataset.idxs.split(','),
        dayObj  = this.getDayObject(dayIdxs);

    // 如果当前有操作, 则中断操作
    if ( !!prevDay && !this.isSameDay(prevDay, dayObj) && prevDay.showOperationBar ) {
      this.getDayObject(this.selectedDayIdxs).showOperationBar = false;
    }

    // 埋点
    app.tdsdk.event({
      id: dayObj.selected?'NoEmpDate':'EmpDate',
    });

    if ( dayObj.selected ) {
      dayObj.showOperationBar = !dayObj.showOperationBar;
    } else {
      // dayObj.selected = true;
      this.selectCity(dayObj);
    }



    this.selectedDay = dayObj;
    this.selectedDayIdxs = dayIdxs;
    this.refreshData('monthList');
  },
  // 更新选定城市
  updateSelect(e) {
    let dayObj = this.getDayObject( this.selectedDayIdxs );
    dayObj.showOperationBar = false;
    this.selectCity(this.selectedDay);
    this.refreshData('monthList');

    // 埋点
    app.tdsdk.event({
      id: 'ChangePla'
    });
  },
  // 删除选定
  deleteSelect(e) {
    let dayObj = this.getDayObject(this.selectedDayIdxs);
    dayObj.showOperationBar = false;
    dayObj.selected = false;
    dayObj.city     = null;
    this.selectedDay = null;
    this.refreshData('monthList');
    this.checkOrderable();

    // 埋点
    app.tdsdk.event({
      id: 'DelPla'
    });
  },
  // 选择城市, 跳转城市选择页面
  selectCity(city) {
    app.util.navigate({
      url: "/pages/order/add/city/city",
    });
  },
  // 检测订单的有效性
  selections:null,
  checkOrderable(fromCache) {
    let monthList     = this.data.monthList;
    let selections    = [];
    let selectionIdxs = [];
    if ( fromCache ) {
      selections = this.getSelectedDaysStorage();
      selections.forEach(s=>{
        monthList.forEach((m,mi)=>{
          if ( m.date.year!==s.year || m.date.month!==s.month ) return;
          m.data.forEach((w,wi)=>{
            w.forEach((d,di)=>{
              if ( d.day === s.day ) {
                selectionIdxs.push(`${mi}-${wi}-${di}`);
              }
            });
          })
        });
      });
    } else {
      monthList.forEach((m,mi)=>{
        m.data.forEach((w,wi)=>{
          w.forEach((d,di)=>{
            d.incontinuous = false;
            if ( d.selected ) {
              selections.push( d );
              selectionIdxs.push(`${mi}-${wi}-${di}`);
            }
          });
        })
      });
    }

    // 
    let data   = {};
    let result = null; 
    // 如果天数不够
    if (selections.length < app.globalData.orderDaysLimitMin ) {
      data = {
        showTips:'default',
        orderable:false,
        monthList: this.markIncontinuousDays(selections)
      };
    } 
    // 如果是有效(连续)选择
    else if ( result=this.checkSelectionContinuity(selections) ) {
      data = {
        showTips: 'valid',
        orderable: true,
        orderDateStart:result.dates[0],
        orderDateEnd: result.dates[ result.dates.length-1 ],
        orderDateCount: result.dates.length,
        orderCityCount: result.cities.length,
        monthList: this.markIncontinuousDays(selections)
      };
    } 
    // 如果不是有效(连续)选择, 则做相应提示
    else {
      data = {
        showTips : 'discontinuity',
        orderable: false,
        monthList: this.markIncontinuousDays(selections)
      };
    }

    app.log('_________________是否可下单_______________')
    app.log(result);
    app.log('_________________是否可下单_______________')

    this.setData(data);
    this.selections = selections;
    this.setSelectedDaysStorage(selections);
  },
  // 检查选择的连续性
  checkSelectionContinuity(selections) {
    let t  = selections[0],
        d1 = null,
        d2 = null,
        r  = {cities:[], dates:[]},
        s  = 86400000;    // 一天的时间间隔(ms)

    for (let i=0,len=selections.length-1; i<len; i++) {
      d1 = selections[i];
      d2 = selections[i+1];
      r.cities.push( d1.city );
      r.dates.push( this.prefixZero(1+d1.month)+'-'+this.prefixZero(d1.day) );

      if ( new Date(d1.year,d1.month,d1.day).getTime() + s < new Date(d2.year,d2.month,d2.day).getTime() ) {
        return false;
      }
    }
    r.cities.push(d2.city);
    r.dates.push(this.prefixZero(1+d2.month) + '-' + this.prefixZero(d2.day) );
    r.cities = this.keepUniItem( r.cities , 'cityId');
    return r;
  },
  // 提示连续性
  markIncontinuousDays(selections, data) {
    data = data || this.data.monthList;
    if ( !selections.length ) return data;
    let headMost = selections[0];
    let backMost = selections[selections.length-1];
    let headMostTime = + new Date(headMost.year, headMost.month, headMost.day);   // 获取毫秒值, 用于比较
    let backMostTime = + new Date(backMost.year, backMost.month, backMost.day);
    let dayTime      = 0;

    data.forEach((m,mi)=>{
      m.data.forEach((w,wi)=>{
        w.forEach((d,di)=>{
          dayTime = new Date(d.year, d.month, d.day).getTime();
          if ( !d.selectable || d.selected || dayTime<headMostTime || dayTime>backMostTime ) return;
          d.incontinuous = true;
        })
      });
    });

    return data;
  },
  // 列表去重
  keepUniItem(list,name) {
    let map = {};
    return list.filter(item=>{
      if (map['_' + item.cityId] ) return false;
      map['_' + item.cityId] = true;
      return true;
    });
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
  // 提交订单
  submitOrder(e) {
    // 如果是不可点击状态, 则不作处理
    if ( !e.currentTarget.dataset.orderable ) return;
    
    let selections = this.selections || this.getSelectedDaysStorage();
    let times = [], cityIds = [];
    selections.forEach(item=>{
      times.push(`${item.year}-${this.prefixZero(item.month+1)}-${this.prefixZero(item.day)}`);
      cityIds.push( item.city.cityId );
    });

    // return wx.navigateTo({
    //   url: "../../detail/detail",
    // });

    // 点击下单则清空已选城市缓存
    // this.setSelectedDaysStorage(null);

    app.log('____________获取订单信息, 参数______________')
    app.log('mid: ', 'wafer');
    app.log('productId: ', app.globalData.productId);
    app.log('times: ', times.join(','))
    app.log('cityIds: ', cityIds.join(','))
    app.log('____________获取订单信息, 参数______________')


    // 埋点
    app.tdsdk.event({
      id: 'Purchase',
      params:{
        'dates' : times.join(','),
        'cities': cityIds.length
      }
    });

    wx.request({
      url : app.api.getContractInfo,
      data: {
        mid      : 'wafer',
        productId: app.globalData.productId,
        times    : times.join(','),
        cityIds  : cityIds.join(',')
      },
      success:resp=>{
        app.log(`_______${app.api.getContractInfo}_______`);
        app.log(resp)
        app.log(`_______${app.api.getContractInfo}_______`);
        
        if ( resp.data.state===0 ) {
          return wx.showModal({
            title:'下单失败',
            content:resp.data.message,
            showCancel:false,
            confirmColor:'#e54628'
          })
        }
        // 更新全局信息
        // app.globalData.contractInfo = {...resp.data.data};
        app.globalData.contractInfo.contractId      = resp.data.data.contractId;
        app.globalData.contractInfo.dates           = times;
        app.globalData.contractInfo.cities          = this.keepUniItem(selections.map(item=>item.city), 'cityId');
        app.globalData.contractInfo.payoutRuleParam = resp.data.data.payoutRuleParam;
        app.globalData.contractInfo.threshold       = resp.data.data.threshold;
        app.globalData.hasAddOrder                  = false;
        
        // 跳到详情页
        app.util.navigate({
          url: "/pages/order/detail/detail",
        });
      }
    })
  },
  // 补足0
  prefixZero(n) {
    return n>9?n:'0'+n;
  },
  // 储存已选城市的数据
  setSelectedDaysStorage(selections=[]) {
    wx.setStorageSync("_selectedDays",selections)
  },
  // 获取已选城市数据
  getSelectedDaysStorage() {
    let todayMs     = +this.data.today;
    let intervalMin = app.globalData.orderTimeLimitMin * 86400000;
    // let intervalMax = app.globalData.orderTimeLimitMax;
    let temp = null;
    // 过滤掉老的缓存, 老的缓存不涉及未来, 所以不做最大的对比
    return (wx.getStorageSync('_selectedDays')||[]).filter(d=>{
      return todayMs + intervalMin < new Date(d.year, d.month, d.day).getTime();
        // || todayMs + intervalMax > new Date(d.year, d.month, d.day).getTime();
    });
  },
  /**
   * 公用数据
   */
  selectedDay    :null,
  selectedDayIdxs:null,


  // 引导页
  doReadGuide(e) {
    this.setData({
      hasReadGuide:true
    });
    wx.setStorageSync('hasReadGuide',true);
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