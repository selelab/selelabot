const { MessageEmbed } = require('discord.js');
const log4js = require('log4js');
const path = require('path');

log4js.configure(path.join(__dirname, "../setting/log4js.config.json")); //log4jsの設定の読み込み
const logger = log4js.getLogger();
const server_setting = require('../setting/selelab.json'); //各サーバ固有の設定の読み込み

const sleep = async (seconds) => new Promise((resolve, reject) => { setTimeout(() => { resolve(); }, seconds * 1000); });

const question_no1 = async (welcomeChannel, member) => {
    try {
        welcomeChannel.send(`Q1. ${member}さん、あなたは本サークルへの入会願を既に提出していますか？
        提出しているなら「はい」、提出していないなら「いいえ」と、ここに投稿して下さい！`);

        const msgFilter_Q1 = msg => (msg.author.id === member.id && msg.content.match(/^(はい|いいえ)$/g));
        //「新しく参加したメンバーの投稿である」かつ「"はい"または"いいえ"のみの投稿である」 => 条件に合致
        
        const collected_message_Q1 = await welcomeChannel.awaitMessages({ filter: msgFilter_Q1, max: 1, time: 5 * 60 * 1000 });
        // Promiseを解決すると、収集できたメッセージのCollectionを得られる

        if (!collected_message_Q1.size) {//何も収集できなかった場合を弾く(sizeは取得できた個数、つまりこれは0のときを弾く)
            throw new Error('[autorole] Q1の回答が送信されませんでした(タイムアウト)');
        }

        const answer_Q1 = collected_message_Q1.first().content;
        logger.info('[guildMemberAdd] 送信された回答: ' + answer_Q1); //first()で取得できたメッセージを取得してログに出す
        if (answer_Q1 == 'はい') {
            const temp_role = member.guild.roles.cache.find(role => role.name === '臨時会員');
            member.roles.add(temp_role); //臨時会員ならば参加メンバーに追加
        }
    } catch (e) {
        logger.fatal(e);
        welcomeChannel.send("Q1の処理中にエラーが発生しました。サーバ管理者に連絡して下さい:" + e.message);
    }
};

const question_no2 = async (welcomeChannel, member) => {
    welcomeChannel.send(`Q2. ${member}さん、あなたは何年生ですか？
    次の選択肢の中からあなたの現在の学年に対応する番号を選び、その番号を__**半角数字1個だけで**__ここに投稿して下さい！`);
    const gradeEmbed = new MessageEmbed()
        .setColor('#0099ff')
        .setTitle('あなたの現在の学年に対応する番号を投稿して下さい')
        .setDescription('入力するのは半角数字一個だけです。日本語や記号などは入力しないで下さい')
        .addFields(
            { name: `${server_setting.GRADE.FIRST}なら`, value: '1 と入力'},
            { name: `${server_setting.GRADE.SECOND}なら`, value: '2 と入力' },
            { name: `${server_setting.GRADE.THIRD}なら`, value: '3 と入力' },
            { name: `${server_setting.GRADE.FOURTH}なら`, value: '4 と入力' },
            { name: `${server_setting.GRADE.GRADUATED}なら`, value: '5 と入力' },
        );
    welcomeChannel.send({embeds: [gradeEmbed]});

    const msgFilter_Q2 = msg => {
        return (msg.author.id === member.id && msg.content.match(/^[12345]$/)) ? true : false;
        //「新しく参加したメンバーの投稿である」かつ「1から5までの半角数字のどれか一つだけを含む」 => 条件に合致
    };
    const collected_message_Q2 = await welcomeChannel.awaitMessages({ filter: msgFilter_Q2, max: 1, time: 5 * 60 * 1000 });

    let grade_number, grade_info, grade_role_name;
    try {
        if (!collected_message_Q2.size) {
            throw new Error('[autorole] メッセージが送信されませんでした(タイムアウト)');
        }

        const answer_Q2 = collected_message_Q2.first().content;
        logger.info('[guildMemberAdd] 送信された番号: ' + answer_Q2);

        grade_number = Number(answer_Q2); //入力番号取得
        grade_info = server_setting.ROLE.find(data => data.NUM == grade_number); //学年取得
        grade_role_name = member.guild.roles.cache.find(role => role.name == grade_info.GRADE); //役職名取得

        member.roles.add(grade_role_name); //対応する学年役職を参加メンバーに追加
    } catch (e) {
        logger.fatal(e);
        welcomeChannel.send("Q2の処理中にエラーが発生しました。サーバ管理者に連絡して下さい" + e.message);
    }

    return grade_info;
};

const finish_process = async (welcomeChannel, member, client, guild_id, grade_info) => {
    try {
        /* 別のチャンネルで新規参加者のことをお知らせする */
        const infoChannel = client.guilds.cache.get(guild_id).channels.cache.find(channel => channel.name === server_setting.CHANNEL.INFO);
        if (!infoChannel) {
            throw Error("[guildMemberAdd] 新規参加者をお知らせするチャンネルが見つかりませんでした");
        }
        infoChannel.send(`${member}さん、上智エレラボへようこそ！あなたを${grade_info.GRADE}として登録しました。\n#自己紹介 チャンネルで自己紹介の書き込みをしてくださいね`);
        welcomeChannel.send(`質問は以上です。ありがとうございました。#自己紹介 チャンネルへの書き込みもよろしくお願いします！`);
    } catch (e) {
        logger.fatal(e);
        welcomeChannel.send("終了プロセス中にエラーが発生しました。サーバ管理者に連絡して下さい" + e.message);
    }

};

module.exports = {
    async execute(client, member, guild_id) {
        logger.info(`[guildMemberAdd] ${member.displayName}さんがサーバ"${member.guild.name}"に参加しました`);
        logger.info(`[guildMemberAdd] 役職自動付与プロトコル_開始：${member.guild.name}`);

        if (member.user.bot) {
            return logger.fatal("[guildMemberAdd] 当該ユーザはbotです");
        }

        /* チャンネル名の完全一致で特定のチャンネルを指定し、そこで役職付与プロトコルを開始 */
        const welcomeChannel = client.guilds.cache.get(guild_id).channels.cache.find(channel => channel.name === server_setting.CHANNEL.WELCOME);
        if (!welcomeChannel) {
            return logger.fatal("[guildMemberAdd] 該当するチャンネルが見つかりませんでした");
        }

        /* メンションを飛ばす */
        welcomeChannel.send(`${member}さん、${member.guild.name}へようこそ！\nチャット上であなたが誰なのか識別できるようにするため、最初にあなたの学年を登録する必要があります。\n必ず以下の質問に答えて下さい！`);

        await sleep(2);

        /* Q1. 開始 */
        await question_no1(welcomeChannel, member);

        await sleep(2);

        /* Q2. 開始 */
        const grade_info = await question_no2(welcomeChannel, member);

        await sleep(2);

        await finish_process(welcomeChannel, member, client, guild_id, grade_info);

        logger.info("[guildMemberAdd] 役職自動付与プロトコル：終了");
    }
};