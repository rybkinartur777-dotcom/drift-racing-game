import telebot
from telebot.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
import json
import os

# Токен бота
TOKEN = '8423948385:AAGZwJMCWpOvwEfWMLl3NPbIDWXOCzRE43I'

# Ссылка на игру
WEB_APP_URL = 'https://rybkinartur777-dotcom.github.io/drift-racing-game/tg-racing-game/'

# Файл для хранения рейтинга
SCORES_FILE = 'scores.json'

bot = telebot.TeleBot(TOKEN)

def load_scores():
    """Загрузить рейтинг из файла"""
    if os.path.exists(SCORES_FILE):
        with open(SCORES_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def save_scores(scores):
    """Сохранить рейтинг в файл"""
    with open(SCORES_FILE, 'w', encoding='utf-8') as f:
        json.dump(scores, f, ensure_ascii=False, indent=2)

def get_leaderboard(limit=10):
    """Получить топ игроков"""
    scores = load_scores()
    # Сортируем по очкам (от большего к меньшему)
    sorted_scores = sorted(scores.items(), key=lambda x: x[1]['score'], reverse=True)
    return sorted_scores[:limit]

@bot.message_handler(commands=['start'])
def send_welcome(message):
    markup = InlineKeyboardMarkup()
    markup.add(InlineKeyboardButton("🎮 Играть!", web_app=WebAppInfo(url=WEB_APP_URL)))
    markup.add(InlineKeyboardButton("🏆 Рейтинг", callback_data="show_rating"))
    
    text = (
        "🔥 Добро пожаловать в *NITROWAY*\n\n"
        "🚗 Аркадная гонка прямо в Telegram\n"
        "⚡ Используй нитро\n"
        "🔧 Улучшай авто\n"
        "🏆 Поднимайся в рейтинге\n\n"
        "Готов жать газ?"
    )
    
    bot.send_message(message.chat.id, text, parse_mode='Markdown', reply_markup=markup)

@bot.message_handler(commands=['rating', 'top', 'leaderboard'])
def show_rating(message):
    """Показать рейтинг игроков"""
    leaderboard = get_leaderboard(10)
    
    if not leaderboard:
        bot.send_message(message.chat.id, "🏆 Рейтинг пока пуст!\n\nБудь первым — сыграй в игру!")
        return
    
    text = "🏆 *ТОП-10 ИГРОКОВ*\n\n"
    
    medals = ["🥇", "🥈", "🥉"]
    
    for i, (user_id, data) in enumerate(leaderboard):
        medal = medals[i] if i < 3 else f"{i+1}."
        name = data.get('name', 'Игрок')
        score = data.get('score', 0)
        text += f"{medal} *{name}* — {score} очков\n"
    
    text += "\n_Играй и попади в топ!_"
    
    bot.send_message(message.chat.id, text, parse_mode='Markdown')

@bot.callback_query_handler(func=lambda call: call.data == "show_rating")
def callback_rating(call):
    """Обработчик кнопки рейтинга"""
    leaderboard = get_leaderboard(10)
    
    if not leaderboard:
        bot.answer_callback_query(call.id)
        bot.send_message(call.message.chat.id, "🏆 Рейтинг пока пуст!\n\nБудь первым — сыграй в игру!")
        return
    
    text = "🏆 *ТОП-10 ИГРОКОВ*\n\n"
    
    medals = ["🥇", "🥈", "🥉"]
    
    for i, (user_id, data) in enumerate(leaderboard):
        medal = medals[i] if i < 3 else f"{i+1}."
        name = data.get('name', 'Игрок')
        score = data.get('score', 0)
        text += f"{medal} *{name}* — {score} очков\n"
    
    text += "\n_Играй и попади в топ!_"
    
    bot.answer_callback_query(call.id)
    bot.send_message(call.message.chat.id, text, parse_mode='Markdown')

@bot.message_handler(content_types=['web_app_data'])
def handle_web_app_data(message):
    """Обработка данных от игры"""
    try:
        data = json.loads(message.web_app_data.data)
        user_id = str(message.from_user.id)
        user_name = message.from_user.first_name or "Игрок"
        score = data.get('score', 0)
        
        # Загружаем текущие очки
        scores = load_scores()
        
        # Обновляем только если новый результат лучше
        current_best = scores.get(user_id, {}).get('score', 0)
        
        if score > current_best:
            scores[user_id] = {
                'name': user_name,
                'score': score
            }
            save_scores(scores)
            
            # Находим позицию в рейтинге
            leaderboard = get_leaderboard(100)
            position = next((i+1 for i, (uid, _) in enumerate(leaderboard) if uid == user_id), None)
            
            bot.send_message(
                message.chat.id,
                f"🎉 *Новый рекорд!*\n\n"
                f"Твой результат: *{score}* очков\n"
                f"Место в рейтинге: *#{position}*",
                parse_mode='Markdown'
            )
        else:
            bot.send_message(
                message.chat.id,
                f"🏁 Заезд окончен!\n\n"
                f"Результат: *{score}* очков\n"
                f"Твой рекорд: *{current_best}* очков",
                parse_mode='Markdown'
            )
            
    except Exception as e:
        print(f"Ошибка обработки данных: {e}")

@bot.message_handler(commands=['myscore'])
def my_score(message):
    """Показать свои очки"""
    user_id = str(message.from_user.id)
    scores = load_scores()
    
    if user_id in scores:
        score = scores[user_id]['score']
        
        # Находим позицию
        leaderboard = get_leaderboard(100)
        position = next((i+1 for i, (uid, _) in enumerate(leaderboard) if uid == user_id), "—")
        
        bot.send_message(
            message.chat.id,
            f"📊 *Твоя статистика*\n\n"
            f"🏆 Лучший результат: *{score}* очков\n"
            f"📍 Место в рейтинге: *#{position}*",
            parse_mode='Markdown'
        )
    else:
        bot.send_message(message.chat.id, "Ты ещё не играл! Жми /start и вперёд! 🏎️")

@bot.message_handler(commands=['help'])
def help_command(message):
    """Помощь"""
    text = (
        "📖 *Команды бота:*\n\n"
        "/start — Начать игру\n"
        "/rating — Топ игроков\n"
        "/myscore — Мои очки\n"
        "/help — Помощь\n\n"
        "🎮 Нажми *Играть* и покажи класс!"
    )
    bot.send_message(message.chat.id, text, parse_mode='Markdown')

if __name__ == '__main__':
    print("🚀 Бот NITROWAY запущен...")
    print("📊 Команды: /start, /rating, /myscore, /help")
    bot.infinity_polling()
