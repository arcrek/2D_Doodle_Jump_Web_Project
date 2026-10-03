import { useState } from 'react';
import { TITLE_LOGO } from '../game/title-logo.js';
import { TITLE_LOGO_PATH } from '../game/sprites.js';

export default function TitleLogo() {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  if (failed) return <>★ USTH WEB PROJECT ★<br />DOODLE JUMP</>;
  return <>
    {!loaded && <>★ USTH WEB PROJECT ★<br />DOODLE JUMP</>}
    <svg className="menu-title-logo" viewBox={TITLE_LOGO.bounds.join(' ')} style={loaded ? undefined : { display: 'none' }}
    role="img" aria-label="DOODLE JUMP — USTH WEB PROJECT">
    {TITLE_LOGO.layers.map(({ name, rect: [x, y, width, height] }) => (
      <svg key={name} className={`title-logo-layer title-logo-${name}`} x={x} y={y} width={width} height={height}
        viewBox={`${x} ${y} ${width} ${height}`} overflow="hidden" aria-hidden="true">
        <image href={TITLE_LOGO_PATH} width={TITLE_LOGO.width} height={TITLE_LOGO.height}
          onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />
      </svg>
    ))}
  </svg></>;
}
