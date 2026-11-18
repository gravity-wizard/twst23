/**
 * Twisted23 Backgammon — 2 Remote Players Manager & Social Invite Suite
 * Dual-Channel: Direct P2P WebRTC DataChannel (<40ms) + Hostinger Cloud Room Relay Fallback
 */

(function (window) {
  'use strict';

  class BackgammonRemote {
    constructor() {
      this.roomId = null;
      this.role = null; // 'white' (host) or 'red' (guest)
      this.token = null;
      this.status = 'idle'; // 'idle', 'waiting', 'connected', 'disconnected'
      this.transport = 'none'; // 'webrtc' or 'cloud'
      this.hostName = 'Player 1';
      this.guestName = 'Player 2';
      this.diceVariant = 'standard';
      this.lastSeq = 0;
      this.processedSeqs = new Set();
      this.pollTimer = null;
      this.pollIntervalMs = 900;
      this.pc = null;
      this.dc = null;
      this.iceCandidatesSent = 0;
      this.lastCandidateTs = 0;
      this.onEventHandler = null;
      this.onStatusHandler = null;
      this.onChatHandler = null;

      this.iceServers = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
      ];
    }

    getBaseUrl() {
      const loc = window.location;
      return loc.protocol + '//' + loc.host + loc.pathname;
    }

    getInviteUrl(roomId) {
      const base = this.getBaseUrl();
      return base + (base.includes('?') ? '&' : '?') + 'room=' + encodeURIComponent(roomId);
    }

    getShareUrls(roomId) {
      const inviteUrl = this.getInviteUrl(roomId);
      const text = `🎲 Join my live 2-player Backgammon match on Twisted23! 3D-in-2D 36-roll dice & AxLe variants. Room: ${roomId}`;
      const encodedText = encodeURIComponent(text);
      const encodedUrl = encodeURIComponent(inviteUrl);

      return {
        url: inviteUrl,
        text: text,
        twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
        whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(text + '\n' + inviteUrl)}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
        reddit: `https://reddit.com/submit?url=${encodedUrl}&title=${encodeURIComponent('Live 2-Player Backgammon Match on Twisted23')}`,
        email: `mailto:?subject=${encodeURIComponent('🎲 Play Backgammon with me on Twisted23!')}&body=${encodeURIComponent(text + '\n\nClick link to join directly:\n' + inviteUrl)}`,
      };
    }

    async shareNative(roomId) {
      const shares = this.getShareUrls(roomId);
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'Twisted23 Backgammon Match',
            text: shares.text,
            url: shares.url,
          });
          return { success: true, method: 'native' };
        } catch (err) {
          if (err.name === 'AbortError') return { success: false, aborted: true };
        }
      }
      // Fallback: clipboard copy
      try {
        await navigator.clipboard.writeText(shares.url);
        return { success: true, method: 'clipboard' };
      } catch (e) {
        return { success: false, method: 'manual', url: shares.url };
      }
    }

    renderQR(containerId, url) {
      const container = document.getElementById(containerId);
      if (!container) return;
      container.innerHTML = '';
      if (typeof window.QRCode === 'function') {
        new window.QRCode(container, {
          text: url,
          width: 148,
          height: 148,
          colorDark: '#070d18',
          colorLight: '#f8fafc',
          correctLevel: window.QRCode.CorrectLevel.M,
        });
      } else {
        container.innerHTML = `<a href="${url}" target="_blank" style="color:#38bdf8;font-size:0.75rem;">${url}</a>`;
      }
    }

    async createRoom(hostName = 'Player 1 (White)', diceVariant = 'standard') {
      this.hostName = hostName;
      this.diceVariant = diceVariant;
      this.role = 'white';

      try {
        const res = await fetch('api.php?action=create_room', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hostName, diceVariant }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Failed to create room');

        this.roomId = data.roomId;
        this.token = data.token;
        this.status = 'waiting';
        this.emitStatus('waiting', 'Room created. Share invite link with opponent!');

        // Start cloud polling for joiner
        this.startPolling();

        // Prepare WebRTC host peer connection
        this.setupWebRTC(true);

        return data;
      } catch (err) {
        console.error('Create room error:', err);
        throw err;
      }
    }

    async joinRoom(roomId, guestName = 'Player 2 (Red)') {
      this.roomId = roomId.toUpperCase().trim();
      this.guestName = guestName;
      this.role = 'red';

      try {
        const res = await fetch('api.php?action=join_room', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId: this.roomId, guestName }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Failed to join room');

        this.token = data.token;
        this.hostName = data.hostName || 'Player 1';
        this.diceVariant = data.diceVariant || 'standard';
        this.status = 'connected';
        this.emitStatus('connected', `Connected to ${this.hostName}'s match!`);

        this.startPolling();

        // Setup WebRTC joiner peer connection
        this.setupWebRTC(false);

        // Process any existing room events
        if (data.room && Array.isArray(data.room.events)) {
          this.processEvents(data.room.events);
        }

        return data;
      } catch (err) {
        console.error('Join room error:', err);
        throw err;
      }
    }

    setupWebRTC(isHost) {
      if (!window.RTCPeerConnection) {
        console.warn('WebRTC not supported, using Hostinger cloud relay.');
        this.transport = 'cloud';
        return;
      }

      try {
        this.pc = new RTCPeerConnection({ iceServers: this.iceServers });

        this.pc.onicecandidate = (e) => {
          if (e.candidate) {
            this.sendSignal('candidate', e.candidate);
          }
        };

        this.pc.onconnectionstatechange = () => {
          const state = this.pc.connectionState;
          if (state === 'connected') {
            this.transport = 'webrtc';
            this.emitStatus('connected', '⚡ Direct P2P Connected (Zero Latency)');
          } else if (state === 'failed' || state === 'disconnected') {
            this.transport = 'cloud';
            this.emitStatus('connected', '☁ Cloud Relay Active');
          }
        };

        if (isHost) {
          // Host creates data channel
          this.dc = this.pc.createDataChannel('twst23-bg', { ordered: true });
          this.bindDataChannel(this.dc);

          // Create offer
          this.pc.createOffer().then((offer) => {
            return this.pc.setLocalDescription(offer);
          }).then(() => {
            this.sendSignal('offer', this.pc.localDescription);
          }).catch((err) => {
            console.warn('WebRTC offer error, falling back to cloud:', err);
            this.transport = 'cloud';
          });
        } else {
          // Joiner listens for data channel
          this.pc.ondatachannel = (e) => {
            this.dc = e.channel;
            this.bindDataChannel(this.dc);
          };
        }
      } catch (err) {
        console.warn('WebRTC setup failed, fallback to cloud:', err);
        this.transport = 'cloud';
      }
    }

    bindDataChannel(dc) {
      dc.onopen = () => {
        this.transport = 'webrtc';
        this.emitStatus('connected', '⚡ Direct P2P Connected (Zero Latency)');
      };

      dc.onclose = () => {
        this.transport = 'cloud';
        this.emitStatus('connected', '☁ Cloud Relay Active');
      };

      dc.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          this.handleIncomingAction(data);
        } catch (err) {
          console.error('DataChannel parse error:', err);
        }
      };
    }

    async sendSignal(type, data) {
      if (!this.roomId || !this.token) return;
      try {
        await fetch('api.php?action=signal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId: this.roomId, token: this.token, type, data }),
        });
      } catch (e) {
        // Silently continue
      }
    }

    startPolling() {
      this.stopPolling();
      const poll = async () => {
        if (!this.roomId || !this.token) return;
        try {
          const res = await fetch(`api.php?action=poll&room=${encodeURIComponent(this.roomId)}&since=${this.lastSeq}&token=${encodeURIComponent(this.token)}`);
          if (!res.ok) return;
          const data = await res.json();
          if (data.success) {
            // Update names and status
            if (data.hostName) this.hostName = data.hostName;
            if (data.guestName) this.guestName = data.guestName;

            if (this.status === 'waiting' && data.status === 'active') {
              this.status = 'connected';
              this.emitStatus('connected', `Opponent joined! (${this.guestName})`);
            }

            // WebRTC Signaling handling via poll
            if (this.role === 'red' && data.signals && data.signals.offer && this.pc && !this.pc.currentRemoteDescription) {
              await this.pc.setRemoteDescription(new RTCSessionDescription(data.signals.offer));
              const answer = await this.pc.createAnswer();
              await this.pc.setLocalDescription(answer);
              await this.sendSignal('answer', answer);
            } else if (this.role === 'white' && data.signals && data.signals.answer && this.pc && !this.pc.currentRemoteDescription) {
              await this.pc.setRemoteDescription(new RTCSessionDescription(data.signals.answer));
            }

            // Fetch ICE candidates
            if (this.pc && this.pc.remoteDescription) {
              this.fetchIceCandidates();
            }

            // Process game events
            if (Array.isArray(data.events) && data.events.length > 0) {
              this.processEvents(data.events);
            }
            if (typeof data.lastSeq === 'number') {
              this.lastSeq = Math.max(this.lastSeq, data.lastSeq);
            }
          }
        } catch (e) {
          // Poll error, will retry
        }
      };

      this.pollTimer = setInterval(poll, this.pollIntervalMs);
      poll(); // Immediate first poll
    }

    async fetchIceCandidates() {
      try {
        const res = await fetch(`api.php?action=get_candidates&room=${encodeURIComponent(this.roomId)}&token=${encodeURIComponent(this.token)}&since=${this.lastCandidateTs}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.candidates)) {
          for (const candItem of data.candidates) {
            if (candItem.candidate && this.pc) {
              try {
                await this.pc.addIceCandidate(new RTCIceCandidate(candItem.candidate));
              } catch (e) {
                // Ignore duplicate candidate
              }
            }
            if (candItem.ts > this.lastCandidateTs) {
              this.lastCandidateTs = candItem.ts;
            }
          }
        }
      } catch (e) {}
    }

    stopPolling() {
      if (this.pollTimer) {
        clearInterval(this.pollTimer);
        this.pollTimer = null;
      }
    }

    processEvents(events) {
      for (const ev of events) {
        if (!ev || typeof ev.seq !== 'number') continue;
        if (this.processedSeqs.has(ev.seq)) continue;
        this.processedSeqs.add(ev.seq);
        this.lastSeq = Math.max(this.lastSeq, ev.seq);

        // Don't replay our own events back to ourselves
        if (ev.player === this.role && ev.type !== 'player_joined') continue;

        this.handleIncomingAction(ev);
      }
    }

    handleIncomingAction(action) {
      if (action.type === 'chat') {
        if (this.onChatHandler) this.onChatHandler(action);
      } else if (this.onEventHandler) {
        this.onEventHandler(action);
      }
    }

    async sendAction(type, payload = {}) {
      if (!this.roomId || !this.token) return;

      const event = {
        type,
        player: this.role,
        payload,
        timestamp: Date.now(),
      };

      // 1. Direct P2P send via WebRTC DataChannel if open
      let sentP2P = false;
      if (this.dc && this.dc.readyState === 'open') {
        try {
          this.dc.send(JSON.stringify(event));
          sentP2P = true;
        } catch (e) {
          sentP2P = false;
        }
      }

      // 2. Always persist event to Hostinger Cloud Room log
      try {
        const res = await fetch('api.php?action=send_event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId: this.roomId,
            token: this.token,
            type,
            payload,
          }),
        });
        const data = await res.json();
        if (data.success && data.seq) {
          this.processedSeqs.add(data.seq);
          this.lastSeq = Math.max(this.lastSeq, data.seq);
        }
      } catch (err) {
        console.error('Send event to cloud error:', err);
      }

      return { sentP2P };
    }

    sendChat(text) {
      return this.sendAction('chat', { text, sender: this.role === 'white' ? this.hostName : this.guestName });
    }

    onEvent(fn) {
      this.onEventHandler = fn;
    }

    onStatus(fn) {
      this.onStatusHandler = fn;
    }

    onChat(fn) {
      this.onChatHandler = fn;
    }

    emitStatus(status, message) {
      this.status = status;
      if (this.onStatusHandler) {
        this.onStatusHandler({
          status,
          message,
          transport: this.transport,
          role: this.role,
          roomId: this.roomId,
          hostName: this.hostName,
          guestName: this.guestName,
        });
      }
    }

    leaveRoom() {
      this.stopPolling();
      if (this.dc) {
        try { this.dc.close(); } catch (e) {}
        this.dc = null;
      }
      if (this.pc) {
        try { this.pc.close(); } catch (e) {}
        this.pc = null;
      }
      this.roomId = null;
      this.token = null;
      this.role = null;
      this.status = 'idle';
      this.transport = 'none';
      this.emitStatus('idle', 'Disconnected from match room');
    }
  }

  window.BackgammonRemote = BackgammonRemote;

})(typeof window !== 'undefined' ? window : this);
