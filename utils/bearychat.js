const rp=require('request-promise');
const config = require('../config');
const logger = require('koa-log4').getLogger('Bearychat');
const bearychat = {

};


bearychat.incoming = async ({
  text=""
} = {}) => {
return new Promise (async (s,f)=>{

    if(!text){
      f('options text is required!');
      return;
    }
    const _option = {
        "text": text,
        "markdown": true,
        "channel": config.bearychat.appTestChannel
    };


    const opts = {
        simple:false,
        json:true,
        method:"POST",
        url:config.bearychat.incoming.url,
        body:_option
    };
    try{
      var r = await rp(opts);
    }catch(e){
      f(e);
      return;
    }
    s(r);
});
};

module.exports = bearychat;
