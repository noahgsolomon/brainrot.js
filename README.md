## How to run locally 👇

1. go into generate (```cd generate```) and run ```python3 -m venv venv```, then ```source venv/bin/activate```, and then ```pip install -r requirements.txt```
2. now we can start the flask server. to do this run ```python3 transcribe.py```
3. set all environment variables in ```.env.example``` in ```.env``` with your own values.
4. we should now install the js deps with ```bun i```.
5. now, run ```node localBuild.mjs``` and boom, a video locally generated in no time (actually in some time, 5-7 minutes typically)!

note: you need to create your own eleven labs voices and copy their voice id's. If you want to use Joe Rogan, Jordan Peterson, Barack Obama, and Ben Shapiro's voice you can go into ```generate/voice_training_audio``` to find the mp3 files to train your eleven labs voices with.

#### how to get google credentials:
- https://developers.google.com/custom-search/v1/introduction/
- https://programmablesearchengine.google.com/controlpanel/all

#### how to get eleven labs credentials:
- https://elevenlabs.io/app/voice-library

#### how to get open ai credentials:
- https://platform.openai.com/api-keys

https://github.com/noahgsolomon/brainrot.js/assets/111200060/db1e60c4-2db9-48c5-9826-38c7b5112b4b





