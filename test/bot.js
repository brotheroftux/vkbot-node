var vkbot = require('../src/vkbot');

var token = '';

bot = new vkbot(token);

bot.addBotCommand('test', 'A test command for a sample bot.', (origin, message_origin, isChat, args) => {
  return 'Hello, cruel VK API world! *sad face*';
});

bot.addBotCommand('greeter', 'Greets peepz. \nUsage: samplebot greeter <name>', (origin, message_origin, isChat, args) => {
  return 'yo ' + args[0] + ', appreciate ya!';
});

bot.listen();
