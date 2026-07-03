FROM ubuntu:22.04

# Avoid interactive prompts during package installs
RUN echo 'debconf debconf/frontend select Noninteractive' | debconf-set-selections

# Install only essential dependencies (no Docker-in-Docker — mount the socket instead)
RUN apt-get update && apt-get install -y \
    curl \
    git \
    jq \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root runner user with no sudo access
RUN useradd -m runner
WORKDIR /home/runner

# Pin to a specific, verified GitHub Actions Runner release
ARG RUNNER_VERSION=2.323.0
ARG RUNNER_SHA256=0dd845b9f68f4731f07e545b770e0a75f56794757a0db9105b736e58bdae0b0c

RUN curl -o actions-runner-linux-x64.tar.gz -L \
    "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz" && \
    echo "${RUNNER_SHA256}  actions-runner-linux-x64.tar.gz" | sha256sum -c && \
    tar xzf ./actions-runner-linux-x64.tar.gz && \
    rm actions-runner-linux-x64.tar.gz

# Install runner dependencies
RUN ./bin/installdependencies.sh

USER runner

COPY runner-setup.sh .
ENTRYPOINT ["./runner-setup.sh"]
