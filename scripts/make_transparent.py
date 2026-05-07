import cv2
import numpy as np
import os

def make_transparent():
    input_path = r""
    output_path = r""
    
    if not os.path.exists(input_path):
        print(f"Error: {input_path} not found.")
        return

    img = cv2.imread(input_path)
    if img is None:
        print("Error: Could not read image.")
        return

    bgra = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)

    lower = np.array([0, 0, 0, 0])
    upper = np.array([45, 45, 45, 255])
    
    mask = cv2.inRange(img, np.array([0,0,0]), np.array([45,45,45]))
    
    bgra[mask > 0, 3] = 0
    bgra = cv2.flip(bgra, 1)

    cv2.imwrite(output_path, bgra)
    print(f"Success! Created {output_path}")

if __name__ == "__main__":
    make_transparent()
