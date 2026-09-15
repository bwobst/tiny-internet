#!/bin/sh
# Start sshd (needs root), then run the real command as `node`.
# Host keys are generated once per container so ALPHA/BRAVO/CHARLIE
# do not all share one host identity.
set -eu

if [ ! -f /etc/ssh/ssh_host_ed25519_key ]; then
  sudo ssh-keygen -A
fi

# Daemonize. Fail soft if a previous start left sshd up (compose restart).
sudo /usr/sbin/sshd || true

exec "$@"
