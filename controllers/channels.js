const redisConn = require('../utils/redisConn');
const redis = require('../utils/redis.js');
const config = require('../config');
const date = require('../utils/date');
const common = require('../utils/common');
const uuid = require('node-uuid');
const logger = require('koa-log4').getLogger('Channels');
const timeline = require('../libs/timeline');
const channelLib = require('../libs/channel');
const push = require('../libs/push');
const channels = {

};

channels.postChannels = async (ctx) => {

  const name = ctx.checkBody('name').notEmpty().value;
  const alias = ctx.checkBody('alias').notEmpty().value;
  const prefix= ctx.checkBody('prefix').notEmpty().value;
  const description = ctx.checkBody('description').notEmpty().value;
  const allow_config = ctx.checkBody('allow_config').notEmpty().toBoolean().value;
  const need_verified = ctx.checkBody('need_verified').notEmpty().toBoolean().value;
  const avatar = ctx.checkBody('avatar').notEmpty().value;
  const type = ctx.checkBody('type').optional().default("common").value;
  let city,school,college;
  if(type === 'city'){
     city = ctx.checkBody('city').notEmpty().value;
  }else if(type === 'school'){
     school = ctx.checkBody('school').notEmpty().value;
  }else if(type === 'college'){
    school = ctx.checkBody('school').notEmpty().value;
    college = ctx.checkBody('college').notEmpty().value;
  }
  if(ctx.errors){
    logger.warn(ctx.errors);
    ctx.status=422;
    ctx.body = {
      ...config.errors.invalid_params,
      errors:ctx.errors
    };
  }else{
    try{
      var r =  await redisConn.exists(config.redisPrefix.string.channelByAlias+alias);
    }catch(e){
      logger.error(e);
      ctx.status = 500;
      ctx.body = {
        ...config.errors.internal_server_error,
        errors:[
          e
        ]
      };
      return;
    }
    if(r===1){
      ctx.status = 409;
      ctx.body = {
        ...config.errors.conflict,
        errors:[
          "该主题号已存在"
        ]
      };
      return;
    }
    const id = uuid.v4();
    const item = {
      id,
      alias,
      name,
      prefix,
      description,
      allow_config,
      need_verified,
      type,
      avatar,
      created:date.time(),
      updated:date.time()
    };
    const pipeline = redisConn.pipeline();
    pipeline.lpush(config.redisPrefix.list.allChannel,id);
    if(type === 'common'){
      pipeline.lpush(config.redisPrefix.list.commonChannel,id);
    }else if(type === 'city'){
      item.city = city;
      pipeline.lpush(config.redisPrefix.list.cityChannelById+city,id);
    }else if(type === 'school'){
      item.school = school;
      pipeline.lpush(config.redisPrefix.list.schoolChannelById+school,id);

        }else if(type === 'college'){
          item.school = school;
          item.college = college;
          pipeline.lpush(config.redisPrefix.common.channel+config.redisPrefix.common.school+school+":"+config.redisPrefix.common.college+college,id);
    }
     pipeline.hmset(config.redisPrefix.hash.channelById+id,item);
     pipeline.set(config.redisPrefix.string.channelByAlias+alias,id);
    try{
       await pipeline.exec();
    }catch(e){
      logger.error(e);
      ctx.status = 500;
      ctx.body = {
        ...config.errors.internal_server_error,
        errors:[
          e
        ]
      };
      return;
    }
    ctx.status = 201;
    ctx.body = item;
    // write user's timeline
     timeline.postUnsubscribedChannel({
      type,
      channelId:id,
      cityId:city,
      schoolId:school,
      collegeId:college
    });
  }
};
channels.getMessages = async (ctx) => {
  const channelId = ctx.checkParams('id').notEmpty().value;
  const start = ctx.checkQuery('start').optional().default(0).toInt().ge(0).value;
  const limit = ctx.checkQuery('limit').optional().default(config.defaultParams.listLength).toInt().gt(0).le(config.defaultParams.listMaxLength).value;
  if(ctx.errors){
    logger.warn(ctx.errors);
    ctx.status=422;
    ctx.body = {
      ...config.errors.invalid_params,
      errors:ctx.errors
    };
    return;
  }
  const stop = start+limit-1;

  try{
  var channel = await channelLib.getOneChannel(channelId);
  }catch(e){
    ctx.status = e.status;
    ctx.body = e.body;
    return;
  }
  try{
    var idsR = await redisConn.lrange(config.redisPrefix.list.channelMessagesById+channel.id,start,stop);
  }catch(e){
    logger.error(e);
    ctx.status = 500;
    ctx.body = {
      ...config.errors.internal_server_error,
      errors:[
        e
      ]
    };
    return;

  }
  const ids = [];
  for (let i=0;i<idsR.length;i++){
    ids.push(config.redisPrefix.string.messageById+idsR[i]);
  }
  try{
    var result =await redis.mgetalljson(ids);
  }catch(e){
    logger.error(e);
    ctx.status = 500;
    ctx.body = {
      ...config.errors.internal_server_error,
      errors:[
        e
      ]
    };
    return;
  }
  ctx.body = {
    messages:result,
    channel:channel
  }
}
channels.getOneChannel = async (ctx) => {

    const id = ctx.checkParams('id').notEmpty().value;
    if(ctx.errors){
      logger.warn(ctx.errors);
      ctx.status=422;
      ctx.body = {
        ...config.errors.invalid_params,
        errors:ctx.errors
      };
    }else{
      try{
      var result = await channelLib.getOneChannel(id);
      }catch(e){
        ctx.status = e.status;
        ctx.body = e.body;
        return;
      }
      ctx.body = result;
      return;
    }
};

