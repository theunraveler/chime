// https://aws.github.io/amazon-chime-sdk-js/modules/apioverview.html

class Meeting {
    constructor(meeting_config, attendee_config) {
        const configuration = new ChimeSDK.MeetingSessionConfiguration(meeting_config, attendee_config);
        const logger = new ChimeSDK.ConsoleLogger('ChimeMeetingLogs', ChimeSDK.LogLevel.INFO);
        this.deviceController = new ChimeSDK.DefaultDeviceController(logger);
        this.meetingSession = new ChimeSDK.DefaultMeetingSession(configuration, logger, this.deviceController);
        this.meetingSession.audioVideo.addObserver(this);
    }

    async init() {
        await Promise.all([this.#bindAudio(), this.#bindVideo()]);
        this.meetingSession.audioVideo.start();
    }

    audioVideoDidStart() {
        console.log('A/V Started');
    }

    videoTileDidUpdate(tileState) {
        this.#ensureVideoTile(tileState);
        this.#updateVideoTile(tileState);
    }

    videoTileWasRemoved(tileId) {
        const tile = this.#getTileElement(tileId);
        tile.parentNode.removeChild(tile);
    }

    async #bindAudio() {
        try {
            const audioInputDevices = await this.meetingSession.audioVideo.listAudioInputDevices();
            if (audioInputDevices.length > 0) {
                await this.meetingSession.audioVideo.chooseAudioInputDevice(audioInputDevices[0].deviceId);
            }
            const audioOutputDevices = await this.meetingSession.audioVideo.listAudioOutputDevices();
            if (audioOutputDevices.length > 0) {
                await this.meetingSession.audioVideo.chooseAudioOutputDevice(audioOutputDevices[0].deviceId);
            }
        } catch (error) {
            console.error(error);
        }

        try {
            await this.meetingSession.audioVideo.bindAudioElement(this.#audioOutputElement);
        } catch (error) {
            console.error('Failed to bind audio element', error);
        }
    }

    async #bindVideo() {
        try {
            const videoInputDevices = await this.meetingSession.audioVideo.listVideoInputDevices();
            await this.meetingSession.audioVideo.chooseVideoInputDevice(videoInputDevices[0].deviceId);
            this.meetingSession.audioVideo.startLocalVideoTile();
        } catch (error) {
            console.error(error);
        }
    }

    #ensureVideoTile(tileState) {
        if (this.#getTileElement(tileState.tileId)) {
            return;
        }
        
        const tile = document.createElement('div')
        tile.id = 'tile-' + tileState.tileId;
        tile.classList.add('video-tile');
        if (tileState.localTile) {
            tile.classList.add('local');
        }
        this.#videoTilesElement.appendChild(tile);

        const video = document.createElement('video');
        tile.appendChild(video);

        const name = document.createElement('span')
        name.classList.add('name');
        tile.appendChild(name);

        this.meetingSession.audioVideo.bindVideoElement(tileState.tileId, video);
    }

    #updateVideoTile(tileState) {
        const tile = this.#getTileElement(tileState.tileId);
        tile.querySelectorAll('.name')[0].textContent = tileState.boundExternalUserId;
    }

    #getTileElement(tileId) {
        return document.getElementById('tile-' + tileId)
    }

    get #audioOutputElement() {
        return document.getElementById('audio');
    }

    get #videoTilesElement() {
        return document.getElementById('video-tiles');
    }
}