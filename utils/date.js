const date = {
  time:()=>{
    return parseInt(new Date().getTime()/1000)
  }
}

module.exports = date;
