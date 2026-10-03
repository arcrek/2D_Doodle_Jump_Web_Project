// FE-01 · Duc Duong Minh

function getLeftKeyId(event) {
  if (event.code === 'KeyA' || event.key === 'a' || event.key === 'A') return 'a';
  if (event.code === 'ArrowLeft' || event.key === 'ArrowLeft') return 'arrowleft';
  return null;
}

function getRightKeyId(event) {
  if (event.code === 'KeyD' || event.key === 'd' || event.key === 'D') return 'd';
  if (event.code === 'ArrowRight' || event.key === 'ArrowRight') return 'arrowright';
  return null;
}

export function createInput(target = (typeof window !== 'undefined' ? window : null)) {
  const state = {
    left: false,
    right: false,
  };

  const leftKeys = new Set();
  const rightKeys = new Set();

  function onKeyDown(event) {
    const leftId = getLeftKeyId(event);
    if (leftId) {
      leftKeys.add(leftId);
      state.left = true;
    }

    const rightId = getRightKeyId(event);
    if (rightId) {
      rightKeys.add(rightId);
      state.right = true;
    }
  }

  function onKeyUp(event) {
    const leftId = getLeftKeyId(event);
    if (leftId) {
      leftKeys.delete(leftId);
      state.left = leftKeys.size > 0;
    }

    const rightId = getRightKeyId(event);
    if (rightId) {
      rightKeys.delete(rightId);
      state.right = rightKeys.size > 0;
    }
  }

  function onBlur() {
    leftKeys.clear();
    rightKeys.clear();
    state.left = false;
    state.right = false;
  }

  if (target && typeof target.addEventListener === 'function') {
    target.addEventListener('keydown', onKeyDown);
    target.addEventListener('keyup', onKeyUp);
    target.addEventListener('blur', onBlur);
  }

  function destroy() {
    if (target && typeof target.removeEventListener === 'function') {
      target.removeEventListener('keydown', onKeyDown);
      target.removeEventListener('keyup', onKeyUp);
      target.removeEventListener('blur', onBlur);
    }
    leftKeys.clear();
    rightKeys.clear();
    state.left = false;
    state.right = false;
  }

  return {
    state,
    destroy,
  };
}
