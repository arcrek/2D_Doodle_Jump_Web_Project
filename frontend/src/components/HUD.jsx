import React, { useEffect, useState } from 'react';
import { getJson } from '../services/api.js';

// 0. COMPONENT TOP BAR (Thanh điều hướng tối trên cùng: Logo, Timer, Hint, Nút Chơi lại)
export function TopBar({ elapsedMs = 0, phase = 'ready', onTogglePause, onRestart, onExitToMenu }) {
  const seconds = (Math.max(0, elapsedMs) / 1000).toFixed(1);
  return (
    <header className="game-top-bar" aria-label="Thanh điều hướng trò chơi">
      <div className="top-bar-left">
        <div className="top-bar-pill pill-brand">
          <span role="img" aria-label="frog">🐸</span> 2D Doodle Jump
        </div>
        <div className="top-bar-pill pill-timer">
          <span role="img" aria-label="stopwatch">⏱️</span> {seconds}s
        </div>
      </div>

      <div className="top-bar-center">
        <div className="top-bar-pill pill-hint">
          Phím điều khiển: <kbd>A</kbd> / <kbd>D</kbd> hoặc <kbd>←</kbd> / <kbd>→</kbd>
        </div>
      </div>

      <div className="top-bar-right">
        {onTogglePause && (
          <button
            type="button"
            className="btn-top-bar btn-top-pause"
            onClick={onTogglePause}
            title="Tạm dừng / Tiếp tục (ESC)"
            aria-label="Tạm dừng hoặc tiếp tục ván chơi"
          >
            {phase === 'paused' ? '▶ Tiếp tục' : '⏸ Tạm dừng'}
          </button>
        )}
        {onRestart && (
          <button
            type="button"
            className="btn-top-bar btn-top-restart"
            onClick={onRestart}
            title="Chơi lại ván mới"
            aria-label="Chơi lại ván mới"
          >
            🔄 Chơi lại
          </button>
        )}
        {onExitToMenu && (
          <button
            type="button"
            className="btn-top-bar btn-top-menu"
            onClick={onExitToMenu}
            title="Quay về màn hình chính"
            aria-label="Quay về màn hình chính"
          >
            🏠 Menu
          </button>
        )}
      </div>
    </header>
  );
}

