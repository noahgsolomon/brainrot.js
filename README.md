## How to run locally 👇

0. You must have docker installed on your computer (https://www.docker.com/get-started/)
1. create `generate/.env` file with the following values:

```bash
JORDAN_PETERSON_VOICE_ID=your speechify api key here
JOE_ROGAN_VOICE_ID=your speechify api key here
BARACK_OBAMA_VOICE_ID=your speechify api key here
KAMALA_HARRIS_VOICE_ID=your speechify api key here
BEN_SHAPIRO_VOICE_ID=your speechify api key here
ANDREW_TATE_VOICE_ID=your speechify api key here
JOE_BIDEN_VOICE_ID=your speechify api key here
DONALD_TRUMP_VOICE_ID=your speechify api key here
GROQ_API_KEY=YOUR GROQ API KEY HERE
OPENAI_API_KEY=YOUR OPEN AI API KEY HERE
SPEECHIFY_API_KEY=YOUR SPEECHIFY API KEY HERE
```

1.5 Note, you should get the actual values for your GROQ, OPENAI, and SPEECHIFY api keys before proceeding (scroll down for links on where to get each)
<br/>
2. go into generate (`cd generate`) and run `chmod +x scripts/start.sh`, and `chmod +x scripts/build.sh`. This will make the scripts executable.
<br/>
3. now run `./scripts/build.sh` to build the docker image. This will take 5-15 minutes, as there are a lot of dependencies. The image is around 5.5GB.
<br/>
4. now run `bun install` in ./generate
<br/>
5. you can now run `./scripts/start.sh` to start the container. There are two modes you can run. regular mode and studio mode. Regular mode executes the localBuild.ts script, and outputs a video in the out directory. Studio mode executes the localBuild.ts script, but doesn't render the video. Instead, it generates the necessary audio and context files for the video, and runs `bun run start` outside of the container. This allows you to edit the actual video code (in `src/Composition.tsx`).in real-time and have it update on the spot. To run in studio mode, run `MODE=studio ./scripts/start.sh`. To run in regular mode, run `./scripts/start.sh`. In order to change what video is generated, you can change the variable values at the top in localBuild.ts. The video generation process can take 10-20 minutes so be patient!
<br/>
6. Voila! You just made brainrot

#### how to get speechify credentials:

- https://speechify.com/text-to-speech-api/

from above, get api access by signing up, and then get audio from trump, joe, etc. from the training_audio/ folder to train your own voices for these characters on your speechify account

#### how to get open ai credentials:

- https://platform.openai.com/api-keys

#### how to get groq api credentials:

- https://console.groq.com/keys

#### common problems
- You don't have enough storage (the image will be around 12.6GB)
```

(note: you can run rap mode, but I don't yet cover in this readme how to. You can dig in yourself but i will be adding documentation on how to in this readme later)
