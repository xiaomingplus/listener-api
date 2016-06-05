const logger = require('koa-log4').getLogger('Bearychat-controllers');

module.exports = {
  receiveSubscription:async (ctx)=>{
    const text = ctx.checkBody('text').notEmpty().value;
    ctx.body = ctx.request.body;
  }
}
