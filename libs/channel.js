const logger = require('koa-log4').getLogger('ChannelsLib');
const redisConn = require('../utils/redisConn');
const config =require('../config');
const common = require('../utils/common')
module.exports = {

  getOneChannel: async(id) => {
    return new Promise(async(s, f) => {
      try {
        var idR = await redisConn.hgetall(config.redisPrefix.hash.channelById + id);
      } catch (e) {
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
      if (common.isEmptyObject(idR)) {
        try {
          var idFromAlias = await redisConn.get(config.redisPrefix.string.channelByAlias + id);
        } catch (e) {
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
        if (idFromAlias === null) {
          f({
            status: 404,
            body: {
              ...config.errors.not_found,
              errors: [{
                "id": "没有找到该主题"
              }]
            }
          });
          return;
        } else {
          try {
            var aliasR = await redisConn.hgetall(config.redisPrefix.hash.channelById + idFromAlias);
          } catch (e) {
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

          s(aliasR);
          return;
        }


      } else {
        s(idR
        );
        return;
      }
    });
  }
}
