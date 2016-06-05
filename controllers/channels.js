const redisConn = require('../utils/redisConn');
const redis = require('../utils/redis.js');
const config = require('../config');
const date = require('../utils/date');
const common = require('../utils/common');
const uuid = require('node-uuid');
const logger = require('koa-log4').getLogger('Channels');
const timeline = require('../libs/timeline');
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
  let city_id,school_id,college_id;
  if(type === 'city'){
     city_id = ctx.checkBody('city_id').notEmpty().value;
  }else if(type === 'school'){
     school_id = ctx.checkBody('school_id').notEmpty().value;
  }else if(type === 'college'){
    school_id = ctx.checkBody('school_id').notEmpty().value;
    college_id = ctx.checkBody('college_id').notEmpty().value;
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
    if(type === 'common'){
      pipeline.lpush(config.redisPrefix.list.commonChannel,id);
    }else if(type === 'city'){
      item.city_id = city_id;
      pipeline.lpush(config.redisPrefix.list.cityChannelById+city_id,id);
    }else if(type === 'school'){
      item.school_id = school_id;
      pipeline.lpush(config.redisPrefix.list.schoolChannelById+school_id,id);

        }else if(type === 'college'){
          item.school_id = school_id;
          item.college_id = college_id;
          pipeline.lpush(config.redisPrefix.common.channel+config.redisPrefix.common.school+school_id+":"+config.redisPrefix.common.college+college_id,id);
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
      cityId:city_id,
      schoolId:school_id,
      collegeId:college_id
    });
  }
};

channels.getChannels = async (ctx) => {
  let tagsQuery = ctx.checkQuery('tags').optional().default('公共').value;
  const start = ctx.checkQuery('start').optional().default(0).toInt().ge(0).value;
  const limit = ctx.checkQuery('limit').optional().default(config.defaultParams.listLength).toInt().ge(0).le(config.defaultParams.listMaxLength).value;
  const stop = start+limit;

};

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
        var idR = await redisConn.hgetall(config.redisPrefix.channelsByIdHash+id);
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
          var idFromName = await redisConn.get(config.redisPrefix.channelsByName+id);
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
            var idFromAlias = await redisConn.get(config.redisPrefix.channelsByAliasString+id);
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
              var aliasR = await redisConn.hgetall(config.redisPrefix.channelsByIdHash+idFromAlias);
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
            var nameR = await redisConn.hgetall(config.redisPrefix.channelsByIdHash+idFromName);
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

module.exports = channels;