// 0.1 COMPONENT FLOATING HUD (Thẻ nổi Kỷ lục & Đua top lơ lửng trên Canvas)
export function FloatingHUD({ currentHeight = 0, maxHeight = 0, nickname = 'Bạn', ranking = [] }) {
  const displayCurrent = Math.max(0, Math.round(currentHeight));
  const displayMax = Math.max(displayCurrent, Math.round(maxHeight));

  const displayRanking = ranking.length ? ranking : [{ id: 'player', name: nickname || 'Bạn', progress: displayCurrent }];

  return (
    <>
      {/* Thẻ Kỷ lục & Hiện tại ở góc trên bên trái */}
      <div className="floating-hud-score" aria-label="Thông số độ cao">
        <div className="floating-score-row score-row-high">
          <span>🏆</span>
          <span>Kỷ lục: {displayMax}m</span>
        </div>
        <div className="floating-score-row score-row-current">
          <span>🚀</span>
          <span>Hiện tại: {displayCurrent}m</span>
        </div>
      </div>

      {/* Thẻ ĐUA TOP ở góc trên bên phải */}
      <div className="floating-hud-ranking" aria-label="Bảng đua top">
        <div className="floating-ranking-header">
          <span>🏁</span>
          <span>ĐUA TOP</span>
        </div>
        <div className="floating-ranking-list">
          {displayRanking.map((item, idx) => (
            <div
              key={item.id}
              className={`floating-ranking-item ${item.id === 'player' ? 'is-player' : ''}`}
            >
              <span className="ranking-name">
                #{idx + 1} {item.name}
              </span>
              <span className="ranking-score">{Math.round(item.progress)}m</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// 1. COMPONENT HUD (Bảng thông số: Độ cao, Cao nhất, Thời gian, Nút điều khiển)
const PHASE_NAMES = {
  ready: 'Chưa bắt đầu',
  running: 'Đang chơi',
  paused: 'Tạm dừng',
  finished: 'Kết thúc',
};

export default function HUD({
  height = 0,
  maxHeight = 0,
  elapsedMs = 0,
  phase = 'ready',
  onTogglePause,
  onRestart,
}) {
  const seconds = (Math.max(0, elapsedMs) / 1000).toFixed(1);
  const displayHeight = Math.max(0, Math.round(height));
  const displayMaxHeight = Math.max(displayHeight, Math.round(maxHeight));

  // Phím ESC để Tạm dừng / Tiếp tục
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && onTogglePause) onTogglePause();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onTogglePause]);

  return (
    <div className="game-hud-panel" aria-label="Bảng thông số trò chơi">
      <div className="hud-header">
        <h3 className="hud-panel-title">THÔNG SỐ TRÒ CHƠI</h3>
        <span className={`hud-badge badge-${phase}`} data-testid="hud-phase">
          {PHASE_NAMES[phase] || 'Chưa bắt đầu'}
        </span>
      </div>

      <div className="hud-stats-grid">
        {/* Độ cao */}
        <div className="hud-card hud-height-card">
          <span className="hud-card-label">Độ cao</span>
          <div className="hud-height-group">
            <strong className="hud-card-value current-height" data-testid="hud-height">
              {displayHeight}m
            </strong>
            <div className="hud-max-height-box">
              <span className="max-label">Cao nhất:</span>
              <strong className="max-value" data-testid="hud-max-height">
                {displayMaxHeight}m
              </strong>
            </div>
          </div>
        </div>

        {/* Thời gian */}
        <div className="hud-card hud-timer-card">
          <span className="hud-card-label">Thời gian</span>
          <strong className="hud-card-value timer-value" data-testid="hud-timer">
            {seconds}s
          </strong>
        </div>
      </div>

      {/* Cụm nút bấm điều khiển */}
      <div className="hud-controls-row">
        {onTogglePause && (
          <button
            type="button"
            className={`btn-hud ${phase === 'paused' ? 'btn-resume' : 'btn-pause'}`}
            onClick={onTogglePause}
            aria-label="Tạm dừng hoặc Tiếp tục"
          >
            {phase === 'paused' ? '▶ Tiếp tục (ESC)' : '⏸ Tạm dừng (ESC)'}
          </button>
        )}

        {onRestart && (
          <button
            type="button"
            className="btn-hud btn-restart"
            onClick={onRestart}
            aria-label="Chơi lại từ đầu"
          >
            🔄 Chơi lại (Restart)
          </button>
        )}
      </div>
    </div>
  );
}

// 2. COMPONENT START MENU (Màn hình mở đầu: Nhập Nickname, Chọn Skin, Nút Chơi)
export function StartMenu({
  config,
  onStartGame,
  onOpenLeaderboard,
  onOpenHistory,
  initialNickname = '',
  initialSkin = 'doodle',
}) {
  const [nickname, setNickname] = useState(initialNickname);
  const [skinId, setSkinId] = useState(initialSkin);
  const [error, setError] = useState('');

  const DEFAULT_SKINS = [
    { id: 'doodle', name: 'Vàng cổ điển', sprite: '/images/skins/doodle.svg' },
    { id: 'red', name: 'Đỏ rực', sprite: '/images/skins/red.svg' },
    { id: 'purple', name: 'Tím mộng mơ', sprite: '/images/skins/purple.svg' },
    { id: 'blue', name: 'Xanh bầu trời', sprite: '/images/skins/blue.svg' },
    { id: 'gray', name: 'Xám tinh nghịch', sprite: '/images/skins/gray.svg' },
  ];
  const skins = config?.skins?.length ? config.skins : DEFAULT_SKINS;
  const selectedSkin = skins.find(skin => skin.id === skinId) || skins[0];

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanName = nickname.trim();

    if (!cleanName) {
      setError('Vui lòng nhập tên người chơi (1–24 ký tự).');
      return;
    }
    if (cleanName.length > 24) {
      setError('Tên người chơi tối đa 24 ký tự.');
      return;
    }

    setError('');
    onStartGame({ nickname: cleanName, skinId });
  };

  return (
    <div className="menu-overlay" role="region" aria-label="Menu chính của game">
      <div className="menu-card">
        <header className="menu-header">
          <h2 className="menu-game-title">DOODLE JUMP</h2>
          <span className="menu-badge">USTH Edition</span>
        </header>

        <form className="menu-form" onSubmit={handleSubmit}>
          {/* Ô nhập tên */}
          <div className="form-group">
            <label htmlFor="player-nickname" className="form-label">
              Tên người chơi <span className="required-star">*</span>
            </label>
            <input
              id="player-nickname"
              type="text"
              className={`form-input ${error ? 'input-error' : ''}`}
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                if (error) setError('');
              }}
              placeholder="Nhập tên của bạn..."
              maxLength={24}
              autoFocus
            />
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
          </div>

          {/* Chọn trang phục */}
          <div className="form-group">
            <label htmlFor="player-skin" className="form-label">
              Trang phục (Skin)
            </label>
            <select
              id="player-skin"
              className="form-select"
              value={skinId}
              onChange={(e) => setSkinId(e.target.value)}
            >
              {skins.map((skin) => (
                <option key={skin.id} value={skin.id}>
                  {skin.name}
                </option>
              ))}
            </select>
          </div>
          <div className="skin-preview" aria-live="polite">
            <img src={selectedSkin.sprite || `/images/skins/${selectedSkin.id}.svg`} alt="" />
            <span>{selectedSkin.name}</span>
          </div>

          {/* Hướng dẫn phím */}
          <div className="menu-controls-info">
            <p className="controls-title">🎮 Cách điều khiển:</p>
            <div className="controls-keys">
              <kbd>A</kbd> / <kbd>D</kbd> hoặc <kbd>←</kbd> / <kbd>→</kbd> để di chuyển
            </div>
          </div>

          {/* Nút bấm */}
          <div className="menu-button-group">
            <button type="submit" className="btn-primary btn-start">
              ▶ BẮT ĐẦU CHƠI
            </button>
            <button
              type="button"
              className="btn-secondary btn-leaderboard"
              onClick={onOpenLeaderboard}
            >
              🏆 Bảng xếp hạng
            </button>
            {onOpenHistory && <button type="button" className="btn-outline" onClick={onOpenHistory}>📖 Lịch sử của tôi</button>}
          </div>
        </form>
      </div>
    </div>
  );
}

