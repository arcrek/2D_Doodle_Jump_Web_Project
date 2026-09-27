import { useState, useEffect, useCallback, useRef } from 'react';
import GameCanvas from '../components/GameCanvas.jsx';
import { TopBar, FloatingHUD, StartMenu, GameOverModal, LeaderboardModal } from '../components/HUD.jsx';
import { useBackend } from '../hooks/useBackend.js';
import { postJson } from '../services/api.js';

const EMPTY_STATS = { height: 0, maxHeight: 0, placement: 1, ranking: [] };

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
  const showLoopDemo = new URLSearchParams(window.location.search).get('demo') === 'loop';

  // Trạng thái vòng đời 5 giai đoạn: intro_title -> intro_sliding -> warmup_hop -> running -> finished / paused
  const [phase, setPhase] = useState(showLoopDemo ? 'running' : 'intro_title');
  const [stats, setStats] = useState(EMPTY_STATS);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [restartKey, setRestartKey] = useState(0);
  const [playerProfile, setPlayerProfile] = useState({ nickname: 'Bạn', skinId: 'doodle' });
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
    runRef.current = { run_id: crypto.randomUUID(), player_id: playerId(), nickname: playerProfile.nickname,
      skin_id: playerProfile.skinId, rules_version: backend.config?.rules_version || 'v1' };
    if (gameRef.current?.triggerRestartWipe) {
      gameRef.current.triggerRestartWipe();
    } else {
      setRestartKey(k => k + 1);
      setPhase('warmup_hop');
    }
  }, [backend.config, playerProfile]);

  // Xử lý khi người chơi submit StartMenu (chọn tên và skin)
  const handleStartGame = useCallback(({ nickname, skinId }) => {
    setPlayerProfile({ nickname, skinId });
    runRef.current = { run_id: crypto.randomUUID(), player_id: playerId(), nickname,
      skin_id: skinId, rules_version: backend.config?.rules_version || 'v1' };
    setSave({ status: '', message: '' });
    gameRef.current?.setPlayerName?.(nickname);
    if (gameRef.current?.setPlayerSkin) {
      gameRef.current.setPlayerSkin(skinId);
    }
    setStats(EMPTY_STATS);
    setElapsedMs(0);
    setPhase('warmup_hop');
    if (gameRef.current?.setPhase) {
      gameRef.current.setPhase('warmup_hop');
    }
  }, [backend.config]);

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

  const handleUpdateStats = useCallback(({ currentHeight, maxHeight, elapsedMs: gameElapsed, placement, ranking }) => {
    setStats({ height: currentHeight, maxHeight, placement, ranking });
    setElapsedMs(gameElapsed);
  }, []);

  const handleGameOver = useCallback(async ({ finalHeight, finalMaxHeight, elapsedMs: finalElapsed, placement, ranking, outcome, reason }) => {
    setStats({ height: finalHeight, maxHeight: finalMaxHeight, placement, ranking, outcome, reason });
    setElapsedMs(finalElapsed);
    setPhase('finished');
    const run = runRef.current;
    runRef.current = null;
    if (!run) return;
    if (backend.offline) {
      setSave({ status: 'error', message: 'Đang chơi ngoại tuyến; kết quả chưa được lưu.' });
      return;
    }
    setSave({ status: 'saving', message: 'Đang lưu kết quả…' });
    try {
      await postJson('/api/runs', { ...run, height: Math.min(backend.config.finish_height, Math.round(finalMaxHeight)),
        elapsed_ms: finalElapsed, outcome, placement });
      setSave({ status: 'saved', message: 'Đã lưu kết quả.' });
    } catch (error) {
      setSave({ status: 'error', message: `Chưa lưu được: ${error.message}` });
    }
  }, [backend.config, backend.offline]);

  const handlePhaseChange = useCallback((newPhase) => {
    setPhase(newPhase);
  }, []);

  // HUD chỉ hiển thị khi đã vào giai đoạn đua chính thức ('running')
  const isHudVisible = phase === 'running' || phase === 'paused';

  return <>
    <h1 className="game-title">Doodle Jump</h1>
    {backend.loading && <p role="status">Đang tải…</p>}
    {backend.error && <div role="alert">
      <p>Chưa tải được cấu hình game.</p>
      <button onClick={backend.retry}>Thử lại</button>
    </div>}
    {backend.config && (
      <div className="game-layout-container">
        <div className="canvas-wrapper">
          <GameCanvas
            config={backend.config}
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
              />
            </div>

            {phase === 'running' && <div className="touch-controls" aria-label="Điều khiển chạm">
              <button type="button" aria-label="Di chuyển sang trái"
                onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); gameRef.current?.setDirection('left', true); }}
                onPointerUp={() => gameRef.current?.setDirection('left', false)}
                onPointerCancel={() => gameRef.current?.setDirection('left', false)}
                onLostPointerCapture={() => gameRef.current?.setDirection('left', false)}>←</button>
              <button type="button" aria-label="Di chuyển sang phải"
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
              height={stats.height}
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
              <LeaderboardModal mode={recordMode} playerId={playerId()} onClose={() => setRecordMode(null)} rulesVersion={backend.config.rules_version} offline={backend.offline} />
            )}
          </GameCanvas>
        </div>
      </div>
    )}
  </>;
}
