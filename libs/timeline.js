const redisConn = require('../utils/redisConn');
const config = require('../config');
const date = require('../utils/date');
const logger = require('koa-log4').getLogger('Timeline');
module.exports = {
  postUnsubscribedChannel:async ( {type = "",channelId ="", city="",school="",college=""} = {})=>{

    return new Promise(async (s,f)=>{
    if(!type){
      f('options type is required!');
      return;
    }
    if(!channelId){
      f('options channelId is required!');
      return;
    }
    let ids = [];
    try{
    if(type === 'common'){
      logger.info(config.redisPrefix.list.allUser);
      ids =await redisConn.lrange(config.redisPrefix.list.allUser,0,-1);

    }else if(type === 'city'){
      ids =await redisConn.lrange(config.redisPrefix.list.cityUserById+city,0,-1);
    }else if(type === 'school'){
      ids = await redisConn.lrange(config.redisPrefix.list.schoolUserById+school,0,-1);
    }else if(type === 'college'){
      ids = await redisConn.lrange(config.redisPrefix.common.user+config.redisPrefix.common.school+school+":"+config.redisPrefix.common.college+college,0,-1);
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
    const pipeline = redisConn.pipeline()
    const t = date.time();

    for(let i=0;i<ids.length;i++){
      pipeline.zadd(config.redisPrefix.sortedSet.userUnsubscribedChannelById+ids[i],t,channelId);
    }
    const num = await pipeline.exec();
    s(num);
    return;
  }else{
    s(0);
  }

  });
},
postChannelForNewUser:async ({userId ="", educations=[],city=""} = {})=>{

  return new Promise(async (s,f)=>{

  if(!userId){
    f('options userId is required!');
    return;
  }
  let ids = [];
  try{

  ids = await redisConn.lrange(config.redisPrefix.list.commonChannel,0,-1);
  if(city){
  const cityIds =await redisConn.lrange(config.redisPrefix.list.cityChannelById+city,0,-1);
  ids =[
    ...cityIds,
    ...ids
  ];
  }else if(educations.length>0){
    let schoolIds=[],collegeIds=[],_schoolIds=[],_collegeIds=[];
    for(let i=0;i<educations.length;i++){
      if(educations[i].school){
        _schoolIds=[];
        _schoolIds = await redisConn.lrange(config.redisPrefix.schoolChannelById+educations[i].school,0,-1);
        schoolIds = [
          ..._schoolIds,
          ...schoolIds
        ];
        if(educations[i].college){
          _collegeIds = [];
          _collegeIds = await config.redisPrefix.lrange(config.redisPrefix.common.channel+config.redisPrefix.common.school+school+":"+config.redisPrefix.common.college,0,-1);
          collegeIds = [
            ..._collegeIds,
            ...collegeIds
          ]

        }
      }
    }
    ids =[
      ...collegeIds,
      ...schoolIds,
      ...ids
    ];
  }
}catch(e){
    f(e);
    return;

}
// logger.info(ids);
if(ids.length>0){
  const pipeline = redisConn.pipeline()
  const t = date.time();

  for(let i=0;i<ids.length;i++){
    pipeline.zadd(config.redisPrefix.sortedSet.userUnsubscribedChannelById+userId,t,ids[i]);
  }
  const num = await pipeline.exec();
  s(num);
  return;
}else{
  s(0);
}

});
},
postUnreadMessage:async ({userId="",messageId="",channelId=""} = {})=>{

  return new Promise(async (s,f)=>{
  if(!messageId){
    f('options messageId is required!');
    return;
  }
  if(userId){
    try{
    var r = await redisConn.zadd(config.redisPrefix.sortedSet.userUnreadMessageByUserId+userId,date.time(),messageId);
    }catch(e){
    f(e);
    return;
    }
    s(r);
    return;
  }
  let ids = [];
try{
  ids = await redisConn.zrange(config.redisPrefix.sortedSet.channelFollowerByChannelId+channelId,0,-1);
}catch(e){
    f(e);
    return;
}
// logger.info(ids);
if(ids.length>0){
  const pipeline = redisConn.pipeline();
  const t = date.time();
  for(let i=0;i<ids.length;i++){
    pipeline.zadd(config.redisPrefix.sortedSet.userUnreadMessageByUserId+ids[i],t,messageId);
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
postMessage:async ({userId="",messageId="",channelId=""} = {})=>{

  return new Promise(async (s,f)=>{
  if(!messageId){
    f('options messageId is required!');
    return;
  }
  if(userId){
    try{
    var r = await redisConn.lpush(config.redisPrefix.list.userMessagesById+userId,messageId);
    }catch(e){
    f(e);
    return;
    }
    s(r);
    return;
  }
  let ids = [];
try{
  ids = await redisConn.zrange(config.redisPrefix.sortedSet.channelFollowerByChannelId+channelId,0,-1);
}catch(e){
    f(e);
    return;
}
// logger.info(ids);
if(ids.length>0){
  const pipeline = redisConn.pipeline();
  for(let i=0;i<ids.length;i++){
    pipeline.lpush(config.redisPrefix.list.userMessagesById+ids[i],messageId);
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
