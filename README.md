By Noah Solomon

The purpose of this project, [brainrot.js](https://brainrotjs.com) was to provide a seamless way to generate a short form video on any topic from multiple interesting personalities to extend my pursuit of making education more fun, intuitive, and absurd.

We used various tools from the front to backend:

front end: Next.js, tailwind.css, tRPC, express.
backend: Docker, Express, PyTorch, Python, Flask, NodeJS, Remotion, OpenAI API, ElevenLabs API, Google Oauth, Google Custom Search Engine.
architecture: CloudFront, S3, Lambda, EC2, Vercel.

I ran into a ton of weird challenges. GLIBC incompatibility issues, rendering times of 8-15 mins (which is why I had to opt into using serverless parallelized computing, reducing it to 1 minute rendering!). Also, designing the whole rather complex architecture was quite the can of worms. Also, enforcing the google custom search engine to only return images which are publicly available was quite hard, but crucial as this is executed after much expensive laborious computation like transcript generation, audio subtitle inference generation, and more, so it is crucial it never becomes the bottleneck.

Public API's we used: Google Custom Search Engine API, OpenAI API, ElevelLabs API, AWS NodeJS SDK.