channels.postFollowing = async (ctx) => {

  const userId = ctx.checkBody('user_id').notEmpty().isUUID(null,4).value;
  const channelId = ctx.checkParams('id').notEmpty().value;
  var allow_push = ctx.request.body.allow_push;
  if(allow_push===undefined){
    allow_push = true;
  }
  if(ctx.errors){
    logger.warn(ctx.errors);
    ctx.status=422;
    ctx.body = {
      ...config.errors.invalid_params,
      errors:ctx.errors
    };
  }else{
    try{
    var channel =  await channelLib.getOneChannel(channelId);
    }catch(e){
      ctx.status = e.status;
      ctx.body = e.body;
      return;
    }
    try{
      var r =  await redisConn.exists(config.redisPrefix.common.subscription+config.redisPrefix.common.channel+channel.id+":"+config.redisPrefix.common.user+userId);
    }catch(e){
      logger.error(e);
      ctx.status = 500;
      ctx.body = {
        ...config.errors.internal_server_error,
        errors:[
          e
        ]
      };
      return;
    }
    if(r===1){
      ctx.status = 409;
      ctx.body = {
        ...config.errors.conflict,
        errors:[
          "已订阅该主题"
        ]
      };
      return;
    }
    const item = {
      allow_push,
      created:date.time()
    };

    const promiseArr = [
     redisConn.hmset(config.redisPrefix.common.subscription+config.redisPrefix.common.channel+channel.id+":"+config.redisPrefix.common.user+userId,item),
     redisConn.zadd(config.redisPrefix.sortedSet.userFollowingByUserId+userId,date.time(),channel.id),
     redisConn.zadd(config.redisPrefix.sortedSet.channelFollowerByChannelId+channel.id,date.time(),userId),
     redisConn.zrem(config.redisPrefix.sortedSet.userUnsubscribedChannelById+userId,channel.id)
 ];
 if(allow_push){
   promiseArr.push(redisConn.lpush(config.redisPrefix.list.channelPushById+channel.id,userId));
 }

    try{
      var r =  await Promise.all(promiseArr);
    }catch(e){
      logger.error(e);
      ctx.status = 500;
      ctx.body = {
        ...config.errors.internal_server_error,
        errors:[
          e
        ]
      };
      return;
}

    ctx.status = 201;
    ctx.body = {
      ...item,
      user_id:userId,
      channel:channel
    };
  }
};

