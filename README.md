![Visits](https://api.visitorbadge.io/api/VisitorHit?user=Vitgracer&repo=Unchairted&countColor=%237B1E7A&style=flat-square)
![Last Commit](https://img.shields.io/github/last-commit/Vitgracer/Unchairted?color=4C6EF5&label=Last%20Commit&style=flat-square)
![Repo Size](https://img.shields.io/github/repo-size/Vitgracer/Unchairted?color=2FBF71&label=Repo%20Size&style=flat-square)
![Stars](https://img.shields.io/github/stars/Vitgracer/Unchairted?color=F59F00&label=Stars&style=flat-square)
![Forks](https://img.shields.io/github/forks/Vitgracer/Unchairted?color=E03131&label=Forks&style=flat-square)


# 🪑 UNCHAIRTED: Stop Sitting

<p align="left">
  <a href="https://vitgracer.github.io/Unchairted/" target="_blank">
    <img src="https://img.shields.io/badge/🎮%20PLAY%20UNCHAIRTED%20NOW-Click%20Here%20to%20Start%20⚡-success?style=for-the-badge&logo=google-chrome&logoColor=white&color=FF5733&labelColor=1E1E24" alt="Play Unchairted Now" height="50"/>
  </a>
</p>

![Unchairted Banner](assets/logo_cut.png)

### 💬 Around 60–80% of office workers report back or neck pain related to prolonged computer use.

## 🎯 The Motivation
You're a developer, a designer, or some other flavor of "desk-bound professional." You spend **12+** hours a day glued to your chair. By the time you stand up, your spine feels like a bag of dry spaghetti that’s been stepped on.

Sure, you *could* do some "boring" stretches. But as a Computer Vision engineer, I figured: why settle for boring when I can turn my webcamera into a personal trainer that judges my reflexes? 

That’s how **UNCHAIRTED** was born. It’s not just a game; it’s an intervention for your posture.

## 💀 The "Sitting is Killing You" Part
This isn't just me being dramatic. According to the [**Mayo Clinic**](https://sportsmedicine.mayoclinic.org/news/risks-of-sitting-too-much/), sitting for more than 8 hours a day with no physical activity carries a risk of death similar to that of **obesity and smoking**. 

Your chair is basically a slow-motion trap. **Don't let it win.** 🪑❌

## 🎮 What we’re offering
UNCHAIRTED is a web-based movement game that turns your body into the **controller**. 
*   **100% Local**: No servers, no data-storing, no "we're watching you." All processing happens in your browser via MediaPipe.
*   **Zero Install**: If you have a browser, you have a gym.
*   **High Energy**: All you need is a webcam and a pair of headphones for the sick beats.

<p align="left">
  <img src="assets/body_controller.png" width="90%" />
</p>

## 🔍 Calibration: Set Up for Success
Before jumping into any game, you need to calibrate the pose tracking system. This ensures that the model accurately maps your body parts and alignment zones.

1. **Step Back**: Place your webcam so it can capture your entire upper body (ideally from head to hips).
2. **Align the Targets**: Stand in the frame and match your head, hands, and hips with the respective circular target zones on the screen.
3. **Hold Still**: Hold your position until the indicators turn green and you see the glowing **PASSED** message.

<p align="left">
  <img src="assets/gifs/calibration/calibration.gif" width="50%" alt="Calibration Guide" />
</p>

### Game Modes (More coming soon!)

#### 🧼 Mode 1: Bubble Hunter
The sky is falling, and it's made of soap. 
*   **The Goal**: Pop as many bubbles as you can with your hands.
*   **The Catch**: If they fly past you, you lose points. 
*   **The Threat**: A giant red laser will occasionally sweep the screen. If you don't **DUCK**, you lose 50 points and your dignity. 
*   **Scoring**: Pop = +10 | Miss = -10 | Laser Hit = -50.

<p align="left">
  <img src="assets/gifs/gameplay_buble_hunter/gameplay_buble_hunter.gif" width="50%" alt="Bubble Hunter Gameplay" />
</p>

#### 🥚 Mode 2: Egg Catcher
Remember that classic handheld game where the wolf catches eggs? (Yeah, the Soviet "Nu, Pogodi!" one). It’s that, but you're the wolf.
*   **The Goal**: Use your hands to control a virtual basket and catch eggs falling from four different chutes.
*   **The Catch**: Eggs are fragile. If they hit the floor, it’s a mess and a penalty.
*   **Scoring**: Catch = +10 | Break = -10.

<p align="left">
  <img src="assets/gifs/spawn_busket/spawn_busket.gif" width="40%" />
  <img src="assets/gifs/gameplay_egg_catcher/gameplay_egg_catcher.gif" width="40%" />
</p>

#### 🏍️ Mode 3: Gravity Denied
A tribute to the legendary side-scrolling trials game, now controlled by your body!
*   **The Goal**: Ride your motorcycle across a procedurally generated landscape. Keep your shoulders parallel to the road slope to maintain max speed.
*   **The Catch**: Aligning your shoulders with the slope accelerates your bike. If your posture is off, the brakes lock up! Also, watch out for sudden pits in the road — you must perform a quick physical **JUMP** to fly over them.
*   **HUD Gauges**: Includes a real-time Leaning HUD Dial comparing your shoulder angle to the road's current slope, a speedometer (KM/H), and a dynamic JUMP LINE overlay.
*   **Scoring**: Distance Ridden = +10 PTS / 10m | Perfect Slope Leaning = +5 XP/s | Crash (hitting a pit) = -50 PTS.

<p align="left">
  <img src="assets/gifs/gravity_denied_gameplay/tutorial.gif" width="50%" alt="Gravity Denied Gameplay" />
</p>

## 🩺 The Health Check (Muscle Map)
Playing this isn't just for points; it's for your gains.

| Mode | Muscles Worked | 
|------|----------------|
| **Bubble Hunter** | Deltoids, Traps, Obliques, Quads/Glutes | 
| **Egg Catcher** | Reflexes, Core Stability, Lower Body, Lower Back | 
| **Gravity Denied** | Obliques (side-leaning), Core stability, Quads/Calves/Glutes (jumping), Neck/Upper Back |

> [!TIP]
> It's basically a HIIT session disguised as a browser game. Great for kids too — keeps them moving instead of slouching!


## 💎 Why you’ll love it
1.  **Privacy**: Your video stream stays on your machine. Period.
2.  **Simplicity**: Open the link, hit play, start sweating.
3.  **It’s actually fun**: Way better than a "time to stand up" popup notification.
4.  **Back Health**: Your spine will thank you (eventually).

## 🚀 How to run it locally
Want to try it out on your machine? It's easier than centering a div.

1.  Clone the repo.
2.  Run a local server:
    ```bash
    python -m http.server 8000
    ```
3.  Open your browser and go to:
    `http://localhost:8000`

## ⭐ Show some love!
If this project helps your back feel even 1% less like a pretzel, please **give it a star on GitHub!** It keeps me motivated to add more modes and features. ⭐⭐⭐

## 🎵 Credits
Massive shoutout to [Pixabay](https://pixabay.com/) for the awesome tracks and sound effects that make the game feel alive.

---
*Stop sitting. Start moving. Be Unchairted.* ⚡
