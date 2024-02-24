Generate YouTube Shorts and short form content entirely automated. To run this locally, look into the generate/ folder. The build.mjs file is the one you must run to generate the videos.

Below is a video demonstrating this project in use on [brainrotjs.com](https://brainrotjs.com).

https://github.com/noahgsolomon/brainrot.js/assets/111200060/023c83f8-e88d-4d79-be10-346862f223e2

## How to run locally

go to /generate, and you'll notice the .env.example file. Create a .env file with those variables setting them to your appropriate values. 

Watch the lambda remotion youtube video playlist if you would like to like me, render the videos through lambda functions, but if not, it is easy to render them on your device instead (but running on lambda is like 50x's faster).

Now you simply install dependencies with npm install and then run 'node build.mjs' which is like the heart of the generation, and it should take 1.5-2 minutes till it returns the s3 link to your newly created video!



