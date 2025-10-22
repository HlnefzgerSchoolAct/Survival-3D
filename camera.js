/**
 * Camera Controller
 * Handles first-person and third-person camera views
 */

class CameraController {
  constructor(camera, player) {
    this.camera = camera;
    this.player = player;
    this.mouseSensitivity = 0.002;
    this.pitch = 0;
    this.yaw = 0;
    this.maxPitch = Math.PI / 2 - 0.1;
    this.setupInput();
    console.log("📷 Camera initialized");
  }

  setupInput() {
    document.addEventListener("mousemove", (e) => {
      if (document.pointerLockElement) {
        this.yaw -= e.movementX * this.mouseSensitivity;
        this.pitch -= e.movementY * this.mouseSensitivity;
        this.pitch = Math.max(
          -this.maxPitch,
          Math.min(this.maxPitch, this.pitch)
        );
      }
    });
  }

  update() {
    this.camera.position.copy(this.player.position);
    this.camera.position.y += this.player.playerHeight * 0.8;
    this.camera.rotation.order = "YXZ";
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }
}
