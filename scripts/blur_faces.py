import cv2
import numpy as np

input_video_path = r""
output_video_path = r""

MODEL_PROTO = r""
MODEL_WEIGHTS = r""

def blur_faces(video_path: str, output_path: str, blur_size: int = 51):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise FileNotFoundError(f"Cannot open video: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS)
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    out = cv2.VideoWriter(output_path, cv2.VideoWriter_fourcc(*"mp4v"), fps, (w, h))

    SCALE = 2
    sw, sh = w // SCALE, h // SCALE  # downscaled dimensions

    net = cv2.dnn.readNetFromCaffe(MODEL_PROTO, MODEL_WEIGHTS)

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        small_frame = cv2.resize(frame, (sw, sh))
        blob = cv2.dnn.blobFromImage(small_frame, 1.0, (300, 300), (104.0, 177.0, 123.0), swapRB=False, crop=False)
        net.setInput(blob)
        detections = net.forward()

        for i in range(detections.shape[2]):
            confidence = detections[0, 0, i, 2]
            if confidence < 0.15:
                continue

            box = detections[0, 0, i, 3:7] * np.array([sw, sh, sw, sh])
            sx, sy, ex, ey = box.astype(int)
            sfw, sfh = ex - sx, ey - sy

            # Upscale coordinates to original resolution
            x = int(sx * SCALE)
            y = int(sy * SCALE)
            fw = int(sfw * SCALE)
            fh = int(sfh * SCALE)

            center = (x + fw // 2, y + fh // 2)
            axes = (fw // 2, fh // 2)
            mask = np.zeros(frame.shape[:2], dtype=np.uint8)
            cv2.ellipse(mask, center, axes, 0, 0, 360, 255, -1)
            blurred = cv2.GaussianBlur(frame, (blur_size, blur_size), 0)
            frame = np.where(mask[:, :, None] == 255, blurred, frame)

        out.write(frame)

    cap.release()
    out.release()
    print(f"Saved to {output_path}")

if __name__ == "__main__":
    blur_faces(input_video_path, output_video_path)
