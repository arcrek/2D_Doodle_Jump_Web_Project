import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createInput } from '../game/input.js';

describe('createInput (FE-01)', () => {
  let input;

  afterEach(() => {
    if (input) {
      input.destroy();
      input = null;
    }
  });

  it('khởi tạo với trạng thái ban đầu left = false, right = false', () => {
    input = createInput(window);
    expect(input.state.left).toBe(false);
    expect(input.state.right).toBe(false);
  });

  it('nhấn và thả phím A hoặc ArrowLeft để bật/tắt left', () => {
    input = createInput(window);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    expect(input.state.left).toBe(true);

    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'a' }));
    expect(input.state.left).toBe(false);

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft' }));
    expect(input.state.left).toBe(true);

    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowLeft' }));
    expect(input.state.left).toBe(false);
  });

  it('nhấn và thả phím D hoặc ArrowRight để bật/tắt right', () => {
    input = createInput(window);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' }));
    expect(input.state.right).toBe(true);

    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'd' }));
    expect(input.state.right).toBe(false);

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight' }));
    expect(input.state.right).toBe(true);

    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowRight' }));
    expect(input.state.right).toBe(false);
  });

  it('giữ cả A và ArrowLeft, chỉ khi thả hết mới tắt left', () => {
    input = createInput(window);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft' }));
    expect(input.state.left).toBe(true);

    // Thả A: vẫn còn giữ ArrowLeft nên left vẫn là true
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'a' }));
    expect(input.state.left).toBe(true);

    // Thả nốt ArrowLeft: left thành false
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowLeft' }));
    expect(input.state.left).toBe(false);
  });

  it('giữ cả D và ArrowRight, chỉ khi thả hết mới tắt right', () => {
    input = createInput(window);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight' }));
    expect(input.state.right).toBe(true);

    // Thả D: vẫn còn giữ ArrowRight nên right vẫn là true
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'd' }));
    expect(input.state.right).toBe(true);

    // Thả nốt ArrowRight: right thành false
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowRight' }));
    expect(input.state.right).toBe(false);
  });

  it('nhấn cả trái lẫn phải thì cả state.left và state.right đều bật', () => {
    input = createInput(window);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' }));
    expect(input.state.left).toBe(true);
    expect(input.state.right).toBe(true);
  });

  it('Alt+Tab (sự kiện blur) xóa trạng thái phím đang giữ', () => {
    input = createInput(window);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' }));
    expect(input.state.left).toBe(true);
    expect(input.state.right).toBe(true);

    // Giả lập Alt+Tab chuyển cửa sổ
    window.dispatchEvent(new Event('blur'));
    expect(input.state.left).toBe(false);
    expect(input.state.right).toBe(false);

    // Sau khi blur, bấm phím lại vẫn nhận bình thường
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    expect(input.state.left).toBe(true);
  });

  it('destroy() gỡ bỏ listener và xóa trạng thái', () => {
    input = createInput(window);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    expect(input.state.left).toBe(true);

    input.destroy();
    expect(input.state.left).toBe(false);
    expect(input.state.right).toBe(false);

    // Phát sự kiện mới sau khi destroy không làm đổi trạng thái
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    expect(input.state.left).toBe(false);
  });

  it('hỗ trợ truyền custom target thay vì window mặc định', () => {
    const target = new EventTarget();
    input = createInput(target);

    target.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    expect(input.state.left).toBe(true);

    target.dispatchEvent(new Event('blur'));
    expect(input.state.left).toBe(false);
  });
});
