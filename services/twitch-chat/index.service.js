const tmijs = require('tmi.js');

const TMIjsEventCategoryMap = require('./normalize/EventNormalizeMap');
const Normalizer = require('./normalize');

module.exports = {
  name: 'twitch-chat',

  mixins: [require('../mixin-nodeRestartOnDisconnect')],

  created() {
    const client = new tmijs.Client({
      // @ts-ignore
      options: { skipUpdatingEmotesets: true, messagesLogLevel: 'info', logLevel: 'info' },
      connection: {
        reconnect: true,
        secure: true
      },
      identity: {
        username: process.env.TMIJS_USERNAME,
        password: process.env.TMIJS_PASSWORD
      }
    });

    this.tmijs = client;

    this.normalizer = new Normalizer();
  },

  async started() {
    this.tmijs.connect().catch(console.error);

    Object.keys(TMIjsEventCategoryMap).forEach(eventName => {
      this.tmijs.on(eventName, this.delegateIRCEvent.bind(this, eventName));
    });

    // Notify log that we're connected
    this.tmijs.on('connected', () => {
      this.logger.info('Connected to Twitch IRC!');
    });

    // Notify log that we're connected
    this.tmijs.on('disconnected', () => {
      this.logger.info('Lost connection to Twitch IRC!');
    });

    this.logger.info('Started TMIjs Service!');
  },

  async stopped() {
    this.tmijs.disconnect();
    this.tmijs.removeAllListeners();
    this.tmijs = null;

    this.logger.info('Stopped TMIjs Service!');
  },

  actions: {
    joinChannel: {
      params: {
        connectTarget: 'string'
      },
      async handler(ctx) {
        const { connectTarget } = ctx.params;

        try {
          await this.tmijs.join(connectTarget);
          this.logger.info(`Joined Channel: ${connectTarget}`);
        } catch (err) {
          this.logger.error(err);
          throw err;
        }

        return true;
      }
    },

    partChannel: {
      params: {
        connectTarget: 'string'
      },
      async handler(ctx) {
        const { connectTarget } = ctx.params;

        try {
          await this.tmijs.part(connectTarget);
          this.logger.info(`Parted Channel: ${connectTarget}`);
        } catch (err) {
          this.logger.error(err);
          // throw err; //!FIXME THis was causing the service to stop working... not sure why.. figure this out?
        }

        return true;
      }
    }
  },

  methods: {
    // Note: because of *what* events we're listening to, we can assume the first param is `channel`
    // TODO: Verify this is safe ^^^^
    // TODO: Look at wrapping in a middleware (https://moleculer.services/docs/0.14/middlewares.html#localMethod-next-method)
    //       Middleware will validate with REDIS if we need to normalize at all, or break out!
    delegateIRCEvent(eventName, channel, ...incomingEventArguments) {
      this.logger.info(`Incoming Data: (${eventName}) ${channel} ->`, incomingEventArguments);

      const normalizedContext = this.normalizer.normalize(eventName, incomingEventArguments);

      const { timestamp, eventClassification, normalizedData } = normalizedContext;

      /** @type {import('golden-hammer-shared').NormalizedMessagingEvent} */
      const normalizedEvent = {
        timestamp,
        pubSubMsgId: 'INVALID_MSG_ID',
        eventClassification,
        connectTarget: channel.replace('#', ''),
        eventData: normalizedData,
        platform: {
          name: 'twitch',
          eventName,
          eventData: incomingEventArguments
        }
      };

      // Emit the normalized data as a generic `gh-chat.evented` message!
      this.broker.emit('gh-chat.evented', normalizedEvent);
    }
  }
};