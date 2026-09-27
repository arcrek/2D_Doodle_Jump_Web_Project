// frontend/src/game/ranking.js
// BOT-01 · Nguyễn Đình Phú Vinh
// MODULE XẾP HẠNG THỜI GIAN THỰC

/**
 * BOT-01: getRanking(player, bots)
 * Trả mảng mới gồm các đối thủ.
 * Sắp xếp theo progress giảm dần; bằng nhau thì id tăng dần theo ký tự.
 * Không sửa đổi mảng hoặc đối tượng nhận vào.
 */
export function getRanking(player, bots = []) {
  const playerProgress = player?.progress !== undefined ? player.progress : 0;
  const participants = [
    {
      id: player?.id || 'player',
      name: player?.name || 'Bạn',
      progress: playerProgress,
      isDead: Boolean(player?.isDead),
    },
  ];

  if (Array.isArray(bots)) {
    for (let i = 0; i < bots.length; i++) {
      const bot = bots[i];
      const botProgress = bot?.progress !== undefined ? bot.progress : 0;
      participants.push({
        id: bot?.id || bot?.type || `bot_${i}`,
        name: bot?.profile?.name || bot?.name || `Bot ${i + 1}`,
        progress: botProgress,
        isDead: Boolean(bot?.isDead),
      });
    }
  }

  return participants.sort((a, b) => {
    if (b.progress !== a.progress) {
      return b.progress - a.progress;
    }
    return String(a.id).localeCompare(String(b.id));
  });
}
