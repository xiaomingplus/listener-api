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
        console.log(mins);
        setTimeout(hourReport, next);
        if (mins == 0) {
            const text = "现在是北京时间："+hours+"点整";
            console.log(text);
            push(text);
        }else{
            console.log('启动时间:'+time);
            push('整点报时已启动,现在是'+time).then((r)=>{
              console.log(r.data);
            },(e)=>{
              console.log(e.data);
            })

        }
    }

hourReport();
