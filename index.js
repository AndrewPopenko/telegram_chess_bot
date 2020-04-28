const TelegramBot = require('node-telegram-bot-api')
require('dotenv').config()
const token = process.env.TOKEN
const { Chess } = require('chess.js')

const bot = new TelegramBot(token, { polling: true })


// CONSTANTS & FUNCTIONS
const COMMANDS = require('./constants/commands')
const PARAMS = require('./constants/params')
const boardFunctions = require('./functions/board')
const movesFunctions = require('./functions/moves')
const utils = require('./functions/utils')

// STATE
let chessPlaying = false
let chessGame = {}


const finishGame = (game, chatId, botMove) => {
    chessPlaying = false
    if (game.in_checkmate()) {
        botMove ? bot.sendMessage(chatId, "Вы проиграли!") : bot.sendMessage(chatId, "Вы выиграли!")
    }
    if (game.in_draw()) {
        bot.sendMessage(chatId, "Ничья!")
    }
    if (game.in_stalemate()) {
        bot.sendMessage(chatId, "Пат!")
    }
    if (game.in_threefold_repetition()) {
        bot.sendMessage(chatId, "Повтор трех ходов")
    }
    bot.sendMessage(chatId, "Игра закончена. Еще?", {
        "reply_markup": {
            "keyboard": [
                ["Играем"]
            ]
        }
    })
}


bot.on('message', (msg) => {

    // NOT PLAYING & IN COMMANDS LIST
    if (!chessPlaying && Object.values(COMMANDS).indexOf(msg.text) !== -1) {

        if (msg.text === COMMANDS.BOT_START) {
            bot.sendMessage(msg.chat.id, "Шахматы?", {
                "reply_markup": {
                    "keyboard": [
                        ["Играем"]
                    ]
                }
            })
        }

        if (msg.text === COMMANDS.CHESS_START) {
            chessPlaying = true
            chessGame = new Chess()
            bot.sendMessage(msg.chat.id, "Ну-ка посмотрим", {
                "reply_markup": {
                    "keyboard": [
                        ["Закончить игру"]
                    ]
                }
            })
            bot.sendMessage(msg.chat.id, "Начинаем игру!")
            const boardImage = boardFunctions.drawImageCanvas(chessGame.board())
            bot.sendPhoto(msg.chat.id, boardImage)
        }

    }

    // CHESS COMMAND
    else if (chessPlaying && utils.isChessCommand(msg.text)) {

        const fenBeforeMove = chessGame.fen()
        chessGame.move(msg.text, {sloppy: true})
        const fenAfterMove = chessGame.fen()

        // IF USER MOVE IS POSSIBLE
        if (fenBeforeMove !== fenAfterMove) {

            // IF USER HAS FINISHED THE GAME
            if (chessGame.game_over()) {
                finishGame(chessGame, msg.chat.id, false)
                const boardImage = boardFunctions.drawImageCanvas(chessGame.board())
                bot.sendPhoto(msg.chat.id, boardImage)
            }
            else {
                const botMove = movesFunctions.minimaxRoot(PARAMS.depth, chessGame, true)
                chessGame.move(botMove, {sloppy: true})
                if (chessGame.in_check() && !chessGame.game_over()) {
                    bot.sendMessage(msg.chat.id, "Шах!")
                }
                // IF BOT HAS FINISHED THE GAME
                if (chessGame.game_over()) {
                    finishGame(chessGame, msg.chat.id, true)
                }
                const boardImage = boardFunctions.drawImageCanvas(chessGame.board())
                bot.sendPhoto(msg.chat.id, boardImage)
            }

        }
        // IF USER MOVE IS NOT POSSIBLE
        else {
            bot.sendMessage(msg.chat.id, "Такой ход невозможен!");
        }

    }

    // STOP PLAYING
    else if (chessPlaying && msg.text === COMMANDS.CHESS_STOP) {
        chessPlaying = false;
        finishGame(chessGame, msg.chat.id, null)
    }

    // NOT A COMMAND
    else {
        bot.sendMessage(msg.chat.id, "Что вы говорите?");
    }

})