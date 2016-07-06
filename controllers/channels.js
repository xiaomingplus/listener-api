import redisConn from '../../listener-libs/redisConn';
import {mgetjson} from 'general-node-utils';
import config from '../../listener-libs/config';
import uuid from 'node-uuid';
import logger4 from 'koa-log4';
const logger = logger4.getLogger('channel');
import {postUnsubscribedChannel,postUnreadMessage,postMessage} from '../../listener-libs/timeline';
import {getOneChannel} from '../../listener-libs/channel';
import {user as pushToUser,channel as pushToChannel} from '../../listener-libs/push';
import {time} from 'general-js-utils';
import {getOneUser} from '../../listener-libs/user';
import {generateToken} from '../../listener-libs/crypto';
import {isObjectEmpty} from 'general-js-utils';
const channels = {

};
function slow(){
  return new Promise((s,f)=>{
    setTimeout(()=>{
      s();
    },2000);
  });
}
channels.postChannels = async (ctx) => {
  const name = ctx.checkBody('name').notEmpty().value;
  const alias = ctx.checkBody('alias').notEmpty().value;
  const prefix= ctx.checkBody('prefix').notEmpty().value;
  const description = ctx.checkBody('description').notEmpty().value;
  const allow_config = ctx.checkBody('allow_config').notEmpty().toBoolean().value;
  const domain = ctx.checkBody('domain').notEmpty().isUrl().value;
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

  if(allow_config){
    var config_url = ctx.checkBody('config_url').notEmpty().isUrl().value;
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
    try{
      var token = await generateToken();
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
    const item = {
      id,
      alias,
      name,
      prefix,
      description,
      allow_config:allow_config?1:0,
      type,
      avatar,
      created:time(),
      updated:time()
    };

    if(config_url){
      item.config_url=config_url;
    }
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
     pipeline.hmset(config.redisPrefix.hash.channelAuthorizationById+id,{
       token,
       domain
     });
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
    item.allow_config = allow_config?true:false;
    ctx.body = item;
    // write user's timeline
     postUnsubscribedChannel({
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
  var channel = await getOneChannel(channelId);
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
    var result =await mgetjson(redisConn,ids);
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
  channel.allow_config=channel.allow_config==="1"?true:false
  ctx.body = {
    list:result,
    channel:channel
  }
}
channels.getOneChannel = async (ctx) => {
    const userId = ctx.checkQuery('user_id').optional().value;
    const id = ctx.checkParams('id').notEmpty().value;
    if(ctx.errors){
      logger.warn(ctx.errors);
      ctx.status=422;
      ctx.body = {
        ...config.errors.invalid_params,
        errors:ctx.errors
      };
    }else{
      if(userId){
        try{
        var user =  await getOneUser(userId);
        }catch(e){
          ctx.status = e.status;
          ctx.body = e.body;
          return;
        }

      }

      try{
      var result = await getOneChannel(id,userId?user.id:null);
      }catch(e){
        ctx.status = e.status;
        ctx.body = e.body;
        return;
      }
      ctx.body = result;
      return;
    }
};

channels.getOneChannelAuthorizations= async (ctx) =>{
  const channelId = ctx.checkParams('id').notEmpty().value;
  try{
  var result = await getOneChannel(channelId);
  }catch(e){
    console.log(e);
    ctx.status = e.status;
    ctx.body = e.body;
    return;
  }

  try{
    var auth = await redisConn.hgetall(config.redisPrefix.hash.channelAuthorizationById+result.id);
    console.log(auth);
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
  if(!isObjectEmpty(auth)){
    ctx.body =auth;
    return;
  }else{
  ctx.status = 404;
  ctx.body = {
    ...config.errors.not_found,
    errors:[
      {
        "id":"id is not exists or no token"
      }
    ]
  };
  }
}

channels.postSubscriptions = async (ctx) => {

  const userId = ctx.userId;
  const channelId = ctx.checkParams('id').notEmpty().value;
  let allow_push = ctx.request.body.allow_push;
  if(allow_push===undefined){
    allow_push = config.defaultParams.allow_push;
  }
  allow_push = allow_push?1:0;
  if(ctx.errors){
    logger.warn(ctx.errors);
    ctx.status=422;
    ctx.body = {
      ...config.errors.invalid_params,
      errors:ctx.errors
    };
  }else{
    try{
    var channel =  await getOneChannel(channelId);
    }catch(e){
      ctx.status = e.status;
      ctx.body = e.body;
      return;
    }
    try{
    var user =  await getOneUser(userId);
    }catch(e){
      ctx.status = e.status;
      ctx.body = e.body;
      return;
    }
    try{
      var r =  await redisConn.exists(config.redisPrefix.common.subscription+config.redisPrefix.common.channel+channel.id+":"+config.redisPrefix.common.user+user.id);
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
      created:time()
    };

    const promiseArr = [
     redisConn.hmset(config.redisPrefix.common.subscription+config.redisPrefix.common.channel+channel.id+":"+config.redisPrefix.common.user+user.id,item),
     redisConn.zadd(config.redisPrefix.sortedSet.userFollowingByUserId+user.id,time(),channel.id),
     redisConn.zadd(config.redisPrefix.sortedSet.channelFollowerByChannelId+channel.id,time(),user.id),
     redisConn.zrem(config.redisPrefix.sortedSet.userUnsubscribedChannelById+user.id,channel.id)
 ];
 if(allow_push){
   promiseArr.push(redisConn.sadd(config.redisPrefix.set.channelPushById+channel.id,user.id));
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
    item.allow_push = allow_push?true:false;
    channel.allow_push= item.allow_push;
    channel.following = true;
    channel.followers_count = channel.followers_count+1;
      ctx.status = 201;
      ctx.body = {
        ...item,
        user:user,
        channel:channel
      };

  }
};

channels.delSubscriptions = async (ctx) => {

  const userId = ctx.userId;
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
    var channel =  await getOneChannel(channelId);
    }catch(e){
      ctx.status = e.status;
      ctx.body = e.body;
      return;
    }
    try{
    var user =  await getOneUser(userId);
    }catch(e){
      ctx.status = e.status;
      ctx.body = e.body;
      return;
    }
    try{
      var r =  await redisConn.exists(config.redisPrefix.common.subscription+config.redisPrefix.common.channel+channel.id+":"+config.redisPrefix.common.user+user.id);
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
     redisConn.del(config.redisPrefix.common.subscription+config.redisPrefix.common.channel+channel.id+":"+config.redisPrefix.common.user+user.id),
     redisConn.zrem(config.redisPrefix.sortedSet.userFollowingByUserId+user.id,channel.id),
     redisConn.zrem(config.redisPrefix.sortedSet.channelFollowerByChannelId+channel.id,user.id),
     redisConn.zadd(config.redisPrefix.sortedSet.userUnsubscribedChannelById+user.id,1,channel.id),
     redisConn.zrem(config.redisPrefix.sortedSet.userSubscribedChannelById+user.id,channel.id),
     redisConn.srem(config.redisPrefix.set.channelPushById+channel.id,user.id)
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

    ctx.status = 200;
    channel.following = false;
    channel.followers_count = channel.followers_count-1;
    delete channel.allow_push;
    ctx.body = {
      user:user,
      channel:channel
    };
  }
};

channels.postMessages = async (ctx) => {
  const text = ctx.checkBody('text').notEmpty().value;
  const channelId = ctx.checkParams('id').notEmpty().value;
  const userId = ctx.checkBody('user_id').optional().value;
  const pictures = ctx.checkBody('pictures').optional().default([]).value;
  const type = ctx.checkBody('type').optional().default("text").value;
  const id = uuid.v4();

  try{
  var channel =  await getOneChannel(channelId);
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
      created:time(),
      updated:time()
    };
  if(userId){
    try{
    var user =  await getOneUser(userId);
    }catch(e){
      ctx.status = e.status;
      ctx.body = e.body;
      return;
    }
    item.user_id = userId;
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

    if(!userId){
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
    if(userId){
      postUnreadMessage({
        messageId:id,
        userId:user.id,
       });

       postMessage(
         {
           messageId:id,
           userId:user.id,
          }
       );
       pushToUser({
         userId:user.id,
         messageId:id
       });
    }else{

      postUnreadMessage({
        messageId:id,
        channelId:channel.id
       });

      postMessage(
         {
           messageId:id,
           channelId:channel.id
          }
       );
       console.log('1');
       pushToChannel({
         channelId:channel.id,
         messageId:id
       });
       console.log('2');
    }

  }
};
export default channels;
