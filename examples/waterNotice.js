//第三方app示例

const axios = require('axios');
const apiUrl = require('../config').localApiUrl;
const appAlias = 'water';
const push = (text) => {
  console.log(apiUrl + "/channels/" + appAlias + "/messages");
  return axios({
    method: "post",
    url: apiUrl + "/channels/" + appAlias + "/messages",
    data: {
      text: text
    }
  });
};

setInterval(()=>{
  const time = new Date();
  const hour = time.getUTCHours();
  let beijingHour = hour+8;
  if(beijingHour>23){
    beijingHour -=24;
  }
  if(beijingHour>8 && beijingHour<22){
    const text = "该喝水了，现在是北京时间：" + time.toLocaleString(["zh-CN", "en-US"], {
      timeZone: "Asia/Shanghai"
    });            
    push(text).then((r) => {
      // console.log(r.data);
    }, (e) => {
      console.log(e.data);
    });       
  }else{
    //休息时间
    push('test').then((r) => {
      // console.log(r.data);
    }, (e) => {
      console.log(e.data);
    });
  }

},1000*60*60);
const initTime = new Date();

console.log('喝水提醒已启动');
push('喝水提醒已启动'+ initTime.toLocaleString(["zh-CN", "en-US"], {
  timeZone: "Asia/Shanghai"
})).then((r) => {
  console.log(r.data);
}, (e) => {
  console.log(e.data);
});
