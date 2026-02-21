#!/bin/bash

echo "Generating proto types..."

pnpm exec ./bin/protoc \
  --ts_proto_out=. \
  --ts_proto_opt=nestJs=true,esModuleInterop=true,forceLong=string \
  -I . \
  user/user.proto

pnpm exec ./bin/protoc \
  --ts_proto_out=. \
  --ts_proto_opt=nestJs=true,esModuleInterop=true,forceLong=string \
  -I . \
  logger/logger.proto

echo "Proto generation completed!"