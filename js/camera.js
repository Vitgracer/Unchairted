export async function initCamera(videoElement) {
    try {
        let stream;
        try {
            // Try with ideal constraints first
            stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });
        } catch (e) {
            console.warn('Ideal constraints failed, falling back to basic video', e);
            // Fallback to basic video
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }

        videoElement.srcObject = stream;
        await videoElement.play();
        return stream;
    } catch (err) {
        console.error('Camera Error:', err);
        throw err;
    }
}

export function handleResize(video, canvas) {
    const vWidth = video.videoWidth;
    const vHeight = video.videoHeight;

    if (vWidth === 0 || vHeight === 0) return;

    // Match canvas to video aspect ratio and scale to fit window
    const winWidth = window.innerWidth;
    const winHeight = window.innerHeight;
    const videoAspect = vWidth / vHeight;
    const winAspect = winWidth / winHeight;

    let targetWidth, targetHeight;
    if (winAspect > videoAspect) {
        targetHeight = winHeight * 0.9;
        targetWidth = targetHeight * videoAspect;
    } else {
        targetWidth = winWidth * 0.9;
        targetHeight = targetWidth / videoAspect;
    }

    canvas.width = vWidth;
    canvas.height = vHeight;
    video.width = vWidth;
    video.height = vHeight;

    canvas.style.width = `${targetWidth}px`;
    canvas.style.height = `${targetHeight}px`;
    video.style.width = `${targetWidth}px`;
    video.style.height = `${targetHeight}px`;
}
