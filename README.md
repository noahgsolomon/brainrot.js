## How to run locally 👇

0. You must have docker installed on your computer (https://www.docker.com/get-started/)
1. create `generate/.env` file with the following values:

```bash
JORDAN_PETERSON_VOICE_ID=jordan-peterson
JOE_ROGAN_VOICE_ID=joe-rogan
BARACK_OBAMA_VOICE_ID=barack-obama
KAMALA_HARRIS_VOICE_ID=kamala-harris
BEN_SHAPIRO_VOICE_ID=ben-shapiro
ANDREW_TATE_VOICE_ID=andrew-tate
JOE_BIDEN_VOICE_ID=joe-biden
DONALD_TRUMP_VOICE_ID=donald-trump
GROQ_API_KEY=YOUR GROQ API KEY HERE
OPENAI_API_KEY=YOUR OPEN AI API KEY HERE
NEETS_API_KEY=YOUR NEETS API KEY HERE
```

1.5 Note, you should get the actual values for your GROQ, OPENAI, and NEETS api keys before proceeding (scroll down for links on where to get each)

2. go into generate (`cd generate`) and run `docker build -t brainrot .`. This will take 10-15 minutes, as there are a lot of dependencies.
3. now, once this docker image is successfully built, we need to run it as a container. Run this command:

```bash
docker run -d --name brainrot brainrot \
-w 1 \
-b 0.0.0.0:5000 \
--access-logfile access.log \
--error-logfile error.log \
--chdir /app/brainrot \
transcribe:app \
--timeout 120
```

4. now run `docker exec -it brainrot /bin/bash`, followed by `node localBuild.mjs`
5. when the video has been generated, exit out of the container (`cntl+d` in terminal window), and then run `docker cp brainrot:/app/brainrot/out/video.mp4 ./video.mp4`. This will output where the video is located on your computer (e.g. `Successfully copied 97.8MB to /home/noahsolomon/brainrotjs/generate/video.mp4`). Voila you just generated brainrot.
6. change the variable values at the top in localBuild.mjs to change what vidoe is generated. The video generation process can take 10-20 minutes so be patient! we are so back fam

#### how to get neets ai credentials:

- https://neets.ai/keys

#### how to get open ai credentials:

- https://platform.openai.com/api-keys

#### how to get groq api credentials:

- https://console.groq.com/keys

#### assets to download

I have removed assets for download except MINECRAFT-0.mp4 (in generate/public/background/). If you want your own GTA / Minecraft / etc. bottom half video just find some on youtube. and add the videos to generate/public/background/ folder.

#### common problems

- Dalle 3 API rate limit exceeded: this is because each dialogue transition has an image, and it is prompted to have 7 dialogue transitions. However, typical tier 1 open ai accounts can only generate 5 images per minute. You might need to reduce the # of dialog transitions if this is the case (in generate/transcript.mjs)
- You don't have enough storage (the image will be around 12.6GB)
