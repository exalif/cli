FROM blackholegalaxy/rancher-cli:2.3.2
LABEL maintainer="exalif"

ENV NODE_ENV production

WORKDIR /app

RUN mkdir ~/.rancher

COPY package.json ./
COPY yarn.lock ./
RUN yarn install --prod

COPY . .

RUN rm yarn.lock

ENTRYPOINT ["node", "app.js"]
CMD ["--help"]
