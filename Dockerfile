FROM oven/bun:1

# Install ffmpeg
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package.json first
COPY package.json ./

# Install dependencies
RUN bun install

# Copy the rest of the application
COPY . .

# Create output directory and set permissions
RUN mkdir -p output/final output/audio output/video && \
    chmod -R 777 output

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["bun", "run", "src/server.ts"]