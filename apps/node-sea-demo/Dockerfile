# Run the container with `docker run -p 3000:3000 -t node-sea-demo:regular`.
FROM docker.io/node:lts-alpine

ENV HOST=0.0.0.0
ENV PORT=3000

WORKDIR /app

RUN addgroup --system node-sea-demo && \
  adduser --system -G node-sea-demo node-sea-demo

COPY dist/apps/node-sea-demo node-sea-demo/
RUN chown -R node-sea-demo:node-sea-demo .

# no need for npm install, it's already done when bundling the app with esbuild
# RUN npm --prefix node-sea-demo --omit=dev -f install

CMD [ "node", "node-sea-demo" ]
