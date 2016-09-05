"use strict";
var vkbot = (() => {

  var BotCommand = require('./Classes/BotCommand');
  var request = require('request');
  var querystring = require('querystring');

  /**
   * Main message parsing routine.
   * @param  {String}   token          VK API access token
   * @param  {String}   bot_prefix     Bot name/prefix, used to identify messages for the bot
   * @param  {Function} callback       Routing callback function
   * @param  {Object}   that           Context in which callback should be invoked
   * @param  {Object}   longpollparams 'ts' and 'pts' parameters for VK LongPoll API.
   * @return {undefined}
   */
  function parseMessages(token, bot_prefix, callback, that, longpollparams) {
    request('https://api.vk.com/method/messages.getLongPollHistory?' + querystring.stringify({
      ts: longpollparams.ts,
      pts: longpollparams.pts,
      fields: 'display_name',
      v: '5.53',
      access_token: token
    }), (err, response, body) => {
      // handle connection errors
      if (err)
        throw new Error('Couldn\'t fetch a response from VK API. Aborting.');
      // handle VK API errors
      var messages = JSON.parse(body);
      if (messages.hasOwnProperty('error')) {
        if (messages.error.error_code == 10) {
          // handle 'ts' renewal
          renewLongPollData(token, (longpollparams) => {
            setTimeout(() => {
              // 'that' should be referenced fine
              parseMessages(token, bot_prefix, callback, that, longpollparams);
            }, 1500);
          });
        } else {
          // just print out the error code and message
          return console.warn('VK API returned an error while trying to fetch messages. Error:\n' +
            messages.error.error_code + ": " + messages.error.error_msg);
        }
      }
      // done parsing errors, let's parse dem messages
      // but first we need to save the new_pts parameter we received with an API response
      var new_pts = messages.response.new_pts;
      messages = messages.response.messages.items;
      // nothing holds us back, we can use forEach method of the messages array
      messages.forEach((message) => {
        if ((new RegExp('^' + bot_prefix)).test(message.body)) {
          console.log('\nA message for the bot received, invoking router callback...');
          callback.call(that, message); // that's it!
        };
      });
      setTimeout(() => {
        parseMessages(token, bot_prefix, callback, that, {
          ts: longpollparams.ts,
          pts: new_pts,
        });
      }, 1500); // we check for new messages every 1.5 seconds
    });
  }

  /**
   * A method used to renew 'ts' and 'pts' parameters of the VK LongPoll API.
   * @param  {String}   token    VK API access token
   * @param  {Function} callback A callback where an Object with new ts and pts will be passed
   * @param  {Object}   that     Context in which callback should be invoked
   * @return {undefined}
   */
  function renewLongPollData(token, callback, that) {
    request('https://api.vk.com/method/messages.getLongPollServer?' + querystring.stringify({
      need_pts: 1,
      v: '5.53',
      access_token: token
    }), (err, response, body) => {
      if (err) // handle connection errors
        throw new Error('An error occured while trying to fetch LongPoll data. Aborting.');
      var parsed_response = JSON.parse(body);
      if (parsed_response.hasOwnProperty('error')) // handle VK API errors
        return console.warn('VK API returned an error while trying to fetch messages. Error:\n' +
          parsed_response.error.error_code + ": " + parsed_response.error.error_msg);
      // pass an object containing new 'ts' and 'pts' to the callback
      callback.call(that, {
        ts: parsed_response.response.ts,
        pts: parsed_response.response.pts,
      });
    });
  }

  class VkBotAPI {

    /**
     * The VkBotAPI class constructor
     * @param {String} token      VK API access token
     * @param {String} bot_prefix Bot name, i.e. a prefix. Messages starting with this prefix would be processed.
     */
    constructor(token, bot_prefix, router) {
      if (typeof token === 'undefined') throw new Error('No access token specified.');
      this.token = token;
      this.bot_prefix = bot_prefix;
      this.commands = {};
      if (typeof router === 'undefined'){
        this.router = this.route;
      } else {
        this.router = router;
      }
    }

    /**
     * Adds a new bot command for the default routing method
     * @param  {String}   command_name A name of the command
     * @param  {String}   usage        A brief description
     * @param  {Function} callback     A callback that would be invoked upon routing the command.
     * @return {undefined}
     */
    addBotCommand(command_name, usage, callback) {
      if (typeof command_name === 'string' && typeof callback === 'function')
        this.commands[command_name] = new BotCommand(usage, callback);
      else throw new Error('Invalid parameters for addBotCommand(name, desc, callback)');
    }

    /**
     * Initiates bot listen sequence.
     * @return {undefined}
     */
    listen() {
      // get latest 'ts' and 'pts' via messages.getLongPollServer
      renewLongPollData(this.token, this.startParsing, this);
    }

    /**
     * This method is used as a callback for renewLongPollData(token, callback, that).
     * @param  {Object} longpollparams An Object containing 'ts' and 'pts' values
     * @return {undefined}
     */
    startParsing(longpollparams) {
      // initiate the parsing routine
      parseMessages(this.token, this.bot_prefix, this.router,
        (this.router === this.route) ? this : null, longpollparams);
    }

    /**
     * The default router.
     * Implies that the second word in a captured message is a bot command and routes it to
     * a registered via addBotCommand(command_name, usage, callback) callback function.
     * @param {Object} incmessage The VK API message object
     * @return {undefined}
     */
    route(incmessage) {
      var origin = (incmessage.hasOwnProperty('chat_id')) ? incmessage.chat_id : incmessage.user_id,
          message_origin = incmessage.user_id;
      var isChat = (incmessage.hasOwnProperty('chat_id')) ? true : false;
      var args = incmessage.body.split(' ');
      var name = args[1];
      args.splice(0,2);
      if (typeof this.commands[name].callback === 'undefined') // if we don't have a route for the command
        return console.warn('No available route for \'' + name + '\', skipping.'); // WHY BOTHER, SEE YA
      try {
        // we expect some errors from the user callback but we don't want them to crash the whole app
        var sendBack = this.commands[name].callback.call(null, message_origin, args, (isChat) ? origin : null);
        console.log('Routing ' + name + '...');
      } catch (err) {
        // now we can just not send anything at all
        return console.warn('An error occured in the \'' + name + '\' command callback function. \n' + err);
      }
      if (!(typeof sendBack === 'undefined')){
        request('https://api.vk.com/method/messages.send?' + querystring.stringify({
          message: sendBack,
          peer_id: (isChat) ? Number(origin) + 2000000000 : origin,
          forward_messages: incmessage.id,
          v: '5.53',
          access_token: this.token}),
        (err, resp, body) => {
            if (err) // handle connection errors
              throw new Error('Couldn\'t fetch a response from VK API. Aborting.');
              var parsed_response = JSON.parse(body);
              if (parsed_response.hasOwnProperty('error')) // handle VK API errors
                return console.warn('VK API returned an error while trying to send a message. Error:\n' +
                  parsed_response.error.error_code + ": " + parsed_response.error.error_msg);
              console.log('Message sent in a response. Message ID is: ' + parsed_response.response);
        });
      }
    }

  }

  // export the class
  return VkBotAPI;

})();

module.exports = vkbot;
