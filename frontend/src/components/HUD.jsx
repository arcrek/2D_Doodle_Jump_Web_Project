// =============================================================================
// FILE: doodle-jump-usth/frontend/src/components/HUD.jsx
// VAI TRÒ: TỔNG HỢP CÁC COMPONENT GIAO DIỆN NGƯỜI DÙNG & POPUP OVERLAYS (UI SUITE)
// PHỤ TRÁCH: Module UI-01 & FE-HUD
// =============================================================================
// File này chứa toàn bộ các khối giao diện React hiển thị đè lên trên Canvas:
// 1. TopBar: Thanh điều hướng tối trên cùng (Logo, đồng hồ đếm giây, gợi ý phím, nút Pause, Restart, Menu).
// 2. FloatingHUD: Cặp thẻ nổi phong cách Glassmorphism lơ lửng trực tiếp trên Canvas:
//    - Thẻ trái: Kỷ lục cao nhất và độ cao hiện tại.
//    - Thẻ phải: Bảng xếp hạng ĐUA TOP 5 người chơi (Bạn vs 4 Bot) thời gian thực.
// 3. HUD (Default Panel): Bảng thống kê hiển thị chi tiết khi cần chế độ cổ điển.
// 4. StartMenu: Màn hình mở đầu nhập Nickname, chọn Skin trang phục và xem BXH.
// 5. GameOverModal: Popup thông báo Tạm dừng (Pause) hoặc Tổng kết khi ván chơi kết thúc.
// 6. LeaderboardModal: Bảng xếp hạng Top 10 toàn cầu hoặc Lịch sử thi đấu cá nhân từ SQLite.
// =============================================================================

import React, { useEffect, useState, useRef } from 'react';
import comicBurstMarkup from '../assets/menu-comic-burst.svg?raw';
import { getJson } from '../services/api.js';
import { useTranslation } from '../i18n/I18nContext.jsx';
import LanguageSwitcher from './LanguageSwitcher.jsx';

// =============================================================================
// 1. COMPONENT TOP BAR (Thanh điều hướng tối trên cùng)
// =============================================================================
/**
 * Thanh công cụ ngang trên cùng hiển thị logo, đồng hồ, phím tắt và các nút điều khiển
 */
function PencilFrame({ fill = 'none' }) {
  return <svg className="pencil-frame" viewBox="0 0 200 100" preserveAspectRatio="none" aria-hidden="true">
    <path fill={fill} stroke="currentColor" strokeWidth="1.6" vectorEffect="non-scaling-stroke"
      d="M9 4 Q98 2 191 5 Q197 6 196 15 L195 89 Q194 97 186 96 L13 95 Q4 97 5 88 L4 14 Q3 4 9 4">
      <animate attributeName="d" dur=".91s" calcMode="discrete" repeatCount="indefinite"
        values="M9 4 Q98 2 191 5 Q197 6 196 15 L195 89 Q194 97 186 96 L13 95 Q4 97 5 88 L4 14 Q3 4 9 4;M10 5 Q105 1 190 4 Q196 7 195 16 L197 88 Q194 95 185 97 L12 96 Q3 94 4 87 L6 15 Q4 6 10 5;M9 3 Q100 6 192 4 Q197 5 196 14 L194 90 Q196 97 187 95 L14 97 Q5 95 6 89 L3 13 Q4 5 9 3;M10 4 Q95 2 190 6 Q196 4 197 15 L196 89 Q193 98 185 96 L12 94 Q4 96 5 86 L5 14 Q3 3 10 4"/>
      <animate attributeName="stroke-opacity" values=".85;.6;.95;.72;.88" dur="1.13s" calcMode="discrete" repeatCount="indefinite"/>
    </path>
    <path d="M10 6 L189 7 M194 16 L193 87 M185 94 L14 93 M7 86 L8 15" fill="none" stroke="currentColor" strokeWidth=".65" strokeDasharray="7 3 2 6" opacity=".45" vectorEffect="non-scaling-stroke"/>
  </svg>;
}

