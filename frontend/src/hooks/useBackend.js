import { useEffect, useState } from 'react';
import { getJson } from '../services/api.js';

export function useBackend() {
  const [result, setResult] = useState({ loading: true, error: '', config: null, offline: false });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setResult({ loading: true, error: '', config: null, offline: false });
    getJson('/api/config', { signal: controller.signal }).then(config => {
      if (!controller.signal.aborted) setResult({ loading: false, error: '', config, offline: false });
    }).catch(error => {
      if (!controller.signal.aborted) {
        // Fallback default config để game chạy độc lập mượt mà không bắt buộc có Flask backend
        setResult({
          loading: false,
          error: '',
          offline: true,
          config: {
            rules_version: 'v1',
            finish_height: 3000,
            max_duration_ms: 180000,
            cameraRatio: 0.60,
            gravity: 1200,
            jumpVelocity: -520,
            skins: [
              { id: 'doodle', name: 'Vàng cổ điển', sprite: '/images/skins/doodle.svg' },
              { id: 'red', name: 'Đỏ rực', sprite: '/images/skins/red.svg' },
              { id: 'purple', name: 'Tím mộng mơ', sprite: '/images/skins/purple.svg' },
              { id: 'blue', name: 'Xanh bầu trời', sprite: '/images/skins/blue.svg' },
              { id: 'gray', name: 'Xám tinh nghịch', sprite: '/images/skins/gray.svg' },
            ]
          }
        });
      }
    });
    return () => controller.abort();
  }, [attempt]);
  return { ...result, retry: () => setAttempt(previous => previous + 1) };
}
