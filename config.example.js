module.exports = {
  defaultParams:{
    listLength:15,
    listMaxLength:50
  },
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

      userByTel:"user:tel:"
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
      userReadMessageByUserId:"message:read:user:"

    },
    list:{
      commonChannel:"channel:common",
      cityChannelById:"channel:city:",
      schoolChannelById:"channel:school:",
      userUnsubscribedChannelById:"unsubscribed.channel:user:",
      userSubscribedChannelById:"subscribed.channel:user:",

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
      url:"https://hook.bearychat.com/xxxxx" //yours incoming bot url
    },
    appTestChannel:"xxx",//yours bearychat channel name

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
