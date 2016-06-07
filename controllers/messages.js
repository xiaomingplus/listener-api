const redisConn = require('../utils/redisConn');
const redis = require('../utils/redis.js');
const config = require('../config');
const date = require('../utils/date');
const common = require('../utils/common');
const uuid = require('node-uuid');
const logger = require('koa-log4').getLogger('Messages');
const timeline = require('../libs/timeline');
const push = require('../libs/push');
const messages = {

};


messages.getOneMessage = async (ctx) => {

};

messages.getMessages = async (ctx)=>{

}



module.exports = messages;
