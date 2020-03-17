FROM node:12-alpine as builder

WORKDIR /app

COPY package.json ./
COPY yarn.lock ./
RUN yarn install --prod

COPY . .

RUN rm yarn.lock


FROM blackholegalaxy/rancher-cli:2.3.2-3

ENV NODE_ENV production

RUN mkdir ~/.rancher

WORKDIR /app

COPY --from=builder /app/ .

ENTRYPOINT ["node", "app.js"]
CMD ["--help"]
