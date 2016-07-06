import Koa from 'koa';
import config from '../listener-libs/config';
const app = new Koa();
import bodyParser from 'koa-bodyparser';
import koaRouter from 'koa-router';
const router  = koaRouter();
import path from 'path';
import fs from 'fs';
import log4js from 'koa-log4';
import schools from './controllers/schools';
import channels from './controllers/channels';
import users from './controllers/users';
import messages from './controllers/messages';
import bearychat from './controllers/bearychat';
import redisConn from '../listener-libs/redisConn';
import {auth,authScope} from '../listener-libs/auth';
log4js.configure({
  appenders: [
    { type: 'console' },
    { type: 'file', filename: 'logs/cheese.log', category: 'cheese' }
  ],
  replaceConsole: true
});
// app.use(log4js.koaLogger(log4js.getLogger("http"), { level: 'auto' }));
const logger = log4js.getLogger('app');
logger.setLevel('info');

import koaValidate from 'koa-validate';
 koaValidate(app);
app.use(async function (ctx, next) {
  const start = new Date();
  await next();
  const ms = new Date() - start;
  ctx.set('X-Response-Time', `${ms}ms`);
});


app.use(async function (ctx, next) {
  const start = new Date();
  await next();
  const ms = new Date() - start;
  logger.info(`${ctx.method} ${ctx.url} - ${ms}`);
});


app.use(bodyParser({
  onerror: function (err, ctx){
    logger.warn(err);
    ctx.status=422;
    ctx.body = {
      ...config.errors.invalid_params,
      errors:[
        {'body':'body parse error'}
      ]
    }
  }
}));

router.all('*',async function (ctx, next) {
  ctx.set ({
    "Access-Control-Allow-Origin":"*",
    "Access-Control-Allow-Headers":"Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With",
    "Access-Control-Allow-Methods":"POST,GET,HEAD,DELETE,PUT,PATCH"
  });
  await next();
});

router.get('/',auth,(ctx) => {
  // ctx.body =  config.redisPrefix;
  ctx.body = ctx.headers;
});
router.post('/schools',schools.postSchools);
router.get('/schools',schools.getSchools);
router.get('/schools/:id',schools.getOneSchool);
router.post('/channels',channels.postChannels);
router.get('/channels/:id',channels.getOneChannel);
router.get("/channels/:id/authorizations",channels.getOneChannelAuthorizations);
router.get('/channels/:id/messages',channels.getMessages);
router.post('/channels/:id/subscriptions',auth,channels.postSubscriptions);
router.del('/channels/:id/subscriptions',auth,channels.delSubscriptions);
router.post('/channels/:id/messages',channels.postMessages);
router.post('/users',users.postUsers);
router.get('/users',auth,users.getOneUser);
router.get('/user_id',auth,users.getOneUserId);
router.del('/sessions',auth,users.deleteSessions);
router.get('/timelines',auth,users.getTimelines);
router.get('/channels',auth,users.getChannels);
router.get('/messages',auth,users.getMessages);
router.get('/users/:id',authScope,users.getOneUser);
router.post('/users/:account/sessions',users.postSessions);
router.post('/tel/:tel/code',users.postCode);
router.del('/users/:account/sessions',authScope,users.deleteSessions);
router.get('/users/:id/timelines',authScope,users.getTimelines);
router.get('/users/:id/channels',authScope,users.getChannels);
router.get('/users/:id/messages',authScope,users.getMessages);
router.get('/messages/:id',messages.getOneMessage);
router.post('/bearychat',bearychat.receive);

app.use(router.routes())
.use(router.allowedMethods({
  throw:true
}));

app.use(async (ctx, next) => {
  ctx.status = 404;
  ctx.body = {
    ...config.errors.not_found,
    errors:[
      {'url':'url not found!'}
    ]
  }
});

app.listen(3000);
app.on('error',err => {
  logger.error(err);
});
logger.log('listening on port 3000');
