from PIL import Image
import os
import glob

INPUT_FOLDER = "frames"
OUTPUT_GIF = "tutorial.gif"
DURATION = 100
LOOP = 0
RESIZE_WIDTH = 400

def frames_to_gif():
    search_path = os.path.join(INPUT_FOLDER, "*")
    files = sorted(glob.glob(search_path))
    
    img_files = [f for f in files if f.lower().endswith(('.png', '.jpg', '.jpeg'))]

    if not img_files:
        print(f"Error: No images found in {INPUT_FOLDER}")
        return

    print(f"Found {len(img_files)} images. Creating GIF...")
    
    frames = []
    for f in img_files:
        img = Image.open(f)
        
        if RESIZE_WIDTH:
            w_percent = (RESIZE_WIDTH / float(img.size[0]))
            h_size = int((float(img.size[1]) * float(w_percent)))
            img = img.resize((RESIZE_WIDTH, h_size), Image.Resampling.LANCZOS)
            
        frames.append(img)

    if frames:
        frames[0].save(
            OUTPUT_GIF,
            save_all=True,
            append_images=frames[1:],
            duration=DURATION,
            loop=LOOP,
            optimize=True
        )
        print(f"\nSuccess! GIF saved as: {os.path.abspath(OUTPUT_GIF)}")

if __name__ == "__main__":
    frames_to_gif()
