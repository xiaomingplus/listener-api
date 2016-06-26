# listener-api
监听者api


项目还未完成，只完成了基本的api接口.

## todolist

排名分先后：
- 用户登录,授权机制，个人信息
- 第三方登录，注册，授权机制，第三方信息
- 搜索功能
- 消息点赞功能

运行的话，请确保redis已运行.然后可以:

    git clone https://github.com/xiaomingplus/listener-libs.git
    git clone https://github.com/xiaomingplus/listener-api.git

    cd listener-libs
    cp config.example.js config.js
    cd ../listener-api
    npm i
    node index.js

Now ,it maybe works. You can visit [http://localhost:3000](http://localhost:3000)
