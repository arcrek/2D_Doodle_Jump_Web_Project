import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import GameCanvas from '../components/GameCanvas.jsx';
import { TopBar, FloatingHUD, StartMenu, GameOverModal, LeaderboardModal } from '../components/HUD.jsx';
import { useBackend } from '../hooks/useBackend.js';
import { postJson } from '../services/api.js';
import { useTranslation } from '../i18n/I18nContext.jsx';

const EMPTY_STATS = { height: 0, maxHeight: 0, placement: 1, ranking: [], lavaDistance: null };

function playerId() {
  try {
    let id = localStorage.getItem('doodle-player-id');
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      id = crypto.randomUUID();
      localStorage.setItem('doodle-player-id', id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export default function GamePage() {
  const backend = useBackend();
  const { t } = useTranslation();
  const showLoopDemo = new URLSearchParams(window.location.search).get('demo') === 'loop';

  const gameConfig = useMemo(() => {
    if (!backend.config) return null;
    return {
      ...backend.config,
      isEndless: true,
      finish_height: null,
      max_duration_ms: null,
    };
  }, [backend.config]);

  // Intro: title -> slide -> first platform -> profile -> player -> platforms -> input -> race.
  const [phase, setPhase] = useState(showLoopDemo ? 'running' : 'intro_title');
  const [stats, setStats] = useState(EMPTY_STATS);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [restartKey, setRestartKey] = useState(0);
  const [playerProfile, setPlayerProfile] = useState(() => ({ nickname: t('game.default_player_name'), skinId: 'doodle' }));
  const [recordMode, setRecordMode] = useState(null);
  const [save, setSave] = useState({ status: '', message: '' });
  const gameRef = useRef(null);
  const runRef = useRef(null);

  const handleTogglePause = useCallback(() => {
    gameRef.current?.togglePause();
  }, []);

  // Hỗ trợ phím tắt ESC để Tạm dừng / Tiếp tục
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && (phase === 'running' || phase === 'paused')) {
        handleTogglePause();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, handleTogglePause]);

  // Restart với hiệu ứng Wipe Transition quét màn hình
  const handleRestart = useCallback(() => {
    setSave({ status: '', message: '' });
    runRef.current = {
      run_id: crypto.randomUUID(),
      player_id: playerId(),
      nickname: playerProfile.nickname,
      skin_id: playerProfile.skinId,
      rules_version: 'endless',
    };
    if (gameRef.current?.triggerRestartWipe) {
      gameRef.current.triggerRestartWipe();
    } else {
      setRestartKey(k => k + 1);
      setPhase('warmup_hop');
    }
  }, [playerProfile]);

  // Xử lý khi người chơi submit StartMenu (chọn tên và skin)
  const handleStartGame = useCallback(({ nickname, skinId }) => {
    setPlayerProfile({ nickname, skinId });
    runRef.current = {
      run_id: crypto.randomUUID(),
      player_id: playerId(),
      nickname,
      skin_id: skinId,
      rules_version: 'endless',
    };
    setSave({ status: '', message: '' });
    gameRef.current?.setPlayerName?.(nickname);
    if (gameRef.current?.setPlayerSkin) {
      gameRef.current.setPlayerSkin(skinId);
    }
    setStats(EMPTY_STATS);
    setElapsedMs(0);
    gameRef.current?.beginPlayerEntrance?.();
  }, []);

  // Quay về màn hình Tiêu đề Doodle trên cao
  const handleExitToMenu = useCallback(() => {
    runRef.current = null;
    setSave({ status: '', message: '' });
    setStats(EMPTY_STATS);
    setElapsedMs(0);
    setRecordMode(null);
    if (gameRef.current?.returnToTitleMenu) {
      gameRef.current.returnToTitleMenu();
    } else {
      setRestartKey(k => k + 1);
      setPhase('intro_title');
    }
  }, []);

  const handleResume = useCallback(() => {
    gameRef.current?.togglePause();
  }, []);

  const handleUpdateStats = useCallback(({ currentHeight, maxHeight, elapsedMs: gameElapsed, placement, ranking, lavaDistance }) => {
    setStats({ height: currentHeight, maxHeight, placement, ranking, lavaDistance });
    setElapsedMs(gameElapsed);
  }, []);

  const handleGameOver = useCallback(async ({ finalHeight, finalMaxHeight, elapsedMs: finalElapsed, placement, ranking, outcome, reason }) => {
    const isEndless = Boolean(gameConfig?.isEndless || gameConfig?.finish_height == null);
    const finishHeight = backend.config?.finish_height ?? 3000;
    const maxDuration = backend.config?.max_duration_ms ?? 180000;

    const achievedHeight = Math.max(0, Math.round(finalMaxHeight ?? finalHeight ?? 0));
    const validHeight = isEndless ? achievedHeight : Math.min(finishHeight, achievedHeight);
    const validOutcome = isEndless ? 'dnf' : (validHeight >= finishHeight ? 'finished' : (outcome === 'finished' ? 'finished' : 'dnf'));
    const validElapsed = Math.max(1, isEndless ? Math.round(finalElapsed || 1) : Math.min(maxDuration, Math.round(finalElapsed || 1)));
    const validPlacement = Math.max(1, Math.min(5, Math.round(placement) || 1));
    const rulesVersion = isEndless ? 'endless' : (backend.config?.rules_version || 'v1');

    setStats({ height: validHeight, maxHeight: validHeight, placement: validPlacement, ranking, outcome: validOutcome, reason });
    setElapsedMs(validElapsed);
    setPhase('finished');
    const run = runRef.current;
    runRef.current = null;
    if (!run) return;
    if (backend.offline) {
      setSave({ status: 'error', message: t('save.offline_error') });
      return;
    }
    setSave({ status: 'saving', message: t('save.saving') });
    try {
      await postJson('/api/runs', {
        ...run,
        rules_version: rulesVersion,
        height: validHeight,
        elapsed_ms: validElapsed,
        outcome: validOutcome,
        placement: validPlacement,
      });
      setSave({ status: 'saved', message: t('save.saved') });
    } catch (error) {
      setSave({ status: 'error', message: t('save.save_error', { error: error.message }) });
    }
  }, [backend.config, backend.offline, gameConfig, t]);

  const handlePhaseChange = useCallback((newPhase) => {
    setPhase(newPhase);
  }, []);

  // HUD chỉ hiển thị khi đã vào giai đoạn đua chính thức ('running')
  const isHudVisible = phase === 'running' || phase === 'paused';

  return <>
    <h1 className="game-title">Doodle Jump</h1>
    {backend.loading && <p role="status">{t('common.loading')}</p>}
    {backend.error && <div role="alert">
      <p>{t('common.config_error')}</p>
      <button onClick={backend.retry}>{t('common.retry')}</button>
    </div>}
    {backend.config && (
      <div className="game-layout-container">
        <div className="canvas-wrapper">
          <GameCanvas
            config={gameConfig}
            showLoopDemo={showLoopDemo}
            restartKey={restartKey}
            isPaused={phase === 'paused'}
            enableIntro={!showLoopDemo}
            gameRef={gameRef}
            onUpdateStats={handleUpdateStats}
            onGameOver={handleGameOver}
            onPhaseChange={handlePhaseChange}
          >
            <div className={`topbar-wrapper ${isHudVisible ? 'is-visible' : 'is-hidden'}`} aria-hidden={!isHudVisible} inert={!isHudVisible}>
              <TopBar elapsedMs={elapsedMs} phase={phase}
                onTogglePause={isHudVisible ? handleTogglePause : undefined}
                onRestart={handleRestart} onExitToMenu={handleExitToMenu} />
            </div>
            {/* Thanh HUD nổi (Điểm số, Kỷ lục, Đua top) chỉ mờ hiện khi vào 'running' */}
            <div className={`hud-floating-container ${isHudVisible ? 'is-visible' : 'is-hidden'}`} aria-hidden={!isHudVisible}>
              <FloatingHUD
                currentHeight={stats.height}
                maxHeight={stats.maxHeight}
                nickname={playerProfile.nickname}
                ranking={stats.ranking}
                lavaDistance={stats.lavaDistance}
              />
            </div>

            {(phase === 'running' || phase === 'intro_wait_input') && <div className="touch-controls" aria-label={t('aria.touch_controls')}>
              <button type="button" aria-label={t('aria.move_left')}
                onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); gameRef.current?.setDirection('left', true); }}
                onPointerUp={() => gameRef.current?.setDirection('left', false)}
                onPointerCancel={() => gameRef.current?.setDirection('left', false)}
                onLostPointerCapture={() => gameRef.current?.setDirection('left', false)}>←</button>
              <button type="button" aria-label={t('aria.move_right')}
                onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); gameRef.current?.setDirection('right', true); }}
                onPointerUp={() => gameRef.current?.setDirection('right', false)}
                onPointerCancel={() => gameRef.current?.setDirection('right', false)}
                onLostPointerCapture={() => gameRef.current?.setDirection('right', false)}>→</button>
            </div>}

            {/* Popup Chọn Tên và Skin gốc từ dev khi camera trượt xuống mặt đất */}
            {phase === 'ready' && (
              <StartMenu
                config={backend.config}
                initialNickname={playerProfile.nickname}
                initialSkin={playerProfile.skinId}
                onStartGame={handleStartGame}
                onOpenLeaderboard={() => setRecordMode('leaderboard')}
                onOpenHistory={() => setRecordMode('history')}
              />
            )}

            {/* Popup Tạm dừng / Kết thúc lượt chơi */}
            <GameOverModal
              phase={phase}
              height={stats.maxHeight || stats.height}
              elapsedMs={elapsedMs}
              nickname={playerProfile.nickname}
              placement={stats.placement}
              outcome={stats.outcome}
              reason={stats.reason}
              save={save}
              onResume={handleResume}
              onRestart={handleRestart}
              onExitToMenu={handleExitToMenu}
            />

            {recordMode && (
              <LeaderboardModal mode={recordMode} playerId={playerId()} onClose={() => setRecordMode(null)} rulesVersion={gameConfig?.isEndless ? 'endless' : (backend.config?.rules_version || 'v1')} offline={backend.offline} />
            )}
          </GameCanvas>
        </div>
      </div>
    )}
  </>;
}