// 4. COMPONENT GAME OVER / PAUSE MODAL (Popup Tạm dừng & Kết thúc ván)
export function GameOverModal({
  phase,
  height = 0,
  elapsedMs = 0,
  placement = 1,
  nickname = '',
  outcome,
  reason,
  save,
  onResume,
  onRestart,
  onExitToMenu,
}) {
  if (phase !== 'paused' && phase !== 'finished') return null;

  const seconds = (Math.max(0, elapsedMs) / 1000).toFixed(1);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        {phase === 'paused' ? (
          <>
            <h2 className="modal-title">⏸ Trò Chơi Tạm Dừng</h2>
            <p className="modal-subtitle">Đang giữ vị trí của <strong>{nickname || 'Bạn'}</strong></p>
            <div className="modal-actions-column">
              <button type="button" className="btn-primary" onClick={onResume}>▶ Tiếp tục</button>
              <button type="button" className="btn-secondary" onClick={onRestart}>🔄 Chơi lại</button>
              <button type="button" className="btn-outline" onClick={onExitToMenu}>🏠 Về Menu</button>
            </div>
          </>
        ) : (
          <>
            <h2 className="modal-title">{outcome === 'finished' ? '🏁 Về đích!' : 'Kết thúc lượt chơi'}</h2>
            <p className="modal-subtitle">{reason === 'timeout' ? 'Đã hết thời gian.' : reason === 'fall' ? 'Bạn đã rơi khỏi màn chơi.' : 'Chúc mừng bạn đã chạm đích!'}</p>
            <div className="stats-summary">
              <div className="stat-box highlight">
                <span className="stat-label">Độ cao</span>
                <span className="stat-num">{Math.round(height)}m</span>
              </div>
              <div className="stat-box">
                <span className="stat-label">Thời gian</span>
                <span className="stat-num">{seconds}s</span>
              </div>
              <div className="stat-box">
                <span className="stat-label">Thứ hạng</span>
                <span className="stat-num">Top {placement}/5</span>
              </div>
            </div>
            {save?.message && <p className={`save-status save-${save.status}`} role="status">{save.message}</p>}
            <div className="modal-actions-column">
              <button type="button" className="btn-primary" onClick={onRestart}>🔄 Chơi lại</button>
              <button type="button" className="btn-secondary" onClick={onExitToMenu}>🏠 Về Menu</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// 5. COMPONENT LEADERBOARD MODAL (Popup Bảng Xếp Hạng Top 10)
export function LeaderboardModal({ onClose, rulesVersion = 'v1', offline = false, mode = 'leaderboard', playerId = '' }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(!offline);
  const [error, setError] = useState(offline ? 'Không tải được dữ liệu khi đang ngoại tuyến.' : '');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (offline) return;
    const path = mode === 'history'
      ? `/api/runs?player_id=${encodeURIComponent(playerId)}`
      : `/api/leaderboard?rules_version=${encodeURIComponent(rulesVersion)}`;
    getJson(path)
      .then((data) => {
        setItems(data.items || []);
        setLoading(false);
        setError('');
      })
      .catch(() => { setError('Không tải được dữ liệu. Hãy thử lại khi backend hoạt động.'); setLoading(false); });
  }, [rulesVersion, offline, mode, playerId, attempt]);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <h2 className="modal-title">{mode === 'history' ? '📖 Lịch sử của tôi' : '🏆 Bảng Xếp Hạng Top 10'}</h2>
        {loading ? (
          <p className="modal-status">Đang tải...</p>
        ) : error ? (
          <div className="modal-alert" role="alert"><p>{error}</p>{!offline && <button type="button" onClick={() => setAttempt(value => value + 1)}>Thử lại</button>}</div>
        ) : items.length === 0 ? (
          <p className="modal-empty">Chưa có lượt chơi nào.</p>
        ) : (
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>Hạng</th>
                <th>Người chơi</th>
                <th>Độ cao</th>
                <th>Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {items.slice(0, 10).map((item, idx) => (
                <tr key={idx}>
                  <td>#{idx + 1}</td>
                  <td>{item.nickname}</td>
                  <td>{item.height}m</td>
                  <td>{(item.elapsed_ms / 1000).toFixed(1)}s</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  );
}
