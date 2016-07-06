import redisConn from '../../listener-libs/redisConn';
import {
  mhgetall,
  mzcount,
  mgetjson
} from 'general-node-utils';
import config from '../../listener-libs/config';
import uuid from 'node-uuid';
import logger4 from 'koa-log4';
const logger = logger4.getLogger('user');
import {
  postChannelForNewUser
} from '../../listener-libs/timeline';
import {
  time,
  isObjectEmpty,
  randomNumber
} from 'general-js-utils';
import {
  md5Salt,
  generateToken
} from '../../listener-libs/crypto';
import {
  getOneUser
} from '../../listener-libs/user'
const users = {

};
users.postCode = async(ctx) => {
  const tel = ctx.checkParams("tel").notEmpty().isMobilePhone("The params tel must be mobile phone number!", "zh-CN").value;
  if (ctx.errors) {
    logger.warn(ctx.errors);
    ctx.status = 422;
    ctx.body = {
      ...config.errors.invalid_params,
      errors: ctx.errors
    };
    return;
  }
  const code = 123456;
  // const code = randomNumber(6);

  try {
    var codeSetR = await redisConn.set(config.redisPrefix.string.codeByTel + tel, code, "EX", config.defaultParams.verificationCodeExpire, "NX");
  } catch (e) {
    logger.error(e);
    ctx.status = 500;
    ctx.body = {
      ...config.errors.internal_server_error,
      errors: [
        e
      ]
    };
    return;
  }
  if (!codeSetR) {
    try {
      var codeR = await redisConn.get(config.redisPrefix.string.codeByTel + tel);
      await redisConn.expire(config.redisPrefix.string.codeByTel + tel, config.defaultParams.verificationCodeExpire);
    } catch (e) {
      logger.error(e);
      ctx.status = 500;
      ctx.body = {
        ...config.errors.internal_server_error,
        errors: [
          e
        ]
      };
      return;
    }
    //todo send sms
    ctx.body = {
      ok: true
    }
  } else {
    //todo send sms
    ctx.body = {
      ok: true
    }
  }

};
users.postSessions = async(ctx) => {
  const account = ctx.checkParams('account').notEmpty().value;
  const token = ctx.checkBody('token').notEmpty().value;
  const type = ctx.checkBody('type').notEmpty().value;
  if (type === 'tel') {
    ctx.checkParams('account').notEmpty().isMobilePhone("account must be mobile phone number!", "zh-CN").value;
  }
  if (ctx.errors) {
    logger.warn(ctx.errors);
    ctx.status = 422;
    ctx.body = {
      ...config.errors.invalid_params,
      errors: ctx.errors
    };
    return;
  }
  if (type !== 'device' && type !== 'tel') {
    logger.warn(ctx.errors);
    ctx.status = 422;
    ctx.body = {
      ...config.errors.invalid_params,
      errors: [{
        tags: 'this login type is not support now'
      }]
    };
    return;
  }

  try {
    var user = await getOneUser(account);
  } catch (e) {
    logger.error(e);
    ctx.status = e.status;
    ctx.body = e.body;
    return;
  }
  if (type === 'device') {
    try {
      var verification = await md5Salt(token + user.id, user.created);
    } catch (e) {
      logger.error(e);
      ctx.status = 500;
      ctx.body = {
        ...config.errors.internal_server_error,
        errors: [
          e
        ]
      };
      return;
    }
    if (verification !== user.verification) {
      ctx.status = 401;
      ctx.body = {
        ...config.errors.unauthorized,
        errors: [{
          token: "token is missing,invalid or expired"
        }]
      }
      return;
    } else {
      delete user.verification;
    }
  } else if (type === 'tel') {
    try {
      var verification = await redisConn.get(config.redisPrefix.string.codeByTel + user.tel);
    } catch (e) {
      logger.error(e);
      ctx.status = 500;
      ctx.body = {
        ...config.errors.internal_server_error,
        errors: [
          e
        ]
      };
      return;
    }
    if (verification != token) {
      ctx.status = 401;
      ctx.body = {
        ...config.errors.unauthorized,
        errors: [{
          token: "token is missing,invalid or expired"
        }]
      }
      return;
    } else {
      try {
        await redisConn.del(config.redisPrefix.string.codeByTel + user.tel);
      } catch (e) {
        logger.error(e);
        ctx.status = 500;
        ctx.body = {
          ...config.errors.internal_server_error,
          errors: [
            e
          ]
        };
        return;
      }
    }
  }
  try {
    var sessionToken = await generateToken();
  } catch (e) {
    logger.error(e);
    ctx.status = 500;
    ctx.body = {
      ...config.errors.internal_server_error,
      errors: [
        e
      ]
    };
    return;
  }
  const expire = time() + config.defaultParams.sessionTokenExpire;
  try {
    await redisConn.hmset(config.redisPrefix.hash.sessionByToken + sessionToken, {
      id: user.id,
      created: time()
    });
    await redisConn.lpush(config.redisPrefix.list.sessionByUserId + user.id, sessionToken);
    await redisConn.expireat(config.redisPrefix.hash.sessionByToken + sessionToken, expire);
  } catch (e) {
    logger.error(e);
    ctx.status = 500;
    ctx.body = {
      ...config.errors.internal_server_error,
      errors: [
        e
      ]
    };
    return;
  }

  ctx.status = 201;
  ctx.body = {
    user: user,
    token: sessionToken,
    expire: expire
  }

};
users.deleteSessions = async(ctx) => {
  const account = ctx.userId;
  const token = ctx.token;
  try {
    await redisConn.del(config.redisPrefix.hash.sessionByToken);
  } catch (e) {
    logger.error(e);
    ctx.status = 500;
    ctx.body = {
      ...config.errors.internal_server_error,
      errors: [
        e
      ]
    };
    return;
  }

  ctx.status = 200;
  ctx.body = {}
};
users.postUsers = async(ctx) => {
  const name = ctx.checkBody('name').optional().value;
  const _account = ctx.checkBody('account').notEmpty().value;
  const token = ctx.checkBody('token').notEmpty().value;
  const avatar = ctx.checkBody('avatar').optional().isUrl().value;
  const _educations = ctx.checkBody('educations').optional().value;
  const city = ctx.checkBody('city').optional().value;
  const device = ctx.checkBody('device').optional().value;
  const type = ctx.checkBody('type').notEmpty().value;
  if (type === 'tel') {
    ctx.checkBody('account').notEmpty().isMobilePhone("account must be mobile phone number!", "zh-CN").value;
  }
  if (ctx.errors) {
    logger.warn(ctx.errors);
    ctx.status = 422;
    ctx.body = {
      ...config.errors.invalid_params,
      errors: ctx.errors
    };
    return;
  }
  //todo 检测学校和城市 是否存在以及是否符合规范
  let educations = [];
  if (_educations) {
    educations = _educations;
  }
  if (educations && !Array.isArray(educations)) {
    logger.warn(ctx.errors);
    ctx.status = 422;
    ctx.body = {
      ...config.errors.invalid_params,
      errors: [{
        tags: 'educations must be array.'
      }]
    };
    return;
  }
  const item = {},
    nowTime = time(),
    account = _account.toString();
  if (type === 'tel') {
    try {
      var verification = await redisConn.get(config.redisPrefix.string.codeByTel + account);
    } catch (e) {
      logger.error(e);
      ctx.status = 500;
      ctx.body = {
        ...config.errors.internal_server_error,
        errors: [
          e
        ]
      };
      return;
    }
    if (verification != token) {
      ctx.status = 401;
      ctx.body = {
        ...config.errors.unauthorized,
        errors: [{
          token: "token is missing,invalid or expired"
        }]
      }
      return;
    } else {
      item.tel = account;
      var code = randomNumber(6);
      try {
        await redisConn.set(config.redisPrefix.string.codeByTel + account, code);
      } catch (e) {
        logger.error(e);
        ctx.status = 500;
        ctx.body = {
          ...config.errors.internal_server_error,
          errors: [
            e
          ]
        };
        return;
      }
    }
  } else if (type === 'wechat') {

  } else if (type === 'bearychat') {

    // pass

  } else if (type === 'device') {

    try {
      const accountMd5 = await md5Salt(account, type);
      var accountToken = await md5Salt(accountMd5, type);
    } catch (e) {
      logger.error(e);
      ctx.status = 500;
      ctx.body = {
        ...config.errors.internal_server_error,
        errors: [
          e
        ]
      };
      return;
    }
    if (token !== accountToken) {
      ctx.status = 401;
      ctx.body = {
        ...config.errors.unauthorized,
        errors: [{
          token: "token is missing,invalid or expired"
        }]
      }
      return;
    }

  } else {
    logger.warn(ctx.errors);
    ctx.status = 422;
    ctx.body = {
      ...config.errors.invalid_params,
      errors: [{
        tags: 'this login type is not support now'
      }]
    };
    return;
  }


  try {
    var r = await redisConn.exists(config.redisPrefix.string.userByAccount + account);
  } catch (e) {
    logger.error(e);
    ctx.status = 500;
    ctx.body = {
      ...config.errors.internal_server_error,
      errors: [
        e
      ]
    };
    return;

  }
  if (r === 1) {
    ctx.status = 409;
    ctx.body = {
      ...config.errors.conflict,
      errors: [
        "该账户已存在"
      ]
    };
    return;
  }
  const id = uuid.v4();
  try {
    item.verification = await md5Salt(token + id, nowTime);
  } catch (e) {
    logger.error(e);
    ctx.status = 500;
    ctx.body = {
      ...config.errors.internal_server_error,
      errors: [
        e
      ]
    };
    return;
  }
  item.id = id;
  item.avatar = avatar ? avatar : config.defaultParams.userAvatar;
  item.name = name ? name : config.defaultParams.userName;
  item.account = account;
  item.type = type;
  item.created = nowTime;
  item.updated = nowTime;
  if (educations.length > 0) {
    item.educations = JSON.stringify(educations);
  }
  if (city) {
    item.city = city;
  }

  if (device && !isObjectEmpty(device) && device.type && device.id) {
    const _device = {};
    _device[device.type] = [{
      id: device.id
    }];

    item.device = JSON.stringify(_device);

  } else if (device && !isObjectEmpty(device) && device.type && !device.id) {
    ctx.status = 422;
    ctx.body = {
      ...config.errors.invalid_params,
      errors: [{
        "device.id": "device must have proerty id"
      }]
    };
    return;
  }
  const promiseArr = [
    redisConn.hmset(config.redisPrefix.hash.userById + id, item),
    redisConn.set(config.redisPrefix.string.userByAccount + account, id),
    redisConn.lpush(config.redisPrefix.list.allUser, id),
    redisConn.lpush(config.redisPrefix.list.cityUserById + city, id)
  ];

  if (city) {
    promiseArr.push(redisConn.lpush(config.redisPrefix.list.cityUserById + city, id));
  }
  for (let i = 0; i < educations.length; i++) {
    if (educations[i].school) {
      promiseArr.push(redisConn.lpush(config.redisPrefix.list.schoolUserById + educations[i].school, id));
      if (educations[i].college) {
        promiseArr.push(redisConn.lpush(config.redisPrefix.common.user + config.redisPrefix.common.school + educations[i].school + educations[i].school + ":" + config.redisPrefix.common.college + educations[i].college, id));
      }
    }
  }

  try {
    await Promise.all(promiseArr);
  } catch (e) {
    logger.error(e);
    ctx.status = 500;
    ctx.body = {
      ...config.errors.internal_server_error,
      errors: [
        e
      ]
    };
    return;

  }

  ctx.status = 201;
  delete item.verification;
  if (code) {
    item.token = code;
  }
  ctx.body = item;

  postChannelForNewUser({
    educations: educations,
    city: city,
    userId: id
  })

};



