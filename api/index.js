const prefix = 'https://ts.baotianqi.cn/';
// const prefix = 'https://server.baotianqi.cn/';
module.exports = {

  /** 获取 openId
   */
  getOpenId: prefix + 'lp/getopenid',
  /** 获取产品信息(id)
   * @param merchantid
   */
  getProductionInfo: prefix + 'wafer/getProductInfo',
  // 获取城市列表（树状）
  getCities: prefix + "sellerCity/getCitys/",
  // 获取热门城市
  getHotCities: prefix + "sellerCity/getHotCity/",
  /** 获取订单信息
   * @param productId
   * @param cityIds   城市ID英文逗号城市ID
   * @param times     时间英文逗号时间
   * @param mid       wap 手机端  pc 电脑端   wafer 小程序
   */
  getContractInfo: prefix + 'wafer/getContract',
  /** 下单 
   * @param mid           wap 手机端  pc 电脑端   wafer 小程序
   * @param contractId    查询时返回的 id
   * @param payFee        用户下单时候的选择的金额如有优惠码的时候可能需要重新定义变量
   * @param insuredInfo   aaa:1380001,bb:13856421
   */
  addOrder: prefix + 'wafer/addOrder',
  /** 发送验证码
   */
  sendVfCode: prefix + 'wafer/getCode',
  // sendVfCode: 'https://server.baotianqi.cn/wafer/getCode',
  /** 校验验证码
   * @param mobile
   * @param verifyCode
   */
  checkVfCode: prefix + 'wafer/checkVerifyCode',
  /** 获取支付参数
   * 
   */
  getPaymentParams: prefix + 'lp/littlepay',

  /** 检查优惠码
   * @param mobile
   * @param coupons
   * @param productId
   */
  findCoupons: prefix + 'sellerMerchant/findCoupons'
};