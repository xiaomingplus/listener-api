const redisConn = require('../utils/redisConn');
const redis = require('../utils/redis.js');
const config = require('../config');
const date = require('../utils/date');
const common = require('../utils/common');
const uuid = require('node-uuid');
const logger = require('koa-log4').getLogger('Users');
const users = {

};

users.postUsers = async (ctx) => {
  const name = ctx.checkBody('name').notEmpty().value;
  const tel = ctx.checkBody('tel').notEmpty().isInt().len(11,11).value;
  const avatar = ctx.checkBody('avatar').notEmpty().isUrl().value;
  const educations = ctx.checkBody('educations').optional().default([]).value;
  const city_id = ctx.checkBody('city_id').notEmpty().value;
  const device = ctx.checkBody('device').optional().value;
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
    try{
      var r =  await redisConn.exists(config.redisPrefix.string.userByTel+tel);
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
          "该手机号码已存在"
        ]
      };
      return;
    }
    const id = uuid.v4();
    const item = {
      id,
      tel,
      name,
      avatar,
      created:date.time(),
      updated:date.time()
    };
    if(educations){
      item.educations = JSON.stringify(educations);
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
     redisConn.set(config.redisPrefix.string.userByTel+tel,id),
     redisConn.lpush(config.redisPrefix.list.allUser,id),
     redisConn.lpush(config.redisPrefix.list.cityUserById+city_id,id)
 ];


    for(let i=0;i<educations.length;i++){
      if(educations[i].school_id){
        promiseArr.push(redisConn.lpush(config.redisPrefix.list.schoolUserById+educations[i].school_id,id));
        if(educations[i].college_id){
          promiseArr.push(redisConn.lpush(config.redisPrefix.common.user+config.redisPrefix.common.school+educations[i].school_id+educations[i].school_id+":"+config.redisPrefix.common.college+educations[i].college_id,id));
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
        var idR = await redisConn.hgetall(config.redisPrefix.hash.userById+id);
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
          var idFromTel = await redisConn.get(config.redisPrefix.string.userByTel+id);
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

        if(idFromTel===null){



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
            var telR = await redisConn.hgetall(config.redisPrefix.hash.userById+idFromTel);
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

          ctx.body = telR;
        }
      }else{
        ctx.body = idR;
      }



    }
};

module.exports = users;
