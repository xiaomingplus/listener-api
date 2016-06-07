const Koa = require('koa');
const config = require('./config');
const app = new Koa();
const bodyParser = require('koa-bodyparser');
const router = require('koa-router')();
const path = require('path');
const fs = require('fs');
const log4js = require('koa-log4');
const schools = require('./controllers/schools');
const channels = require('./controllers/channels');
const users = require('./controllers/users');
const messages = require('./controllers/messages');
const bearychat = require('./controllers/bearychat');
const redisConn = require('./utils/redisConn');
log4js.configure({
  appenders: [
    { type: 'console' },
    { type: 'file', filename: 'logs/cheese.log', category: 'cheese' }
  ],
  replaceConsole: true
});
app.use(log4js.koaLogger(log4js.getLogger("http"), { level: 'auto' }));
const logger = log4js.getLogger('app');
logger.setLevel('info');

require('koa-validate')(app);


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

// router.all('*',async function (ctx, next) {
//
//   await next();
// });

router.get('/', (ctx ,next) => {
  ctx.body =  config.redisPrefix;
});
router.post('/schools',schools.postSchools);
router.get('/schools',schools.getSchools);
router.get('/schools/:id',schools.getOneSchool);
router.post('/channels',channels.postChannels);
router.get('/channels/:id',channels.getOneChannel);
router.get('/channels/:id/messages',channels.getMessages);
router.post('/channels/:id/following',channels.postFollowing);
router.post('/channels/:id/messages',channels.postMessages);
router.post('/users',users.postUsers);
router.get('/users/:id',users.getOneUser);
router.get('/users/:id/timeline',users.getUnsubscriptions);
router.get('/users/:id/channels',users.getFollowings);
router.get('/users/:id/messages',users.getMessages);
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
