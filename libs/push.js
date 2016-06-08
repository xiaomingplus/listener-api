const pushUtils = require("../utils/push");
const redisConn = require('../utils/redisConn');
const config = require('../config');
const logger = require('koa-log4').getLogger('Push');
const common = require('../utils/common');
module.exports = {
  channelFollowers: async({
    channelId = "",
    messageId = ""
  } = {}) => {
    return new Promise(async(s, f) => {
      if (!channelId) {
        f('options type is required!');
        return;
      }
      if (!messageId) {
        f('options channelId is required!');
        return;
      }

    });
  },
  user: async({
    messageId = "",
    userId = ""
  } = {}) => {
    return new Promise(async(s, f) => {
      if (!userId) {
        f('options userId is required!');
        return;
      }
      if (!messageId) {
        f('options messageId is required!');
        return;
      }
      try {
        const _message = await redisConn.get(config.redisPrefix.string.messageById + messageId);
        var message = JSON.parse(_message);
      } catch (e) {
        f(e);
        return;
      }
      let text = "";
      if (message.type && message.type === 'link') {
        text = `${message.text}
${message.link_url}`;
      } else {
        text = `${message.text}`
      }
      const name = message.channel.name;

      try {
        var _device = await redisConn.hget(config.redisPrefix.hash.userById + userId, "device");
      } catch (e) {
        f(e);
        return;
      }

      if (_device === null) {
        s(0);
        return;
      } else {
        try {
          var device = JSON.parse(_device);
        } catch (e) {
          f(e);
          return;
        }
        if (device.ios) {
          //todo
        }
        if (device.android) {
          //todo
        }
        if (device.bearychat) {
          for (let i = 0; i < device.bearychat.length; i++) {
            pushUtils.bearychat({
              id: device.bearychat[i].id,
              text: name + ":" + text,
            });
          }
        }


      }

    });
  },

  channel: async({
    messageId = "",
    channelId = ""
  } = {}) => {
    return new Promise(async(s, f) => {
      if (!channelId) {
        f('options channelId is required!');
        return;
      }
      if (!messageId) {
        f('options messageId is required!');
        return;
      }
      try {
        const _message = await redisConn.get(config.redisPrefix.string.messageById + messageId);
        var message = JSON.parse(_message);
      } catch (e) {
        f(e);
        return;
      }
      let text = "";
      if (message.type && message.type === 'link') {
        text = `${message.text}
${message.link_url}`;
      } else {
        text = `${message.text}`
      }
      const name = message.channel.name;

      try {
        var ids = await redisConn.smembers(config.redisPrefix.set.channelPushById + channelId);
      } catch (e) {
        f(e);
        return;
      }
      const promiseArr = [];
      for (let i = 0; i < ids.length; i++) {
        logger.info(ids[i])
        promiseArr.push(redisConn.hget(config.redisPrefix.hash.userById + ids[i], "device"));
      }

      try {
        var deviceList = await Promise.all(promiseArr);
      } catch (e) {
        f(e);
        return;
      }
      let device = {};
      for (let i = 0; i < deviceList.length; i++) {
        if (deviceList[i]) {
          try {
            device = JSON.parse(deviceList[i]);
          } catch (e) {
            f(e);
            return;
          }

        if (device.ios) {
          //todo
        }
        if (device.android) {
          //todo
        }
        if (device.bearychat) {
          for (let j = 0; j< device.bearychat.length; j++) {
            pushUtils.bearychat({
              id: device.bearychat[j].id,
              text: name + ":" + text,
            });
          }
        }
}
      }
    });
  }
}
