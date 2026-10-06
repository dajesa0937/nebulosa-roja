FROM node:22-alpine
WORKDIR /app
COPY package.json server.js ./
ENV PORT=8787 DATA_FILE=/data/data.json
VOLUME /data
EXPOSE 8787
USER node
CMD ["node", "server.js"]
