//第三方app示例
//

const axios = require('axios');
const apiUrl = require('../config').localApiUrl;
const appAlias = 'time';

const push = (text) =>{
  return axios(
      {
        method:"post",
        url:apiUrl+"/channels/"+appAlias+"/messages",
        data:{
          text:text
        }
      }
    );
};

const hourReport = () => {
        const time = new Date();
        const hours = time.getHours();
        const mins = time.getMinutes();
        const secs = time.getSeconds();
        const next = ((60 - mins) * 60 - secs) * 1000;
        setTimeout(hourReport, next);
        if (mins === 0) {
            const text = "整点为您报时，现在是北京时间："+time.toLocaleString(["zh-CN","en-US"],{timeZone:"Asia/Shanghai"});
            console.log(text);
            push(text).then((r)=>{
              // console.log(r.data);
            },(e)=>{
              console.log(e.data);
            });
        }else{
            const content = '整点报时已启动,现在是北京时间'+time.toLocaleString(["zh-CN","en-US"],{timeZone:"Asia/Shanghai"});
            console.log(content);
            push(content).then((r)=>{
              // console.log(r.data);
            },(e)=>{
              console.log(e.data);
            });

        }
    }

hourReport();