function ToolIcon({ type }) {
  const paths = {
    pause: 'M8 5 L8 19 M16 5 L16 19',
    resume: 'M8 5 L19 12 L8 19 Z',
    restart: 'M5 10 A8 8 0 1 1 5 16 M5 4 L5 10 L11 10',
    home: 'M3 11 L12 3 L21 11 M6 9 L6 21 L18 21 L18 9 M10 21 L10 15 L14 15 L14 21',
  };
  return <svg className="doodle-tool-icon" viewBox="0 0 24 24" aria-hidden="true"><path d={paths[type]} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function TopBar({ elapsedMs = 0, phase = 'ready', onTogglePause, onRestart, onExitToMenu }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const seconds = (Math.max(0, elapsedMs) / 1000).toFixed(1);
  const runAction = (action) => { setOpen(false); action(); };

  return <header className="game-top-bar" aria-label={t('topbar.aria_controls')}>
    <button type="button" className="doodle-menu-toggle" aria-label={t('topbar.aria_toggle')}
      aria-expanded={open} aria-controls="game-tools" onClick={() => setOpen(!open)}>
      <PencilFrame />
      <svg className="doodle-menu-lines" viewBox="0 0 40 40" aria-hidden="true">
        <path d="M8 11 Q20 9 32 11 M7 20 Q20 21 33 19 M9 29 Q20 27 31 29" fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round">
          <animate attributeName="d" values="M8 11 Q20 9 32 11 M7 20 Q20 21 33 19 M9 29 Q20 27 31 29;M7 10 Q20 12 32 10 M8 19 Q20 18 32 21 M8 28 Q20 30 33 28;M9 12 Q20 10 33 11 M7 21 Q20 19 31 20 M7 30 Q20 27 32 29" dur=".57s" calcMode="discrete" repeatCount="indefinite"/>
        </path>
      </svg>
    </button>
    {open && <div className="doodle-tools" id="game-tools">
      <PencilFrame fill="#fffaf0" />
      <div className="doodle-tools-heading">
        <div><small>DOODLE JUMP</small><strong>{t('topbar.title')}</strong></div>
        <button className="doodle-tools-close" type="button" aria-label={t('topbar.close_aria')} onClick={() => setOpen(false)}>×</button>
      </div>
      <div className="doodle-tools-time">{t('topbar.time_label')} <span>{seconds}s</span></div>
      <div className="doodle-tools-lang">
        <LanguageSwitcher />
      </div>
      <div className="doodle-tools-actions">
        {onTogglePause && <button className="doodle-tool-action is-main" type="button" onClick={() => runAction(onTogglePause)} aria-label={t('topbar.aria_pause_resume')}><PencilFrame fill="#f6df83" /><ToolIcon type={phase === 'paused' ? 'resume' : 'pause'} /><span>{phase === 'paused' ? t('topbar.resume') : t('topbar.pause')}</span><kbd>ESC</kbd></button>}
        {onRestart && <button className="doodle-tool-action" type="button" onClick={() => runAction(onRestart)} aria-label={t('topbar.aria_restart')}><ToolIcon type="restart" /><span>{t('topbar.restart')}</span></button>}
        {onExitToMenu && <button className="doodle-tool-action" type="button" onClick={() => runAction(onExitToMenu)} aria-label={t('topbar.aria_menu')}><ToolIcon type="home" /><span>{t('topbar.menu')}</span></button>}
      </div>
      <div className="doodle-tools-hint"><kbd>A</kbd><kbd>D</kbd><span>{t('topbar.move_hint')}</span></div>
    </div>}
  </header>;
}

// =============================================================================
// 2. COMPONENT FLOATING HUD (Thẻ nổi Kỷ lục & Bảng Đua Top trên Canvas)
// =============================================================================
/**
 * Thẻ hiển thị độ cao và vị trí đua top lơ lửng ngay trên bề mặt Canvas (Glassmorphism)
 */
export function FloatingHUD({ currentHeight = 0, maxHeight = 0, nickname = '', ranking = [], lavaDistance = null }) {
  const { t } = useTranslation();
  const displayCurrent = Math.max(0, Math.round(currentHeight));
  const displayMax = Math.max(displayCurrent, Math.round(maxHeight));
  const playerDisplayName = nickname || t('game.default_player_name');

  // Nếu chưa có ranking thì hiển thị mặc định người chơi
  const displayRanking = ranking.length ? ranking : [{ id: 'player', name: playerDisplayName, progress: displayCurrent }];

  return (
    <>
      {/* Thẻ Kỷ lục & Hiện tại ở góc trên bên trái Canvas */}
      <div className="floating-hud-score" aria-label={t('hud.aria_score')}>
        <PencilFrame />
        <div className="floating-score-row score-row-high">
          <span>🏆</span>
          <span>{t('hud.best_label', { val: displayMax })}</span>
        </div>
        <div className="floating-score-row score-row-current">
          <span>🚀</span>
          <span>{t('hud.current_label', { val: displayCurrent })}</span>
        </div>
        {typeof lavaDistance === 'number' && (
          <div className={`floating-score-row score-row-lava ${lavaDistance < 100 ? 'is-danger' : lavaDistance < 250 ? 'is-warning' : ''}`}>
            <span>{lavaDistance < 100 ? '⚠️' : '🔥'}</span>
            <span>{t('hud.lava_label', { val: lavaDistance })}</span>
          </div>
        )}
      </div>

      {/* Thẻ ĐUA TOP ở góc trên bên phải Canvas */}
      <div className="floating-hud-ranking" aria-label={t('hud.aria_ranking')}>
        <PencilFrame />
        <div className="floating-ranking-header">
          <span>🏁</span>
          <span>{t('hud.leaderboard_title')}</span>
        </div>
        <div className="floating-ranking-list">
          {displayRanking.map((item, idx) => (
            <div
              key={item.id}
              className={`floating-ranking-item ${item.id === 'player' ? 'is-player' : ''}`}
            >
              <span className="ranking-name">
                #{idx + 1} {item.id === 'player' ? (item.name || playerDisplayName) : item.name}
              </span>
              <span className="ranking-score">{Math.round(item.progress)}m</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// =============================================================================
// 3. COMPONENT HUD (Bảng thông số cổ điển)
// =============================================================================
/**
 * Bảng thông số đầy đủ hỗ trợ phím tắt ESC
 */
export default function HUD({
  height = 0,
  maxHeight = 0,
  elapsedMs = 0,
  phase = 'ready',
  onTogglePause,
  onRestart,
}) {
  const { t } = useTranslation();
  const seconds = (Math.max(0, elapsedMs) / 1000).toFixed(1);
  const displayHeight = Math.max(0, Math.round(height));
  const displayMaxHeight = Math.max(displayHeight, Math.round(maxHeight));

  // Lắng nghe phím ESC để Tạm dừng / Tiếp tục
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && onTogglePause) onTogglePause();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onTogglePause]);

  return (
    <div className="game-hud-panel" aria-label={t('hud.aria_hud')}>
      <div className="hud-header">
        <h3 className="hud-panel-title">{t('hud.stats_title')}</h3>
        <span className={`hud-badge badge-${phase}`} data-testid="hud-phase">
          {t(`hud.phase_${phase}`)}
        </span>
      </div>

      <div className="hud-stats-grid">
        {/* Ô độ cao hiện tại và cao nhất */}
        <div className="hud-card hud-height-card">
          <span className="hud-card-label">{t('hud.height_label')}</span>
          <div className="hud-height-group">
            <strong className="hud-card-value current-height" data-testid="hud-height">
              {displayHeight}m
            </strong>
            <div className="hud-max-height-box">
              <span className="max-label">{t('hud.best_label_short')}</span>
              <strong className="max-value" data-testid="hud-max-height">
                {displayMaxHeight}m
              </strong>
            </div>
          </div>
        </div>

        {/* Ô thời gian thi đấu */}
        <div className="hud-card hud-timer-card">
          <span className="hud-card-label">{t('hud.time_label')}</span>
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
            aria-label={t('hud.aria_pause_resume')}
          >
            {phase === 'paused' ? t('hud.btn_resume') : t('hud.btn_pause')}
          </button>
        )}

        {onRestart && (
          <button
            type="button"
            className="btn-hud btn-restart"
            onClick={onRestart}
            aria-label={t('hud.aria_restart')}
          >
            {t('hud.btn_restart')}
          </button>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// 4. COMPONENT START MENU (Màn hình mở đầu: Nhập Nickname & Chọn Skin)
// =============================================================================
/**
 * Menu xuất phát cho phép người chơi nhập tên, chọn trang phục và xem BXH
 */
export function StartMenu({
  onStartGame,
  onOpenLeaderboard,
  onOpenHistory,
  initialNickname = '',
  initialSkin = 'doodle',
}) {
  const { t } = useTranslation();
  const [nickname, setNickname] = useState(initialNickname);
  const skinId = initialSkin;
  const [error, setError] = useState('');
  const alertRef = useRef(null);
  const burstRef = useRef(null);

  useEffect(() => {
    const alert = alertRef.current;
    const burst = burstRef.current;
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!alert || !burst || media?.matches) return;
    const paths = [...burst.querySelectorAll('path[d^="M320"], path[d^="M319"]')].map(path => ({
      path, points: path.getAttribute('d').match(/-?\d+(?:\.\d+)?/g).map(Number),
    }));
    let hover = 0, blend = 0, phase = 0, previous = null, started = null, lastInk = 0, frame;
    const enter = () => { hover = 1; };
    const leave = () => { hover = 0; };
    alert.addEventListener('pointerenter', enter);
    alert.addEventListener('pointerleave', leave);
    const animate = time => {
      if (started === null) started = time;
      const dt = previous === null ? 0 : Math.min((time - previous) / 1000, .05);
      previous = time;
      // Keep one oscillator phase. Hover eases its speed/amplitude, never restarts it.
      blend += (hover - blend) * (1 - Math.exp(-dt / .18));
      phase += dt * (2.6 + blend * 9);
      const seconds = (time - started) / 1000;
      const angle = Math.sin(phase) * (3 + blend * 6);
      alert.style.transform = `rotate(${angle}deg) scale(${1 + blend * .16})`;
      const beat = Math.sin(seconds * Math.PI * 2 / 4.2);
      burst.style.transform = `translate(-50%, -50%) scale(${1 + .009 * beat})`;
      if (time - lastInk >= 80) {
        for (const {path, points} of paths) {
          const coords = [];
          for (let i = 0; i < points.length; i += 2) {
            const x = points[i], y = points[i + 1];
            const ripple = 1 + .009 * Math.sin(seconds * 1.7 + x * .019 + y * .014);
            coords.push(`${(320 + (x - 320) * ripple).toFixed(2)} ${(380 + (y - 380) * ripple).toFixed(2)}`);
          }
          path.setAttribute('d', `M${coords.join(' ')}Z`);
        }
        lastInk = time;
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame);
      alert.removeEventListener('pointerenter', enter);
      alert.removeEventListener('pointerleave', leave);
    };
  }, []);

  // Xử lý gửi biểu mẫu bắt đầu chơi
  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanName = nickname.trim();

    // Ràng buộc tính hợp lệ: Tên không được rỗng và tối đa 24 ký tự
    if (!cleanName) {
      setError(t('menu.name_required'));
      return;
    }
    if (cleanName.length > 24) {
      setError(t('menu.name_max_length'));
      return;
    }

    setError('');
    onStartGame({ nickname: cleanName, skinId });
  };

  return (
    <div className="menu-overlay" role="region" aria-label={t('menu.aria_main_menu')}>
      <div className="menu-comic-stage">
      <div ref={burstRef} className="menu-comic-burst" aria-hidden="true" dangerouslySetInnerHTML={{ __html: comicBurstMarkup }} />
      <div className="menu-card">
        <header className="menu-header">
          <div className="menu-header-bar">
            <span className="menu-badge">{t('menu.edition')}</span>
            <LanguageSwitcher className="menu-lang-switcher" />
          </div>
          <h2 className="menu-game-title">{t('menu.title')}</h2>
        </header>

        <form className="menu-form" onSubmit={handleSubmit}>
          {/* Ô nhập tên người chơi */}
          <div className="form-group">
            <label htmlFor="player-nickname" className="form-label">
              {t('menu.player_name_label')} <span className="required-star">*</span>
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
              placeholder={t('menu.player_name_placeholder')}
              maxLength={24}
              autoFocus
            />
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
          </div>

          {/* Khối hướng dẫn phím bấm */}
          <div className="menu-controls-info">
            <p className="controls-title">{t('menu.controls_title')}</p>
            <div className="controls-keys">
              {t('menu.controls_hint')}
            </div>
          </div>

          {/* Các nút bấm hành động */}
          <div className="menu-button-group">
            <button type="submit" className="btn-primary btn-start">
              {t('menu.start_button')}
            </button>
            <button
              type="button"
              className="btn-secondary btn-leaderboard"
              onClick={onOpenLeaderboard}
            >
              {t('menu.leaderboard_button')}
            </button>
            {onOpenHistory && <button type="button" className="btn-outline" onClick={onOpenHistory}>{t('menu.history_button')}</button>}
          </div>
        </form>
      </div>
      <img ref={alertRef} className="menu-comic-alert" src="/images/menu-comic-alert.svg" alt="" aria-hidden="true" />
      </div>
    </div>
  );
}

// =============================================================================
// 5. COMPONENT GAME OVER / PAUSE MODAL (Popup Tạm dừng & Kết thúc ván)
// =============================================================================
/**
 * Hộp thoại hiển thị khi trò chơi bị tạm dừng hoặc khi lượt chơi kết thúc (về đích / rơi vực / hết giờ)
 */
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
  // Chỉ render khi phase là 'paused' hoặc 'finished'
  if (phase !== 'paused' && phase !== 'finished') return null;

  const { t } = useTranslation();
  const seconds = (Math.max(0, elapsedMs) / 1000).toFixed(1);

  const getSubtitle = () => {
    if (outcome === 'finished') return t('game_over.congrats');
    if (reason === 'lava') return t('game_over.lava_death');
    if (reason === 'timeout') return t('game_over.timeout_death');
    if (reason === 'fall') return t('game_over.fall_death');
    return t('game_over.default_death');
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card doodle-result-card">
        <PencilFrame fill="#fffaf0" />
        {/* TRƯỜNG HỢP 1: TẠM DỪNG GAME (PAUSED) */}
        {phase === 'paused' ? (
          <>
            <h2 className="modal-title">{t('game_over.pause_title')}</h2>
            <p className="modal-subtitle">{t('game_over.holding_position', { name: nickname || t('game.default_player_name') })}</p>
            <div className="modal-actions-column">
              <button type="button" className="btn-primary" onClick={onResume}><PencilFrame fill="#f5dc78" /><span>{t('game_over.resume')}</span></button>
              <button type="button" className="btn-secondary" onClick={onRestart}><PencilFrame fill="#fffaf0" /><span>{t('game_over.restart')}</span></button>
              <button type="button" className="btn-outline" onClick={onExitToMenu}><PencilFrame fill="#fffaf0" /><span>{t('game_over.menu')}</span></button>
            </div>
          </>
        ) : (
          /* TRƯỜNG HỢP 2: KẾT THÚC LƯỢT CHƠI (FINISHED) */
          <>
            <h2 className="modal-title">{outcome === 'finished' ? t('game_over.finish_win_title') : t('game_over.finish_over_title')}</h2>
            <p className="modal-subtitle">{getSubtitle()}</p>
            {/* Tóm tắt thành tích ván đấu */}
            <div className="stats-summary">
              <div className="stat-box highlight">
                <PencilFrame />
                <span className="stat-label">{t('game_over.stat_height')}</span>
                <span className="stat-num">{Math.round(height)}m</span>
              </div>
              <div className="stat-box">
                <PencilFrame />
                <span className="stat-label">{t('game_over.stat_time')}</span>
                <span className="stat-num">{seconds}s</span>
              </div>
              <div className="stat-box">
                <PencilFrame />
                <span className="stat-label">{t('game_over.stat_rank')}</span>
                <span className="stat-num">{t('game_over.rank_val', { placement })}</span>
              </div>
            </div>
            {/* Trạng thái lưu kết quả vào máy chủ SQLite */}
            {save?.message && <p className={`save-status save-${save.status}`} role="status">{save.message}</p>}
            <div className="modal-actions-column">
              <button type="button" className="btn-primary" onClick={onRestart}><PencilFrame fill="#f5dc78" /><span>{t('game_over.restart')}</span></button>
              <button type="button" className="btn-secondary" onClick={onExitToMenu}><PencilFrame fill="#fffaf0" /><span>{t('game_over.menu')}</span></button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// 6. COMPONENT LEADERBOARD MODAL (Popup Bảng Xếp Hạng Top 10 & Lịch Sử)
// =============================================================================
/**
 * Hộp thoại tra cứu Bảng Xếp Hạng Top 10 hoặc Lịch sử thi đấu của người chơi qua REST API Flask
 */
export function LeaderboardModal({ onClose, rulesVersion = 'v1', offline = false, mode = 'leaderboard', playerId = '' }) {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(!offline);
  const [error, setError] = useState(offline ? t('leaderboard.offline_notice') : '');
  const [attempt, setAttempt] = useState(0);

  // Tự động gọi API khi modal mở ra
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
      .catch(() => {
        setError(t('leaderboard.fetch_error'));
        setLoading(false);
      });
  }, [rulesVersion, offline, mode, playerId, attempt, t]);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <h2 className="modal-title">{mode === 'history' ? t('leaderboard.history_title') : t('leaderboard.ranking_title')}</h2>
        {loading ? (
          <p className="modal-status">{t('common.loading')}</p>
        ) : error ? (
          <div className="modal-alert" role="alert">
            <p>{error}</p>
            {!offline && <button type="button" onClick={() => setAttempt(value => value + 1)}>{t('common.retry')}</button>}
          </div>
        ) : items.length === 0 ? (
          <p className="modal-empty">{t('leaderboard.empty_runs')}</p>
        ) : (
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>{t('leaderboard.col_rank')}</th>
                <th>{t('leaderboard.col_player')}</th>
                <th>{t('leaderboard.col_height')}</th>
                <th>{t('leaderboard.col_time')}</th>
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
          <button type="button" className="btn-secondary" onClick={onClose}>{t('common.close')}</button>
        </div>
      </div>
    </div>
  );
}
