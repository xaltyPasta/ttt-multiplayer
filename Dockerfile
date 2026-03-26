# Use official Nakama image
FROM heroiclabs/nakama:3.21.1

# Copy your compiled JS modules into Nakama runtime
COPY ./nakama/build /nakama/data/modules

# Expose required ports
EXPOSE 7350 7349 7351

# Start Nakama with environment variables (Render will inject these)
CMD ["/bin/sh", "-ecx", "\
    /nakama/nakama migrate up --database.address ${DATABASE_URL} && \
    exec /nakama/nakama \
    --name nakama1 \
    --database.address ${DATABASE_URL} \
    --logger.level INFO \
    --session.token_expiry_sec 7200 \
    --socket.server_key=${SERVER_KEY} \
    --runtime.http_key=${HTTP_KEY} \
    --session.encryption_key=${ENC_KEY} \
    --session.refresh_encryption_key=${REFRESH_KEY} \
    --console.port 7351 \
    "]