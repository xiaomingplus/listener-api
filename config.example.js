module.exports = {
  defaultParams:{
    listLength:15,
    listMaxLength:50
  },
  localApiUrl:"http://127.0.0.1:3000",
  remoteApiUrl:"http://api.jiantingzhe.com",
  redisConfig:{
    port: 6379,          // Redis port
    host: '127.0.0.1',   // Redis host
    family: 4,           // 4 (IPv4) or 6 (IPv6)
    // password: 'auth',
    db: 0
  },
  mysqlConfig:{
    'host':"localhost",
    'user':"root",
    "port":3306,
    "password":"123456",
    "database":"secret"
  },
  redisPrefix:{
    common:{
      channel:"channel:",
      user:"user:",
      school:"school:",
      city:"city:",
      college:"college:",
      subscription:"subscription:"
    },
    string:{
      messageById:"message:id:",

      schoolByName:"school:name:",

      channelByAlias:"channel:alias:",

      userByAccount:"user:account:"
    },
    hash:{
      schoolById:"school:id:",

      channelById:"channel:id:",

      userById:"user:id:"

    },
    set:{

    },
    sortedSet:{

      userFollowingByUserId:"following:user:",
      channelFollowerByChannelId:"follower:channel:",
      userUnreadMessageByUserId:"message:unread:user:",
      userReadMessageByUserId:"message:read:user:",
      userUnsubscribedChannelById:"unsubscribed.channel:user:",
      userSubscribedChannelById:"subscribed.channel:user:",
    },
    list:{
      allChannel:"channel:all",
      commonChannel:"channel:common",
      cityChannelById:"channel:city:",
      schoolChannelById:"channel:school:",

      allUser:"user:all",
      cityUserById:"user:city:",
      schoolUserById:"user:school:",

      userMessagesById:"message:user:",
      channelMessagesById:"message:channel:",

      channelPushById:"push:channel:"
    }
  },
  bearychat:{
    incoming:{
      url:"https://hook.bearychat.com/=bw8fe/incoming/0249756f9b5d2df8429845794486acf0"
    },
    appTestChannel:"监听者",

  },

  errors:{
    invalid_params:{
      id:'invalid_params',
      message:'参数验证不通过',
      url:""
    },
    internal_server_error:{
      id:'internal_server_error',
      message:"内部服务错误",
      url:""
    },
    conflict:{
      id: "conflict",
      message:"该资源已存在",
      url:""
    },
    not_found:{
      id:"not_found",
      message:"没有找到资源",
      url:""
    }
  }
}
