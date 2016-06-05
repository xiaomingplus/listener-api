const redisConn = require('../utils/redisConn');
const redis = require('../utils/redis.js');
const config = require('../config');
const date = require('../utils/date');
const common = require('../utils/common');
const uuid = require('node-uuid');
const logger = require('koa-log4').getLogger('Subscriptions');
const subscriptions = {

};

subscriptions.postSubscriptions = async (ctx) => {

  const userId = ctx.checkBody('user_id').notEmpty().isUUID(null,4).value;
  const channelId = ctx.checkBody('channel_id').notEmpty().isUUID(null,4).value;
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
      var r =  await redisConn.exists(config.redisPrefix.common.subscription+config.redisPrefix.common.channel+channelId+":"+config.redisPrefix.common.user+userId);
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
     redisConn.hmset(config.redisPrefix.common.subscription+config.redisPrefix.common.channel+channelId+":"+config.redisPrefix.common.user+userId,item),
     redisConn.zadd(config.redisPrefix.sortedSet.userFollowingByUserId+userId,date.time(),channelId),
     redisConn.zadd(config.redisPrefix.sortedSet.channelFollowerByChannelId+channelId,date.time(),userId)
 ];
 if(allow_push){
   promiseArr.push(redisConn.lpush(config.redisPrefix.list.channelPushById+channelId,userId));
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
      channel_id:channelId
    };
  }
};

subscriptions.getSubscriptions = async (ctx) => {
  let tagsQuery = ctx.checkQuery('tags').optional().default('公共').value;
  const start = ctx.checkQuery('start').optional().default(0).toInt().ge(0).value;
  const limit = ctx.checkQuery('limit').optional().default(config.defaultParams.listLength).toInt().ge(0).le(config.defaultParams.listMaxLength).value;
  const stop = start+limit;
  const tagsTemp = tagsQuery.split(',');
  const tags = [];
  for(let i=0;i<tagsTemp.length;i++){
    let tag = tagsTemp[i].split(' ');
    if(tag.length>1){
      tags[i] = tag;
    }else{
      tags[i] = tagsTemp[i];
    }
  }


  const interPromiseArr = [];
  let unions = [];
for (let i=0;i<tags.length;i++){

  if(Array.isArray(tags[i])){
    var inters = [];
    for(let j=0;j<tags[i].length;j++){
      inters.push(config.redisPrefix.subscriptionsTags+tags[i][j]);
    }
    interPromiseArr.push(redisConn.sinter.apply(redisConn,inters));

  }else{
    unions.push(config.redisPrefix.subscriptionsTags+tags[i]);
  }

}
var unionIds,interIdsTemp,interIds=[];
if(interPromiseArr.length>0){
  try{
  interIdsTemp = await Promise.all(interPromiseArr);
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
}else{
  interIdsTemp=[[]];
}

if(unions.length>0){
  try{
  unionIds = await redisConn.sunion.apply(redisConn,unions);
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
}else{
  unionIds=[]
}
for (let i=0;i<interIdsTemp.length;i++){
  for(let j=0;j<interIdsTemp[i].length;j++){
    interIds.push(interIdsTemp[i][j]);
  }
}



  const idsTemp = [];
  for (let i=0;i<interIds.length;i++){
    idsTemp.push(config.redisPrefix.subscriptionsById+interIds[i]);
  }
  for (let i=0;i<unionIds.length;i++){
    idsTemp.push(config.redisPrefix.subscriptionsById+unionIds[i]);
  }
  const ids = common.uniqueArray(idsTemp);
  try{
    var result =await redis.mhgetall(ids);
    console.log(result);
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
    subscriptions:result
  }
};

subscriptions.getOneSubscription = async (ctx) => {

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
        var idR = await redisConn.hgetall(config.redisPrefix.subscriptionsById+id);
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
      if(common.isEmptyObject(idR)){
        try{
          var idFromName = await redisConn.get(config.redisPrefix.subscriptionsByName+id);
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

        if(idFromName===null){

          try{
            var idFromAlias = await redisConn.get(config.redisPrefix.subscriptionsByAlias+id);
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

          if(idFromAlias===null){
            ctx.status = 404;
            ctx.body = {
              ...config.errors.not_found,
              errors:[
                "没有找到该主题"
              ]
            }
            return;
          }else{
            try{
              var aliasR = await redisConn.hgetall(config.redisPrefix.subscriptionsById+idFromAlias);
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

            ctx.body = aliasR;
          }

        }else{

          try{
            var nameR = await redisConn.hgetall(config.redisPrefix.subscriptionsById+idFromName);
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

          ctx.body = nameR;
        }
      }else{
        ctx.body = idR;
      }



    }
};

module.exports = subscriptions;
