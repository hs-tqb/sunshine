const app = getApp();

Page({

  /**
   * 页面的初始数据
   */
  data: {
    searching   : false,
    tabs        : ['历史'],
    tabSeleted  : 0,
    recentCities: [],
    hotCities   : [],
    allCities   : [],
    resultList  : [],
  },
  /**
   * 生命周期
   */
  onLoad(opts) {
    
    // 历史城市
    let recentCities = this.getRecentCities();
    // 热门城市
    // let hotCities    = this.getHotCities();
    // 所有城市
    let allCities    = this.getAllCities();

    this.updateTabs(allCities);

    this.setData({
      recentCities, allCities,
      tabSeleted: recentCities.length? 0:1
    });

    return; 
    var selectedCities = this.getSelectedCities();
    var citiesWithSelectionState = this.data.cities.map(list=>{
      var temp = list.map(city=>{
        city.selected = selectedCities.some( scity=>scity.cityId===city.cityId ) || false;
        return city;
      });
      return temp;
    });
    this.setData({
      cities: citiesWithSelectionState
    })
  },
  /**
   * 内部函数
   */
  getRecentCities() {
    return wx.getStorageSync('recentCities') || [];
  },
  setRecesetRecentCities(cities) {
    return wx.setStorageSync('recentCities', cities);
  },
  refreshRecentCities(cities) {
    // 添加到历史列表里
    this.setData({
      recentCities: cities
    });
  },
  getHotCities() {
    let hotCities = app.globalData.hotCities || [];

    if ( !hotCities ) {
      wx.request({
        url:app.api.getHotCities,
        method:'POST',
        success:resp=>{
          app.log(`_______${app.api.getHotCities}_______`);
          app.log(resp)
          app.log(`_______${app.api.getHotCities}_______`);
          
          hotCities = app.globalData.hotCities = resp.data.data.list || [];
          this.setData({ hotCities });
        }
      })
    };

    return hotCities;
  },
  getAllCities() {
    let allCities = app.globalData.allCities || [];

    if ( !allCities.length ) {
      wx.request({
        url:app.api.getCities,
        method:'POST',
        data: {
          productId: app.globalData.productId,
        },
        success:resp=>{
          app.log(`_______${app.api.getCities}_______`);
          app.log(resp)
          app.log(`_______${app.api.getCities}_______`);
          
          allCities = app.globalData.hotCities = resp.data.data.areaList || [];
          this.setData({ allCities });
          this.updateTabs(allCities);
        }
      })
    }

    return allCities;
  },
  updateTabs(allCities) {
    // 标签
    let tabs = this.data.tabs;

    allCities.forEach(item=>{
      tabs.push( item.name );
    });

    this.setData({tabs});
  },
  getSelectedCities() {
    return wx.getStorageSync('selectedCities') || [];
  },
  setSelectedCities(cities) {
    return wx.setStorageSync('selectedCities', cities);
  },
  /**
   * 事件
   */
  // 切换标签
  doSwitchTab(e) {
    this.setData({
      tabSeleted: e.target.dataset.index
    });

    // 埋点
    app.tdsdk.event({
      id: 'PlaLeftBar'
    });
  },
  // 选择城市
  doSelectCity(e) {
    let recentCities   = this.getRecentCities();

    let target   = e.target;
    let cityName = target.dataset.cityname,
        cityId   = target.dataset.cityid;
    let existIdx = -1;
    let list     = this.data[target.dataset.list];

    
    let city = target.dataset.list === 'allCities'?
              (idxs=>list[idxs[0]].children[idxs[1]].children[idxs[2]])(target.dataset.idxs.split('-')):
              list[target.dataset.idxs];


    // 埋点
    app.tdsdk.event({
      id: target.dataset.list === 'recentCities'? 'PlaHis':'ChosCity'
    });


    city.cityId   = city.cityId || city.id;
    city.cityName = city.cityName || city.name;

    // 如果是取消选定, 则不再记录历史;
    if ( city.selected ) {
      // city.selected = false;
    } else {
      // city.selected = true;
      
      if( recentCities.some(function(item,i) {
        return (item.cityId===cityId) && item.cityName===cityName && (existIdx=i,true);
      }) ) {
        recentCities.splice(existIdx,1);
      }
      
      recentCities.unshift({cityName, cityId});
      this.setRecesetRecentCities(recentCities);
      // this.refreshRecentCities(recentCities);
    }
    
    // 已选城市的缓存
    // let selectedCities = this.getSelectedCities();
    // if ( selectedCities.some(function(item,i) {
    //   return item.cityId === cityId && item.cityName === cityName && (existIdx = i, true);
    // }) ) { 
    //   selectedCities.splice(i,1);
    // } else {
    //   selectedCities.push({
    //     cityId:city.cityId,
    //     citiName:city.cityName
    //   });
    // }
    // this.setSelectedCities(selectedCities);


    // 如果在返回日历页的时候才刷新城市数据, 城市的显示会有延迟, 所以在这里进行跨页面的刷新 --start
    let calendar = app.globalData.calendarPage;
    let dayObj = calendar.getDayObject(calendar.selectedDayIdxs);
    dayObj.city = city;
    dayObj.selected = true;
    calendar.hasSelectedCity = true;
    calendar.refreshData('monthList');
    calendar.checkOrderable();
    // 如果在返回日历页的时候才刷新城市数据, 城市的显示会有延迟, 所以在这里进行跨页面的刷新 --end

    // 返回上一页
    wx.navigateBack({
      delta: 1
    })

    // 刷新数据
    this.refreshRecentCities(recentCities);
  },
  doSelectCity2(e) {
    this.doSelectCity(e);
    this.setData({
      searching:false
    })
  },



  /** 搜索城市
   * 
   */
  resultListBackup:[],
  onFocus(e) {
    let cities = this.resultListBackup;
    if ( !cities.length ) {
      this.data.allCities.forEach(a=>{
        a.children.forEach(c=>{
          c.children.forEach(z=>{
            cities.push(z);
          })
        })
      });
    };
    if ( e.detail.value ) {
      return this.onInput(e);
    };
    this.setData({
      resultList  : cities,
      searching: true
    });
  },
  cancelSearching() {
    this.setData({
      searching: false
    });      
  },
  onInput(e) {
    let value  = e.detail.value.trim();
    let cities = [];
    if ( value ) {
      cities = this.resultListBackup.filter(item=>item.name.indexOf(value)>=0);
    } else {
      cities = this.resultListBackup;
    }
    this.setData({
      searching: true,
      resultList:cities
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