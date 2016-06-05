const redisConn = require('../utils/redisConn');
const redis = require('../utils/redis.js');
const config = require('../config');
const date = require('../utils/date');
const common = require('../utils/common');
const logger = require('koa-log4').getLogger('schools');
const schools = {

};

schools.postSchools = async (ctx) => {

  const id = ctx.checkBody('id').notEmpty().toInt().value;
  const name = ctx.checkBody('name').notEmpty().value;
  if(ctx.errors){
    logger.warn(ctx.errors);
    ctx.status=422;
    ctx.body = {
      ...config.errors.invalid_params,
      errors:ctx.errors
    };
  }else{

    try{
      var r =  await redisConn.exists(config.redisPrefix.schoolsByIdHansh+id);
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
          "该学校已存在"
        ]
      };
      return;
    }
    const item = {
      id:id,
      name:name,
      created:date.time(),
      updated:date.time()
    };
    try{
       await Promise.all([
        redisConn.hmset(config.redisPrefix.schoolsByIdHansh+id,item),
        redisConn.set(config.redisPrefix.schoolsByNameString+name,item.id),
        redisConn.lpush(config.redisPrefix.schoolsList+"a",item.id)
    ]);
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
  }
};

schools.getSchools = async (ctx) => {
  const start = ctx.checkQuery('start').optional().default(0).toInt().ge(0).value;
  const limit = ctx.checkQuery('limit').optional().default(config.defaultParams.listLength).toInt().ge(0).le(config.defaultParams.listMaxLength).value;
  const stop = start+limit;
  try{
    var idsR = await redisConn.lrange(config.redisPrefix.schoolsList+"a",start,stop);
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
    ids.push(config.redisPrefix.schoolsByIdHansh+idsR[i]);
  }
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
    schools:result
  }
};

schools.getOneSchool = async (ctx) => {

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
        var idR = await redisConn.hgetall(config.redisPrefix.schoolsByIdHansh+id);
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
          var idFromName = await redisConn.get(config.redisPrefix.schoolsByNameString+id);
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
          ctx.status = 404;
          ctx.body = {
            ...config.errors.not_found,
            errors:[
              "没有找到该学校"
            ]
          }
        }else{

          try{
            var nameR = await redisConn.hgetall(config.redisPrefix.schoolsByIdHansh+idFromName);
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

module.exports = schools;
