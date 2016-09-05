"use strict";
var vkbot = require('../src/vkbot');
var http = require('http');

var token = '';

var bot = new vkbot(token, 'tuxbot');

bot.addBotCommand('test', 'A test command for a sample bot.', (message_origin, args) => {
  return 'Hello, cruel VK API world! \n*sad face*';
});

bot.addBotCommand('greeter', 'Greets peepz. \nUsage: samplebot greeter <name>', (message_origin, args) => {
  return 'yo ' + args[0] + ', appreciate ya!';
});

bot.addBotCommand('shit', 'Prints out a word in a fancy way.', (message_origin, args) => {
  var str = args[0].toUpperCase();
  var response = '';
  for (var i = 0; i < str.length; i++){
    response += (str[i] + ' ');
  }
  for (var i = 1; i < str.length; i++){
    response += ('\n' + str[i]);
  }
  return response;
});

bot.listen();

//http.createServer((req, resp) => {}).listen(process.env.PORT);
