var BotCommand = (() => {

  class BotCommand {

    constructor(usage, callback) {
      this.usage = usage;
      this.callback = callback;
      //this.argcount = argcount;
    }

  }

  return BotCommand;

})();

module.exports = BotCommand;
