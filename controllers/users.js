const redisConn = require('../utils/redisConn');
const redis = require('../utils/redis.js');
const config = require('../config');
const date = require('../utils/date');
const common = require('../utils/common');
const uuid = require('node-uuid');
const userLib = require('../libs/user');
const logger = require('koa-log4').getLogger('Users');
const timeline = require('../libs/timeline');
const users = {

};

users.postUsers = async (ctx) => {
  const name = ctx.checkBody('name').notEmpty().value;
  const account = ctx.checkBody('account').notEmpty().value;
  const token = ctx.checkBody('token').notEmpty().value;
  const avatar = ctx.checkBody('avatar').notEmpty().isUrl().value;
  const educations = ctx.checkBody('educations').optional().default([]).value;
  const city = ctx.checkBody('city').optional().value;
  const device = ctx.checkBody('device').optional().value;
  const type = ctx.checkBody('type').notEmpty().value;
  //todo 检测学校和城市 是否存在以及是否符合规范
  if(educations && !Array.isArray(educations)){
    logger.warn(ctx.errors);
    ctx.status=422;
    ctx.body = {
      ...config.errors.invalid_params,
      errors:[
        {
          tags:'educations must be array.'
        }
      ]
    };
    return;
  }



  if(ctx.errors){
    logger.warn(ctx.errors);
    ctx.status=422;
    ctx.body = {
      ...config.errors.invalid_params,
      errors:ctx.errors
    };
    return;
  }else{

    if(type === 'phone'){

    }else if(type === 'wechat'){

    }else if(type === 'bearychat'){

      // pass

    }else{
      logger.warn(ctx.errors);
      ctx.status=422;
      ctx.body = {
        ...config.errors.invalid_params,
        errors:[
          {
            tags:'this login type is not support now'
          }
        ]
      };
      return;
    }


    try{
      var r =  await redisConn.exists(config.redisPrefix.string.userByAccount+account);
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
          "该账户已存在"
        ]
      };
      return;
    }
    const id = uuid.v4();
    const item = {
      id,
      account,
      name,
      avatar,
      type,
      created:date.time(),
      updated:date.time()
    };
    if(educations){
      item.educations = JSON.stringify(educations);
    }
    if(city){
      item.city = city;
    }

    if(device && !common.isEmptyObject(device) && device.type && device.id ){
      const _device = {};
      _device[device.type] = [
        {
          id:device.id
        }
      ];

      item.device = JSON.stringify(_device);

    }else if(device && !common.isEmptyObject(device) && device.type && !device.id){
      ctx.status=422;
      ctx.body = {
        ...config.errors.invalid_params,
        errors:[
          {
            "device.id":"device must have proerty id"
          }
        ]
      };
      return;
    }
    const promiseArr = [
     redisConn.hmset(config.redisPrefix.hash.userById+id,item),
     redisConn.set(config.redisPrefix.string.userByAccount+account,id),
     redisConn.lpush(config.redisPrefix.list.allUser,id),
     redisConn.lpush(config.redisPrefix.list.cityUserById+city,id)
 ];

     if(city){
       promiseArr.push(redisConn.lpush(config.redisPrefix.list.cityUserById+city,id));
     }
    for(let i=0;i<educations.length;i++){
      if(educations[i].school){
        promiseArr.push(redisConn.lpush(config.redisPrefix.list.schoolUserById+educations[i].school,id));
        if(educations[i].college){
          promiseArr.push(redisConn.lpush(config.redisPrefix.common.user+config.redisPrefix.common.school+educations[i].school+educations[i].school+":"+config.redisPrefix.common.college+educations[i].college,id));
        }
      }
    }

    try{
       await Promise.all(promiseArr);
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

    timeline.postChannelForNewUser({
      educations:educations,
      city:city,
      userId:id
    })
  }
};



users.getOneUser = async (ctx) => {

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
      var result = await userLib.getOneUser(id);
      }catch(e){
        logger.error(e)
        ctx.status = e.status;
        ctx.body = e.body;
        return;
      }
      ctx.body = result;
      return;
    }
};

users.getUnsubscriptions = async (ctx) => {
    const userId = ctx.checkParams('id').notEmpty().value;
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
    var user =  await userLib.getOneUser(userId);
    }catch(e){
      console.log('1');
      console.log(e);
      ctx.status = e.status;
      ctx.body = e.body;
      return;
    }
    try{
      var idsR = await redisConn.zrevrange(config.redisPrefix.sortedSet.userUnsubscribedChannelById+user.id,start,stop);
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
    const ids = [],countIds=[];
    for (let i=0;i<idsR.length;i++){
      ids.push(config.redisPrefix.hash.channelById+idsR[i]);
      countIds.push(config.redisPrefix.sortedSet.channelFollowerByChannelId+idsR[i]);
    }
    try{
      var result =await redis.mhgetall(ids);
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

    try{
      var followers_counts = await redis.mzcount(countIds);
    }catch(e){
      logger.error(e);
      f({
        status: 5000,
        body: {
          ...config.errors.internal_server_error,
          errors: [
            e
          ]
        }
      });
      return;
    }
    for(let i=0;i<result.length;i++){
      result[i].following=false;
      result[i].followers_count = followers_counts[i]
      if(result[i].allow_config==="0"){
        result[i].allow_config=false;
      }else{
        result[i].allow_config=true;
      }
    }
    ctx.body = {
      list:result
    }

}

users.getFollowings = async (ctx) => {
  const userId = ctx.checkParams('id').notEmpty().value;
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
  var user =  await userLib.getOneUser(userId);
  }catch(e){
    ctx.status = e.status;
    ctx.body = e.body;
    return;
  }
  try{
    var idsR = await redisConn.zrevrange(config.redisPrefix.sortedSet.userFollowingByUserId+user.id,start,stop);
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
  const ids = [],countIds=[];
  for (let i=0;i<idsR.length;i++){
    ids.push(config.redisPrefix.hash.channelById+idsR[i]);
    countIds.push(config.redisPrefix.sortedSet.channelFollowerByChannelId+idsR[i]);
  }
  try{
    var result =await redis.mhgetall(ids);
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
  try{
    var followers_counts = await redis.mzcount(countIds);
  }catch(e){
    logger.error(e);
    f({
      status: 5000,
      body: {
        ...config.errors.internal_server_error,
        errors: [
          e
        ]
      }
    });
    return;
  }
  const subscriptionKeys = [];
  for(let i=0;i<result.length;i++){
    subscriptionKeys.push(config.redisPrefix.common.subscription+config.redisPrefix.common.channel+result[i].id+":"+config.redisPrefix.common.user+user.id);
    result[i].following=true;
    result[i].followers_count = followers_counts[i]
    if(result[i].allow_config==="0"){
      result[i].allow_config=false;
    }else{
      result[i].allow_config=true;
    }
  }
  const allow_pushArr =await redis.mhgetall(subscriptionKeys);
  for(let i=0;i<result.length;i++){
    result[i].allow_push = (allow_pushArr[i].allow_push==='0'?false:true)
  }
  ctx.body = {
    list:result
  }

}

users.getMessages = async (ctx) => {
  const userId = ctx.checkParams('id').notEmpty().value;
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
  var user =  await userLib.getOneUser(userId);
  }catch(e){
    ctx.status = e.status;
    ctx.body = e.body;
    return;
  }
  try{
    var idsR = await redisConn.lrange(config.redisPrefix.list.userMessagesById+user.id,start,stop);
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
    list:result
  }
}

module.exports = users;
