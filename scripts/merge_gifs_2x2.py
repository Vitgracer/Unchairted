from PIL import Image
import os

def merge_gifs_2x2(gif_paths, output_path, target_size=None, duration=None, border_width=2, border_color=(255, 255, 255, 255)):
    gifs = [Image.open(p) for p in gif_paths]
    n_frames = max(g.n_frames for g in gifs)
    
    if target_size is None:
        target_size = gifs[0].size
    
    w, h = target_size
    grid_w = w * 2 + border_width
    grid_h = h * 2 + border_width
    
    if duration is None:
        duration = gifs[0].info.get('duration', 100)
    
    combined_frames = []
    
    for i in range(n_frames):
        grid_frame = Image.new('RGBA', (grid_w, grid_h), color=border_color)
        
        for idx, gif in enumerate(gifs):
            gif.seek(i % gif.n_frames)
            frame = gif.convert('RGBA')
            if frame.size != target_size:
                frame = frame.resize(target_size, Image.Resampling.LANCZOS)
            
            x = (idx % 2) * (w + border_width)
            y = (idx // 2) * (h + border_width)
            grid_frame.paste(frame, (x, y))
            
        combined_frames.append(grid_frame)
        
    if combined_frames:
        first_frame = combined_frames[0].convert('P', palette=Image.Palette.ADAPTIVE)
        other_frames = [f.convert('P', palette=Image.Palette.ADAPTIVE) for f in combined_frames[1:]]
        
        first_frame.save(
            output_path,
            save_all=True,
            append_images=other_frames,
            duration=duration,
            loop=0,
            optimize=True
        )
        print(f"Ready: {os.path.abspath(output_path)}")

    for g in gifs:
        g.close()

if __name__ == "__main__":
    GIFS = [
        r"C:\Users\vsgsa\Desktop\V\projects\browser-pose-estimation\Unchair\assets\gifs\calibration\calibration.gif",
        r"C:\Users\vsgsa\Desktop\V\projects\browser-pose-estimation\Unchair\assets\gifs\gameplay_buble_hunter\gameplay_buble_hunter.gif",
        r"C:\Users\vsgsa\Desktop\V\projects\browser-pose-estimation\Unchair\assets\gifs\spawn_busket\spawn_busket.gif",
        r"C:\Users\vsgsa\Desktop\V\projects\browser-pose-estimation\Unchair\assets\gifs\gameplay_egg_catcher\gameplay_egg_catcher.gif",
    ]
    OUTPUT = r"C:\Users\vsgsa\Desktop\V\projects\browser-pose-estimation\Unchair\assets\gifs\merged_2x2.gif"

    merge_gifs_2x2(GIFS, OUTPUT)