channels.postUnfollowing = async (ctx) => {

  const userId = ctx.checkBody('user_id').notEmpty().isUUID(null,4).value;
  const channelId = ctx.checkParams('id').notEmpty().value;
  if(ctx.errors){
    logger.warn(ctx.errors);
    ctx.status=422;
    ctx.body = {
      ...config.errors.invalid_params,
      errors:ctx.errors
    };
  }else{
    try{
    var channel =  await channelLib.getOneChannel(channelId);
    }catch(e){
      ctx.status = e.status;
      ctx.body = e.body;
      return;
    }
    try{
      var r =  await redisConn.exists(config.redisPrefix.common.subscription+config.redisPrefix.common.channel+channel.id+":"+config.redisPrefix.common.user+userId);
    }catch(e){
      logger.error(e);
      ctx.status = 500;
      ctx.body = {
        ...config.errors.internal_server_error,
        errors:[
          e
        ]
      };
      return;
    }
    if(r===0){
      ctx.status = 409;
      ctx.body = {
        ...config.errors.conflict,
        errors:[
          "没有关注该主题"
        ]
      };
      return;
    }

    const promiseArr = [
     redisConn.del(config.redisPrefix.common.subscription+config.redisPrefix.common.channel+channel.id+":"+config.redisPrefix.common.user+userId),
     redisConn.zrem(config.redisPrefix.sortedSet.userFollowingByUserId+userId,channel.id),
     redisConn.zrem(config.redisPrefix.sortedSet.channelFollowerByChannelId+channel.id,userId),
     redisConn.zadd(config.redisPrefix.sortedSet.userUnsubscribedChannelById+userId,date.time(),channel.id),
     redisConn.zrem(config.redisPrefix.sortedSet.userSubscribedChannelById+userId,channel.id)
 ];


    try{
      var r =  await Promise.all(promiseArr);
    }catch(e){
      logger.error(e);
      ctx.status = 500;
      ctx.body = {
        ...config.errors.internal_server_error,
        errors:[
          e
        ]
      };
      return;
}

    ctx.status = 201;
    ctx.body = {
      success:true,
      user_id:userId,
      channel:channel
    };
  }
};

channels.postMessages = async (ctx) => {

  const text = ctx.checkBody('text').notEmpty().value;
  const channelId = ctx.checkParams('id').notEmpty().value;
  const user_id = ctx.checkBody('user_id').optional().isUUID(null,4).value;
  const pictures = ctx.checkBody('pictures').optional().default([]).value;
  const type = ctx.checkBody('type').optional().default("text").value;
  const id = uuid.v4();

  try{
  var channel =  await channelLib.getOneChannel(channelId);
  }catch(e){
    ctx.status = e.status;
    ctx.body = e.body;
    return;
  }
  let link_url,item={
      id,
      text,
      channel:channel,
      type,
      created:date.time(),
      updated:date.time()
    };
  if(user_id){
    item.user_id = user_id;
  }
  if(type === 'link'){
     link_url = ctx.checkBody('link_url').notEmpty().value;
     item.link_url = link_url;
  }
  if(!Array.isArray(pictures)){
    logger.warn(ctx.errors);
    ctx.status=422;
    ctx.body = {
      ...config.errors.invalid_params,
      errors:[
        {
          tags:'pictures must be array.'
        }
      ]
    };
  }else if(pictures.length>0){
    item.pictures = pictures;
  }
  if(ctx.errors){
    logger.warn(ctx.errors);
    ctx.status=422;
    ctx.body = {
      ...config.errors.invalid_params,
      errors:ctx.errors
    };
  }else{

    try{
       await redisConn.set(config.redisPrefix.string.messageById+id,JSON.stringify(item));
    }catch(e){
      logger.error(e);
      ctx.status = 500;
      ctx.body = {
        ...config.errors.internal_server_error,
        errors:[
          e
        ]
      };
      return;

    }

    if(!user_id){
      try{
        await redisConn.lpush(config.redisPrefix.list.channelMessagesById+channel.id,id);
      }catch(e){
        logger.error(e);
        ctx.status = 500;
        ctx.body = {
          ...config.errors.internal_server_error,
          errors:[
            e
          ]
        };
        return;
      }
    }
    ctx.status = 201;
    item.channel =channel;
    ctx.body = item;
    if(user_id){
      timeline.postUnreadMessage({
        messageId:id,
        userId:user_id,
       });

       timeline.postMessage(
         {
           messageId:id,
           userId:user_id,
          }
       );
       push.user({
         userId:user_id,
         messageId:id
       });
    }else{

      timeline.postUnreadMessage({
        messageId:id,
        channelId:channel.id
       });

       timeline.postMessage(
         {
           messageId:id,
           channelId:channel.id
          }
       );
       push.channel({
         channelId:channel.id,
         messageId:id
       });
    }

  }
};
module.exports = channels;
