const redisConn = require('../utils/redisConn');
const logger = require('koa-log4').getLogger('utils/redis');
const config = require('../config');
module.exports = {
  mhgetall:async function(ids){
    return new Promise(async (s,f)=>{
     if(!Array.isArray(ids)){
       f(new Error("ids must be array"));
       return;
     }

     if(ids.length===0){
       s([]);
       return;
     }

    const pipeline = redisConn.pipeline();
    for(let i=0;i<ids.length;i++){
      pipeline.hgetall(ids[i]);
    }
    try {
      var list =await pipeline.exec();
    } catch(e){
      f(e);
    }
    // logger.info(list);
    const result = [];
    for(let i=0;i<list.length;i++){
      if(!list[i][0]){
        result.push(list[i][1]);
      }
    }
    s(result);
  })
},
mkeysexsist:async function(keys){
  return new Promise(async (s,f)=>{
   if(!Array.isArray(keys)){
     f(new Error("ids must be array"));
     return;
   }

   if(keys.length===0){
     s([]);
     return;
   }

  const pipeline = redisConn.pipeline();
  for(let i=0;i<keys.length;i++){
    pipeline.exists(keys[i]);
  }
  try {
    var list =await pipeline.exec();
  } catch(e){
    f(e);
  }
  const result = [];
  for(let i=0;i<list.length;i++){
    if(!list[i][0]){
      result.push(list[i][1]);
    }
  }
  s(result);
})
},
mzcount:async function(ids){
  return new Promise(async (s,f)=>{
   if(!Array.isArray(ids)){
     f(new Error("ids must be array"));
     return;
   }

   if(ids.length===0){
     s([]);
     return;
   }

  const pipeline = redisConn.pipeline();
  for(let i=0;i<ids.length;i++){
    pipeline.zcount(ids[i],config.defaultParams.minTimestamp,config.defaultParams.maxTimestamp);
  }
  try {
    var list =await pipeline.exec();
  } catch(e){
    f(e);
  }
  // logger.info(list);
  const result = [];
  for(let i=0;i<list.length;i++){
    if(!list[i][0]){
      result.push(list[i][1]);
    }
  }
  s(result);
})
},
mgetalljson:async function(ids){
  return new Promise(async (s,f)=>{
   if(!Array.isArray(ids)){
     f(new Error("ids must be array"));
     return;
   }
   if(ids.length===0){
     s([]);
     return;
   }


  try {
    var list =await redisConn.mget.apply(redisConn,ids);
  } catch(e){
    f(e);
  }
  const result = [];
  for(let i=0;i<list.length;i++){
    try{
      result.push(JSON.parse(list[i]));
    }catch(e){
      f(e);
      return;
    }
  }
  s(result);
})
}
}
