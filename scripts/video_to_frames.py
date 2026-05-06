import cv2
import os

VIDEO_PATH = "input.mp4"
OUTPUT_FOLDER = "frames"
FRAME_STEP = 1
USE_CENTRAL_CROP = True

def video_to_frames():
    if not os.path.exists(OUTPUT_FOLDER):
        os.makedirs(OUTPUT_FOLDER)
        print(f"Created folder: {OUTPUT_FOLDER}")

    cap = cv2.VideoCapture(VIDEO_PATH)
    if not cap.isOpened():
        print(f"Error: Could not open video {VIDEO_PATH}")
        return

    count = 0
    saved_count = 0

    print("Starting processing...")
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        if count % FRAME_STEP == 0:
            if USE_CENTRAL_CROP:
                gap = 130
                h, w = frame.shape[:2]
                min_dim = min(h, w)
                start_x = (w - min_dim) // 2 + gap
                start_y = (h - min_dim) // 2 + gap
                frame = frame[start_y:start_y+min_dim - gap*2, start_x:start_x+min_dim-gap*2]
            filename = os.path.join(OUTPUT_FOLDER, f"frame_{saved_count:04d}.jpg")
            cv2.imwrite(filename, frame)
            saved_count += 1
            if saved_count % 10 == 0:
                print(f"Saved {saved_count} frames...")
            
        count += 1

    cap.release()
    print(f"\nDone! Total frames saved: {saved_count}")
    print(f"Files are in: {os.path.abspath(OUTPUT_FOLDER)}")

if __name__ == "__main__":
    video_to_frames()
