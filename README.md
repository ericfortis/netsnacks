# netsnacks

Network utilities for web development.


### Install
**Node.js must be installed.**

```sh
npm install -g netsnacks
```


## Overview
```sh
netsnacks <command> <args>
```


### Commands
- `time`: Measures request response timings (DNS lookup, TCP/TLS handshakes, etc.)
- `certperiod`: Shows expiration date and validity of a TLS certificate
- `selftls`: Creates a self-signed TLS certificate
- `macloop`: Creates a persistent loopback interface on macOS
- `skipdns`: Sends a HEAD request to a TLS domain using a specific IP
- `sshkeygen`: Creates an SSH key pair and configures its entry in `~/.ssh/config`

