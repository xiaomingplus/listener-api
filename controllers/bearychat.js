const logger = require('koa-log4').getLogger('Bearychat-controllers');
const axios = require('axios');
const config = require('../config');
const userLib = require('../libs/user');
module.exports = {
  receive: async(ctx) => {
    logger.info(ctx.request.body);
    const bearychatChannelName = ctx.checkBody('channel_name').notEmpty().value;
    const bearychatUserName = ctx.checkBody('user_name').notEmpty().value;
    const text = ctx.checkBody('text').notEmpty().value;
    const triggerWord = ctx.checkBody('trigger_word').notEmpty().value;
    if (ctx.errors) {
      logger.warn(ctx.errors);
      ctx.status = 422;
      ctx.body = {
        text: JSON.stringify(ctx.errors)
      };
      return;
    }
    const account = bearychatChannelName + "_" + bearychatUserName;
    logger.info(account)
    let user;
    try {
      user = await userLib.getOneUser(account);
      console.info(user);
    } catch (e) {
      if (e.status === 404) {
        try {
          var userR = await axios({
            method: "post",
            url: config.localApiUrl + "/users",
            data: {
              "name": bearychatUserName,
              "account": account,
              "token": 123456,
              "city": "成都",
              "avatar": "http://www.vshouce.com/wp-content/uploads/2014/09/7545550978.jpg",
              "type": "bearychat",
              "device": {
                "type": "bearychat",
                "id": bearychatUserName
              }
            }
          });

        } catch (ee) {
          if (ee instanceof Error) {
            logger.error('Error', ee.message);

            ctx.body = {
              text: JSON.stringify(ee.message)
            }
          } else {
            ctx.body = {
              text: JSON.stringify(ee.data.errors)
            }
          }
          return;


        }
        user = userR.data;
      } else {
        logger.error(e);
        ctx.body = {
          text: e.body
        }
        return;
      }
    }
    if (triggerWord === '订阅') {

      const channelId = text.substr(2).trim();
      try {
        var subscriptionResult = await axios({
          url: config.localApiUrl + "/channels/"+channelId+"/following",
          method: "post",
          data: {
            user_id: user.id
          }
        });
      } catch (e) {

        if (e instanceof Error) {
          logger.error('Error', e.message);

          ctx.body = {
            text: JSON.stringify(e.message)
          }
        } else {
          ctx.body = {
            text: JSON.stringify(e.data.errors)
          }
        }
        return;
      }

      ctx.body = {
        text: "已成功订阅该主题！"
      };
    } else if (triggerWord === '主题') {
      try {
        var {
          data
        } = await axios({
          url: config.localApiUrl + "/users/" + user.id + "/timeline",
        });
      } catch (e) {
        if (e instanceof Error) {
          logger.error('Error', e.message);
          ctx.body = {
            text: JSON.stringify(e.message)
          }
        } else {
          ctx.body = {
            text: JSON.stringify(e.data.errors)
          }
        }
        return;
      }
      const channelList = data.channels;
      let text = "你可能感兴趣的主题有：\n";
      if(channelList.length===0){
        text = "当前还没有主题";
      }

      for(let i = 0;i<channelList.length;i++){
        text += i+"."+channelList[i].name+"("+channelList[i].alias+")\n";
      }

      ctx.body = {
        text: text
      }

      return;


    } else if (triggerWord === '我') {
      try {
        var {
          data
        } = await axios({
          url: config.localApiUrl + "/users/" + user.id + "/channels",
        });
      } catch (e) {
        if (e instanceof Error) {
          logger.error('Error', e.message);
          ctx.body = {
            text: JSON.stringify(e.message)
          }
        } else {
          ctx.body = {
            text: JSON.stringify(e.data.errors)
          }
        }
        return;
      }

      const channelList = data.channels;
      let text = "你已订阅的主题有：\n";
      if(channelList.length===0){
        text = "你当前还没有订阅主题";
      }
      for(let i = 0;i<channelList.length;i++){
        text += i+"."+channelList[i].name+"("+channelList[i].alias+")\n";
      }
      ctx.body = {
        text: text
      }

      return;
    } else if(triggerWord === '消息'){
      try {
        var {
          data
        } = await axios({
          url: config.localApiUrl + "/users/" + user.id + "/messages",
        });
      } catch (e) {
        if (e instanceof Error) {
          logger.error('Error', e.message);
          ctx.body = {
            text: JSON.stringify(e.message)
          }
        } else {
          ctx.body = {
            text: JSON.stringify(e.data.errors)
          }
        }
        return;
      }
      const messageList = data.messages;
      let text = "你的消息列表\n";
      if(messageList.length===0){
        text = '目前还没有收到消息';
      }
      for(let i = 0;i<messageList.length;i++){
        text += i+"."+messageList[i].channel.name+":"+messageList[i].text+"\n";
      }


      ctx.body = {
        text: text
      }

      return;
    } else {
      ctx.body = "";
      return;
    }
  },
  receiveSignup: async(ctx) => {

  }
}
