import { describe, it, expect } from 'vitest';
import { getRanking } from '../game/ranking.js';

describe('ranking (BOT-01)', () => {
  it('xếp hạng đúng theo mẫu chuẩn trong QUY_UOC_CHUNG', () => {
    const player = { id: 'player', progress: 100 };
    const bots = [
      { id: 'teacher-1', progress: 80 },
      { id: 'teacher-2', progress: 120 },
      { id: 'teacher-3', progress: 100 },
      { id: 'teacher-4', progress: 0 },
    ];

    const result = getRanking(player, bots);

    expect(result.map((r) => r.id)).toEqual([
      'teacher-2',
      'player',
      'teacher-3',
      'teacher-1',
      'teacher-4',
    ]);
  });

  it('không sửa đổi dữ liệu đầu vào (immutability)', () => {
    const player = { id: 'player', progress: 50 };
    const bots = [{ id: 'bot-1', progress: 60 }];
    const botsClone = [...bots];

    getRanking(player, bots);

    expect(bots).toEqual(botsClone);
  });
});
