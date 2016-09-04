var vkbot = (() => {

  var BotCommand = require('./classes/BotCommand');
  var request = require('request');
  var querystring = require('querystring');

  function parseMessages(token, bot_prefix, callback, that) {
    request('https://api.vk.com/method/messages.get?' + querystring.stringify({count: 20, time_offset: 1, v: '5.53', access_token: token}), (err, resp, body) => {
      if (!err) {
        var messages = JSON.parse(body).response.items;
        messages.forEach((message) => {
          if ((new RegExp('^' + bot_prefix)).test(message.body)) { console.log("Captured a message for bot."); callback.call(that, message); }
        });
      }
    });
    setTimeout(parseMessages, 1003, token, bot_prefix, callback, that);
  }

  class VkBotAPI {

    constructor(token, bot_prefix = 'samplebot') {
      if (typeof token === 'undefined') throw new Error('No access token specified.');
      this.token = token;
      this.bot_prefix = bot_prefix;
      this.commands = {};
    }

    addBotCommand(command_name, usage, callback) {
      if (typeof command_name === 'string' && typeof callback === 'function')
        this.commands[command_name] = new BotCommand(usage, callback);
      else throw new Error('Invalid parameters for addBotCommand(name, desc, callback)');
    }

    listen() {
      parseMessages(this.token, this.bot_prefix, this.route, this);
    }

    route(incmessage) {
      var origin = (incmessage.hasOwnProperty('chat_id')) ? incmessage.chat_id : incmessage.user_id,
          message_origin = incmessage.user_id;
      var isChat = (incmessage.hasOwnProperty('chat_id')) ? true : false;
      var args = incmessage.body.split(' ');
      var name = args[1];
      args.splice(0,2);
      try {
        var sendBack = this.commands[name].callback.call(null, origin, message_origin, isChat, args);
        console.log('Routing ' + name + '...')
      } catch (err) {
        return console.warn('No route for ' + name);
      }
      request('https://api.vk.com/method/messages.send?' + querystring.stringify({
        message: sendBack,
        peer_id: (isChat) ? Number(origin) + 2000000000 : origin,
        forward_messages: incmessage.id,
        v: '5.53',
        access_token: this.token}),
        (err, resp, body) => {
          console.log(resp.body);
      });
    }

  }

  return VkBotAPI;

})();

module.exports = vkbot;
