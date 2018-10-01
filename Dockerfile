FROM alpine:3.7

WORKDIR "/tmp"

RUN apk add --update git nodejs nodejs-npm && \
  git clone https://github.com/royhills/arp-scan.git && \
  cd ./arp-scan && \
  apk add --update autoconf automake gcc alpine-sdk libpcap libpcap-dev && \
  autoreconf --install && \
  ./configure && \
  make && \
  make install;

WORKDIR "/app"
ADD . /app

EXPOSE 3001/tcp

CMD ["node", "index.js"];

