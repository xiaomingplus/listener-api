const redisConn = require('../utils/redisConn');
const redis = require('../utils/redis.js');
const config = require('../config');
const date = require('../utils/date');
const common = require('../utils/common');
const uuid = require('node-uuid');
const logger = require('koa-log4').getLogger('Messages');
const timeline = require('../libs/timeline');
const push = require('../libs/push');
const messages = {

};

messages.postMessages = async (ctx) => {

  const text = ctx.checkBody('text').notEmpty().value;
  const channel_id = ctx.checkBody('channel_id').notEmpty().isUUID(null,4).value;
  const user_id = ctx.checkBody('user_id').optional().isUUID(null,4).value;
  const pictures = ctx.checkBody('pictures').optional().default([]).value;
  const type = ctx.checkBody('type').optional().default("text").value;
  const id = uuid.v4();
  let link_url,item={
      id,
      text,
      channel_id,
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
       await redisConn.lpush(config.redisPrefix.list.channelMessagesById+channel_id,id);
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
        channelId:channel_id
       });

       timeline.postMessage(
         {
           messageId:id,
           channelId:channel_id
          }
       )
    }

  }
};

messages.getOneMessage = () => {

}

module.exports = messages;
