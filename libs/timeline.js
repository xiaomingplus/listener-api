const redisConn = require('../utils/redisConn');
const config = require('../config');
const date = require('../utils/date');
const logger = require('koa-log4').getLogger('Timeline');
module.exports = {
  postUnsubscribedChannel:async (options = {cityId:"",schoolId:"",collegeId:""})=>{

    return new Promise(async (s,f)=>{
    if(!options.type){
      f('options type is required!');
      return;
    }
    if(!options.channelId){
      f('options channelId is required!');
      return;
    }
    let ids = [];
    try{
    if(options.type === 'common'){
      logger.info(config.redisPrefix.list.allUser);
      ids =await redisConn.lrange(config.redisPrefix.list.allUser,0,-1);

    }else if(options.type === 'city'){
      ids =await redisConn.lrange(config.redisPrefix.list.cityUserById+options.cityId,0,-1);
    }else if(options.type === 'school'){
      ids = await redisConn.lrange(config.redisPrefix.list.schoolUserById+options.schoolId,0,-1);
    }else if(options.type === 'college'){
      ids = await redisConn.lrange(config.redisPrefix.common.user+config.redisPrefix.common.school+options.schoolId+":"+config.redisPrefix.common.college+options.collegeId,0,-1);
    }else{
      f("can't found this type");
      return;
    }
  }catch(e){
      f(e);
      return;

  }
  logger.info(ids);
  if(ids.length>0){
    const pipeline = redisConn.pipeline();
    for(let i=0;i<ids.length;i++){
      pipeline.lpush(config.redisPrefix.list.userUnsubscribedChannelById+ids[i],options.channelId);
    }
    const num = await pipeline.exec();
    s(num);
    return;
  }else{
    s(0);
  }

  });
},
postUnreadMessage:async (options = {userId:"",channelId:"",messageId:""})=>{

  return new Promise(async (s,f)=>{
  if(!options.messageId){
    f('options messageId is required!');
    return;
  }
  if(options.userId){
    try{
    var r = await redisConn.zadd(config.redisPrefix.sortedSet.userUnreadMessageByUserId+options.userId,date.time(),options.messageId);
    }catch(e){
    f(e);
    return;
    }
    s(r);
    return;
  }
  let ids = [];
try{
  ids = await redisConn.zrange(config.redisPrefix.sortedSet.channelFollowerByChannelId+options.channelId,0,-1);
}catch(e){
    f(e);
    return;
}
logger.info(ids);
if(ids.length>0){
  const pipeline = redisConn.pipeline();
  const t = date.time();
  for(let i=0;i<ids.length;i++){
    pipeline.zadd(config.redisPrefix.sortedSet.userUnreadMessageByUserId+ids[i],t,options.messageId);
  }
  const num = await pipeline.exec();
  s(num);
  return;
}else{
  s(0);
  return;
}
});
},
postMessage:async (options = {userId:"",channelId:"",messageId:""})=>{

  return new Promise(async (s,f)=>{
  if(!options.messageId){
    f('options messageId is required!');
    return;
  }
  if(options.userId){
    try{
    var r = await redisConn.lpush(config.redisPrefix.list.userMessagesById+options.userId,options.messageId);
    }catch(e){
    f(e);
    return;
    }
    s(r);
    return;
  }
  let ids = [];
try{
  ids = await redisConn.zrange(config.redisPrefix.sortedSet.channelFollowerByChannelId+options.channelId,0,-1);
}catch(e){
    f(e);
    return;
}
logger.info(ids);
if(ids.length>0){
  const pipeline = redisConn.pipeline();
  for(let i=0;i<ids.length;i++){
    pipeline.lpush(config.redisPrefix.list.userMessagesById+ids[i],options.messageId);
  }
  const num = await pipeline.exec();
  s(num);
  return;
}else{
  s(0);
  return;
}
});
}
}
