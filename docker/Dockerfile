# Development image for the Tiny Internet nodes.
#
# One image serves ALPHA, BRAVO, and CHARLIE. A node is not a different
# artifact - it is the same repo running a different process, exactly as it
# is on the Raspberry Pis. The repo is bind-mounted at runtime, so an edit on
# the laptop is live in the container with no rebuild.
FROM node:26-bookworm-slim

# Tools the stages need for verification from inside a node:
#   dig, nslookup  - Stage 1, checking your own zone answers
#   nc, telnet     - Stage 2, driving the TCP server by hand
#   curl           - Stage 3 and up, hitting the site
#   tcpdump        - reading the wire when a packet does not look right
#   iproute2, iputils-ping - addresses and reachability between nodes
RUN apt-get update && apt-get install --yes --no-install-recommends \
      ca-certificates \
      libcap2-bin \
      curl \
      dnsutils \
      iproute2 \
      iputils-ping \
      netcat-openbsd \
      tcpdump \
      telnet \
  && rm --recursive --force /var/lib/apt/lists/*

# pnpm, pinned to the version in the root package.json "packageManager" field.
# Node 26 images no longer bundle corepack, so install it outright.
ARG PNPM_VERSION=11.2.2
RUN npm install --global --no-fund --no-audit "pnpm@${PNPM_VERSION}"

WORKDIR /workspace

# Grant the node binary the ability to bind privileged ports without being root,
# which is one of the answers Stage 1 asks you to choose between on the Pi.
# The container then runs as the unprivileged `node` user, so binding port 53
# stays a real problem with a real solution instead of being erased by root.
RUN setcap cap_net_bind_service=+ep "$(readlink --canonicalize "$(command -v node)")"

# tcpdump likewise, so you can read the wire without a root shell.
RUN setcap cap_net_raw,cap_net_admin=+ep /usr/bin/tcpdump

# Docker seeds an empty named volume from the image path it covers, ownership
# included. Creating these as `node` first is what makes the node_modules and
# pnpm-store volumes in compose.yaml writable by the unprivileged user.
RUN mkdir --parents /workspace/node_modules /workspace/.pnpm-store \
  && chown --recursive node:node /workspace

USER node

# pnpm's global bin. The store is NOT relocated by config: pnpm insists on a
# store on the same filesystem as the project so it can hardlink, and ignores
# the store-dir setting when that would cross filesystems. The .pnpm-store
# volume in compose.yaml is what keeps those ~124MB of linux packages out of
# the bind-mounted working copy.
ENV PNPM_HOME=/home/node/.local/share/pnpm
ENV PATH="${PNPM_HOME}:${PATH}"

ENV NODE_ENV=development

CMD ["sleep", "infinity"]
