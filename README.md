Generate YouTube Shorts and short form content entirely automated. To run this locally, look into the generate/ folder. The build.mjs file is the one you must run to generate the videos.

## How to run locally 👇

1. go into generate (```cd generate```) and run ```python3 -m venv venv```, then ```source venv/bin/activate```, and then ```pip install -r requirements.txt```
2. now we can start the flask server. to do this run ```python3 transcribe.py```
3. set all environment variables in ```.env.example``` in ```.env``` with your own values.
5. we should now install the js deps with ```bun i```.
6. now, run ```node localBuild.mjs``` and boom, a video locally generated in no time (actually in some time, 5-7 minutes typically)!

https://github.com/noahgsolomon/brainrot.js/assets/111200060/db1e60c4-2db9-48c5-9826-38c7b5112b4b





