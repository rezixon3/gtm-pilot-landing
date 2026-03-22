FROM node:20-alpine
WORKDIR /app
RUN npm install -g serve@14
COPY dist ./dist
ENV PORT=3000
EXPOSE 3000
CMD sh -c "serve dist -s -l tcp://0.0.0.0:${PORT}"
