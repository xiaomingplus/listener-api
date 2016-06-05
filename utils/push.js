const bearychat = require('./bearychat');

module.exports = {
  bearychat: async({
    id = "",
    title = "",
    text = ""
  } = {}) => {
    return bearychat.incoming({
      text: title + text + "\n to:" + id
    })

  }
}