users.getOneUser = async(ctx) => {

  const id = ctx.userId;
  if (ctx.errors) {
    logger.warn(ctx.errors);
    ctx.status = 422;
    ctx.body = {
      ...config.errors.invalid_params,
      errors: ctx.errors
    };
  } else {
    try {
      var result = await getOneUser(id);
    } catch (e) {
      logger.error(e)
      ctx.status = e.status;
      ctx.body = e.body;
      return;
    }
    ctx.body = result;
    return;
  }
};

users.getTimelines = async(ctx) => {
  const userId = ctx.userId;
  const start = ctx.checkQuery('start').optional().default(0).toInt().ge(0).value;
  const limit = ctx.checkQuery('limit').optional().default(config.defaultParams.listLength).toInt().gt(0).le(config.defaultParams.listMaxLength).value;
  if (ctx.errors) {
    logger.warn(ctx.errors);
    ctx.status = 422;
    ctx.body = {
      ...config.errors.invalid_params,
      errors: ctx.errors
    };
    return;
  }

  const stop = start + limit - 1;
  try {
    var user = await getOneUser(userId);
  } catch (e) {
    console.log(e);
    ctx.status = e.status;
    ctx.body = e.body;
    return;
  }
  try {
    var idsR = await redisConn.zrevrange(config.redisPrefix.sortedSet.userUnsubscribedChannelById + user.id, start, stop);
  } catch (e) {
    logger.error(e);
    ctx.status = 500;
    ctx.body = {
      ...config.errors.internal_server_error,
      errors: [
        e
      ]
    };
    return;

  }
  const ids = [],
    countIds = [];
  for (let i = 0; i < idsR.length; i++) {
    ids.push(config.redisPrefix.hash.channelById + idsR[i]);
    countIds.push(config.redisPrefix.sortedSet.channelFollowerByChannelId + idsR[i]);
  }
  try {
    var result = await mhgetall(redisConn, ids);
  } catch (e) {
    logger.error(e);
    ctx.status = 500;
    ctx.body = {
      ...config.errors.internal_server_error,
      errors: [
        e
      ]
    };
    return;

  }

  try {
    var followers_counts = await mzcount(redisConn, countIds);
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
  for (let i = 0; i < result.length; i++) {
    result[i].following = false;
    result[i].followers_count = followers_counts[i]
    if (result[i].allow_config === "0") {
      result[i].allow_config = false;
    } else {
      result[i].allow_config = true;
    }
  }
  ctx.body = {
    list: result
  }

}

users.getChannels = async(ctx) => {
  const userId = ctx.userId;
  const start = ctx.checkQuery('start').optional().default(0).toInt().ge(0).value;
  const limit = ctx.checkQuery('limit').optional().default(config.defaultParams.listLength).toInt().gt(0).le(config.defaultParams.listMaxLength).value;
  if (ctx.errors) {
    logger.warn(ctx.errors);
    ctx.status = 422;
    ctx.body = {
      ...config.errors.invalid_params,
      errors: ctx.errors
    };
    return;
  }
  const stop = start + limit - 1;
  try {
    var user = await getOneUser(userId);
  } catch (e) {
    ctx.status = e.status;
    ctx.body = e.body;
    return;
  }
  try {
    var idsR = await redisConn.zrevrange(config.redisPrefix.sortedSet.userFollowingByUserId + user.id, start, stop);
  } catch (e) {
    logger.error(e);
    ctx.status = 500;
    ctx.body = {
      ...config.errors.internal_server_error,
      errors: [
        e
      ]
    };
    return;

  }
  const ids = [],
    countIds = [];
  for (let i = 0; i < idsR.length; i++) {
    ids.push(config.redisPrefix.hash.channelById + idsR[i]);
    countIds.push(config.redisPrefix.sortedSet.channelFollowerByChannelId + idsR[i]);
  }
  try {
    var result = await mhgetall(redisConn, ids);
  } catch (e) {
    logger.error(e);
    ctx.status = 500;
    ctx.body = {
      ...config.errors.internal_server_error,
      errors: [
        e
      ]
    };
    return;

  }
  try {
    var followers_counts = await mzcount(redisConn, countIds);
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
  const subscriptionKeys = [];
  for (let i = 0; i < result.length; i++) {
    subscriptionKeys.push(config.redisPrefix.common.subscription + config.redisPrefix.common.channel + result[i].id + ":" + config.redisPrefix.common.user + user.id);
    result[i].following = true;
    result[i].followers_count = followers_counts[i]
    if (result[i].allow_config === "0") {
      result[i].allow_config = false;
    } else {
      result[i].allow_config = true;
    }
  }
  const allow_pushArr = await mhgetall(redisConn, subscriptionKeys);
  for (let i = 0; i < result.length; i++) {
    result[i].allow_push = (allow_pushArr[i].allow_push === '0' ? false : true)
  }
  ctx.body = {
    list: result
  }

}

users.getMessages = async(ctx) => {
  const userId = ctx.userId;
  const start = ctx.checkQuery('start').optional().default(0).toInt().ge(0).value;
  const limit = ctx.checkQuery('limit').optional().default(config.defaultParams.listLength).toInt().gt(0).le(config.defaultParams.listMaxLength).value;
  if (ctx.errors) {
    logger.warn(ctx.errors);
    ctx.status = 422;
    ctx.body = {
      ...config.errors.invalid_params,
      errors: ctx.errors
    };
    return;
  }
  const stop = start + limit - 1;
  try {
    var user = await getOneUser(userId);
  } catch (e) {
    ctx.status = e.status;
    ctx.body = e.body;
    return;
  }
  try {
    var idsR = await redisConn.lrange(config.redisPrefix.list.userMessagesById + user.id, start, stop);
  } catch (e) {
    logger.error(e);
    ctx.status = 500;
    ctx.body = {
      ...config.errors.internal_server_error,
      errors: [
        e
      ]
    };
    return;

  }
  const ids = [];
  for (let i = 0; i < idsR.length; i++) {
    ids.push(config.redisPrefix.string.messageById + idsR[i]);
  }
  try {
    var result = await mgetjson(redisConn, ids);
  } catch (e) {
    logger.error(e);
    ctx.status = 500;
    ctx.body = {
      ...config.errors.internal_server_error,
      errors: [
        e
      ]
    };
    return;
  }
  ctx.body = {
    list: result
  }
}

users.getOneUserId = function(ctx) {
  ctx.body = {
    id: ctx.userId
  };
}

export default users;
