## How to run locally 👇

1. go into generate (`cd generate`) and run `python3 -m venv venv`, then `source venv/bin/activate`, and then `pip install -r requirements.txt`
2. now we can start the flask server. to do this run `python3 transcribe.py`
3. set all environment variables in `.env.example` in `.env` with your own values.
4. we should now install the js deps with `npm i`.
5. inside generate/public/background, we must have the background video assets. At the bottom of this readme is the list of all the assets from a s3 bucket to download. Put all the videos in generate/public/background
6. now, run `node localBuild.mjs` and boom, a video locally generated in no time (actually in some time, 5-7 minutes typically)!

note: you need to create your own eleven labs voices and copy their voice id's. If you want to use Joe Rogan, Jordan Peterson, Barack Obama, and Ben Shapiro's voice you can go into `generate/voice_training_audio` to find the mp3 files to train your eleven labs voices with.

#### how to get google credentials:

_this is probably the most complex api to get set up, so if you want to be able to generate videos with ai images instead of google fetched images, you only need open ai api credentials, and not google credentials_

- https://developers.google.com/custom-search/v1/introduction/
- https://programmablesearchengine.google.com/controlpanel/all

#### how to get eleven labs credentials:

- https://elevenlabs.io/app/voice-library

#### how to get open ai credentials:

- https://platform.openai.com/api-keys

#### how to get groq api credentials:

- https://console.groq.com/keys

<h1>Video explaining how to run 👇 locally</h1>

[![Thumbnail](https://github.com/noahgsolomon/brainrot.js/assets/111200060/edab5792-6c04-4355-8e89-dc61ad16cbdf)](https://www.youtube.com/watch?v=-Ff0xG1eNjw)

#### assets to download

put these assets in public/generate/background with the same name they have:
https://brainrotbackground.s3.amazonaws.com/GTA-1.mp4
https://brainrotbackground.s3.amazonaws.com/GTA-2.mp4
https://brainrotbackground.s3.amazonaws.com/GTA-3.mp4
https://brainrotbackground.s3.amazonaws.com/GTA-4.mp4
https://brainrotbackground.s3.amazonaws.com/GTA-5.mp4
https://brainrotbackground.s3.amazonaws.com/GTA-6.mp4
https://brainrotbackground.s3.amazonaws.com/GTA-7.mp4
https://brainrotbackground.s3.amazonaws.com/GTA-8.mp4
https://brainrotbackground.s3.amazonaws.com/GTA-9.mp4
https://brainrotbackground.s3.amazonaws.com/MINECRAFT-0.mp4
https://brainrotbackground.s3.amazonaws.com/MINECRAFT-1.mp4
https://brainrotbackground.s3.amazonaws.com/MINECRAFT-2.mp4
https://brainrotbackground.s3.amazonaws.com/MINECRAFT-3.mp4
https://brainrotbackground.s3.amazonaws.com/MINECRAFT-4.mp4
https://brainrotbackground.s3.amazonaws.com/MINECRAFT-5.mp4
https://brainrotbackground.s3.amazonaws.com/MINECRAFT-6.mp4
https://brainrotbackground.s3.amazonaws.com/MINECRAFT-7.mp4
https://brainrotbackground.s3.amazonaws.com/MINECRAFT-8.mp4
https://brainrotbackground.s3.amazonaws.com/MINECRAFT-9.mp4
https://brainrotbackground.s3.amazonaws.com/TRUCK-0.mp4
https://brainrotbackground.s3.amazonaws.com/TRUCK-1.mp4
https://brainrotbackground.s3.amazonaws.com/TRUCK-2.mp4
https://brainrotbackground.s3.amazonaws.com/TRUCK-3.mp4
https://brainrotbackground.s3.amazonaws.com/TRUCK-4.mp4
https://brainrotbackground.s3.amazonaws.com/TRUCK-5.mp4
https://brainrotbackground.s3.amazonaws.com/TRUCK-6.mp4
https://brainrotbackground.s3.amazonaws.com/TRUCK-7.mp4
https://brainrotbackground.s3.amazonaws.com/TRUCK-8.mp4
https://brainrotbackground.s3.amazonaws.com/TRUCK-9.mp4

#### common problems

- FFMPEG is not installed.
- You don't have the flask python server running (or not on port 5000)
- Dalle 3 API rate limit exceeded: this is because each dialogue transition has an image, and it is prompted to have 7 dialogue transitions. However, typical tier 1 open ai accounts can only generate 5 images per minute.
- You don't have folders public/srt and public/voice and src/tmp
- You have concurrency set too high for your computer (check remotion.config.ts)
