# Ninja Web Client

This document provides instructions for setting up and running the Ninja web client on different platforms.

## For Mac Client

To run the Ninja web client on a Mac, use the following command:

./web-client.mac

## For Server

To run the Ninja web client as a server, use the following command with the specified certificate and key files:

./web-client.lnx --server --certfile=/etc/letsencrypt/live/chat.simplenets.org/fullchain.pem --keyfile=/etc/letsencrypt/live/chat.simplenets.org/privkey.pem