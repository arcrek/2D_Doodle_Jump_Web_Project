// PHYS-02 · Hoàng Hải Minh (sau PHYS-01)
// Chỉ tiếp đất khi đang rơi, chân vượt mặt bệ và chồng lấn theo ngang.
export function checkAABB(rect1, rect2) {
  return (
    rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.height &&
    rect1.y + rect1.height > rect2.y
  );
}

export function isLandingOnPlatform(player, platform) {
  return player.vy > 0 && Number.isFinite(player.prevY) &&
    player.x < platform.x + platform.width && player.x + player.width > platform.x &&
    player.prevY + player.height <= platform.y && player.y + player.height >= platform.y;
}
