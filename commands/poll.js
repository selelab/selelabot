const Discord = require('discord.js');

module.exports = {
    name: 'poll',
    description: '投票を作成するよ',
    async execute(message, args) {
        const emojis = ['🇦', '🇧', '🇨', '🇩', '🇪', '🇫', '🇬', '🇭', '🇮', '🇯'];
        const [title, ...choices] = args;

        if (!title) {
            return message.channel.send('この投票について説明を書き込んでください');
        }
        if (choices.length < 2 || choices.length > emojis.length) {
            return message.channel.send(`投票の選択肢を2個以上${emojis.length}個以下で指定してください`);
        }

        const poll = await message.channel.send({
            embed: {
                title: title,
                description: choices.map((c, i) => `${emojis[i]} ${c}`).join('\n')
            }
        });
        emojis.slice(0, choices.length).forEach(emoji => poll.react(emoji));
    },
};