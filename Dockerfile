FROM heroiclabs/nakama:3.21.1

# Copy your modules
COPY ./nakama/build /nakama/data/modules

# Expose ports
EXPOSE 7350 7349 7351

# Proper shell CMD (NO brackets)
CMD /bin/sh -c "\
    echo 'Using DATABASE_URL='$DATABASE_URL && \
    /nakama/nakama migrate up --database.address \"$DATABASE_URL\" && \
    exec /nakama/nakama \
    --name nakama1 \
    --database.address \"$DATABASE_URL\" \
    --logger.level INFO \
    --session.token_expiry_sec 7200 \
    --socket.server_key=\"$SERVER_KEY\" \
    --runtime.http_key=\"$HTTP_KEY\" \
    --session.encryption_key=\"$ENC_KEY\" \
    --session.refresh_encryption_key=\"$REFRESH_KEY\" \
    --console.port 7351 \
    "