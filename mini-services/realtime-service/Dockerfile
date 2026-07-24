FROM oven/bun:latest

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install

COPY index.ts .

EXPOSE 3003

CMD ["bun", "run", "start"]
