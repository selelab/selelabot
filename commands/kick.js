module.exports = {
    name: 'kick',
    description: 'a mention test',
    execute(message, args) {
        if (!message.mentions.users.size) {
            return message.reply('Kickしたい人を指定してください');
        }
        const taggedUser = message.mentions.users.first();
        message.channel.send(`あなたは ${taggedUser.username} をKickしたいみたいですね`);
    },
};