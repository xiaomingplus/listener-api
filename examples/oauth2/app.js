import Koa from 'koa';
const app = new Koa();
import bodyParser from 'koa-bodyparser';
import koaRouter from 'koa-router';
import axios from 'axios';
import session from "koa-session2";
app.use(session({
    key: "SESSIONID",   //default "koa:sess"
}));
const router = koaRouter();
app.use(bodyParser({
  onerror: function(err, ctx) {
    logger.warn(err);
    ctx.status = 422;
    ctx.body = {
      ...config.errors.invalid_params,
      errors: [{
        'body': 'body parse error'
      }]
    }
  }
}));
const listenerOauth2Url = 'http://oauth2.jiantingzhe.com/';
const listenerApiUrl = 'http://api.jiantingzhe.com/';
const appUrl = 'http://example.jiantingzhe.com/';
const listenerOauth2AuthorizeUrl = 'http://static.jiantingzhe.com/';

router.get('/callback', async(ctx) => {
  if (ctx.query.code) {
    console.log(ctx.query);
    try {
      var authR = await axios.post(`${listenerOauth2Url}oauth2/access_token`, {
        channel_id: "test3",
        token: "b837dabeda255f3d1391340d4dd7a50f3883c7e8503862cbf221b24206991b4b",
        code: ctx.query.code
      });
    } catch (e) {
      console.log(e);
      ctx.body = e.data;
      return;
    }
    console.log(authR.data);
    var userIdUrl = appUrl+"user_id?access_token=" + authR.data.access_token;
    ctx.session.access_token = authR.data.access_token;
    ctx.session.user_id = authR.data.user_id;
    if(ctx.query.back_url){
      ctx.redirect(ctx.query.back_url);
      return;
    }

        ctx.body = `
    <p>获取到的auth信息:</p>
    <p>access_token:${authR.data.access_token}</p>
    <p>user_id:${authR.data.user_id}</p>
    <p>scope:${authR.data.scope}</p>
    <p>expire_at:${authR.data.expire_at}</p>
    <p>获取access_token成功,下面是用access_token来请求user_id接口的示例方法</p>
    <a href="${userIdUrl}">${userIdUrl}</a>
    `;
  } else {
    ctx.body = "缺少code参数";
  }

});
router.get('/user_id', async(ctx) => {
  if (ctx.query.access_token) {
    try {
      var authR = await axios(`${listenerApiUrl}user_id`, {
        method: "get",
        headers: {
          "Content-Type": 'application/json',
          "access_token": ctx.query.access_token
        }
      });
    } catch (e) {
      console.log(e.data);
      ctx.body = e.data;
      return;
    }
    console.log(authR.data);
    ctx.body = authR.data;
  } else {
    ctx.body = "缺少id参数";
  }
});

router.get('/listener_setting',async (ctx) =>{
  console.log(ctx.session);
  if(ctx.session.user_id){
    ctx.body = 'setting'
  }else{
    ctx.redirect('/listener/auth?back_url='+encodeURIComponent(`${appUrl}listener_setting`));
  }
});

router.get('/listener/auth', (ctx) =>{
  let _redirect = appUrl+"callback";
  if(ctx.query.back_url){
    _redirect +="?back_url="+ctx.query.back_url;
  }
  let redirect_uri = encodeURIComponent(_redirect);
  let url = `${listenerOauth2AuthorizeUrl}authorize.html?channel_id=59a3a9a6-029c-44c0-8ea0-6c33d5624f29&redirect_uri=${redirect_uri}&scope=user_id_read&response_type=code`;
  ctx.redirect(url);
});
app.use(router.routes())
  .use(router.allowedMethods({
    throw: true
  }));


app.listen(3002);
app.on('error', err => {
  console.error(err);
});
console.log('3002');
