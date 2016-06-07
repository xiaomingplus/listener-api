const logger = require('koa-log4').getLogger('UsersLib');
const redisConn = require('../utils/redisConn');
const config =require('../config');
const common = require('../utils/common')
module.exports = {

  getOneUser: async(id) => {
    logger.info(id);
    return new Promise(async(s, f) => {
      try{
        var idR = await redisConn.hgetall(config.redisPrefix.hash.userById+id);
      }catch(e){
        logger.error(e);
        f(
          {
            status : 500,
            body :{
              ...config.errors.internal_server_error,
              errors:[
                e
              ]
            }
          }
        );
        return;

      }
      if(common.isEmptyObject(idR)){
        try{
          var idFromAccount = await redisConn.get(config.redisPrefix.string.userByAccount+id);
        }catch(e){
          logger.error(e);
          f(
            {
              status : 500,
              body :{
                ...config.errors.internal_server_error,
                errors:[
                  e
                ]
              }
            }
          );
          return;

        }

        if(idFromAccount===null){
          f({
            status: 404,
            body: {
              ...config.errors.not_found,
              errors: [{
                "id": "没有找到该用户"
              }]
            }
          });
            return;

        }else{

          try{
            var accountR = await redisConn.hgetall(config.redisPrefix.hash.userById+idFromAccount);
          }catch(e){
            logger.error(e);
            f(
              {
                status : 500,
                body :{
                  ...config.errors.internal_server_error,
                  errors:[
                    e
                  ]
                }
              }
            );
            return;

          }
          logger.info(accountR)
          s(accountR);
        }
      }else{
        logger.info(idR)
        s(idR);
      }
    });
  }
}
