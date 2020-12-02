'use strict'

const events = require('events')
const inherits = require('inherits')
const MQEmitter = require('mqemitter')
const Realm = require('realm')
const realmUtils = require('./realm')
const fs = require('fs')

const eventEmitter = new events.EventEmitter()
const SYNC_MESSAGES = 'sync_message'

eventEmitter.on(SYNC_MESSAGES, syncMessages)

function RealmEmitter (opts) {
  if (!(this instanceof RealmEmitter)) {
    return new RealmEmitter(opts)
  }

  this._schemaName = ''
  this._topics = []
  this._partitionValues = []
  this._transformers = {}
  this._realms = {}

  // Holds incoming messages
  this._messages = []
  /**
   Whenever a configured topic receives a message, we calculate the difference
   between the current and the last sync timestamp. If the difference exceeds
   this value, we trigger the SYNC_MESSAGES event, which calls syncMessages

   Defined in seconds
   */
  this._syncInterval = 5
  this._lastSyncTimestamp = Date.now()
  /**
   Instead of running syncMessages every few seconds via setInterval,
   we trigger it in the emit method.

   Since we could end up with unsynced messages if clients stop sending
   messages to the configured topics, we use setInterval to call syncMessages
   at longer intervals to sync the remaining messages

   Defined in seconds
   */
  this._cleanupInterval = 60
  this._compactionInterval = 60 * 60
  this._isCompacting = false

  try {
    if (opts && opts.schema && opts.topics) {
      const config = {
        schema: [opts.schema]
      }

      this.schemaName = opts.schema.name

      if (opts.realmUser) {
        this._realmUser = opts.realmUser
        config.sync = { user: opts.realmUser }
      }

      // Size in MB
      this._compactionThreshold = opts.compactionThreshold || 100

      this._topics = opts.topics.map((item) => item.name)
      this._partitionValues = opts.topics.map(
        (item) => item.partitionValue
      )
      this._transformers = opts.topics.map((item) => item.transformer)

      config.shouldCompactOnLaunch = (totalSize, usedSize) => {
        console.log(
          `[MQEmitter-Realm] Compact on launch - Realm used size: ${usedSize / 1e6} mb, ` +
          `Compaction threshold: ${this._compactionThreshold} mb`)
        return usedSize > this._compactionThreshold
      }

      for (let i = 0; i < this._partitionValues.length; i += 1) {
        const partitionValue = String(this._partitionValues[i])
        config.sync.partitionValue = partitionValue
        this._realms[partitionValue] = new Realm(config)
      }

      setInterval(() => {
        for (let i = 0; i < this._partitionValues.length; i += 1) {
          const partitionValue = String(this._partitionValues[i])

          const stats = fs.statSync(this._realms[partitionValue].path)
          const currentSize = stats.size
          const thresholdInBytes = this._compactionThreshold * 1e6

          console.log(
            '[MQEmitter-Realm] ' +
            `Current Realm Size in Bytes: ${currentSize}, ` +
            `Configured Threshold in Bytes: ${thresholdInBytes}`)

          if (currentSize >= thresholdInBytes) {
            console.log('[MQEmitter-Realm] Compacting realm ...')

            try {
              this._isCompacting = true
              clearInterval(this._cleanupIntervalInstance)

              this._realms[partitionValue].compact()
              console.log('[MQEmitter-Realm] Compaction completed')

              this._isCompacting = false
              this.startCleanup()
            } catch (error) {
              console.log('[MQEmitter-Realm] Failed compaction', error)
            }
          }
        }
      }, this._compactionInterval * 1000)

      this.startCleanup()
    }
  } catch (error) {
    console.log('[MQEmitter-Realm] Failed to ', error)
  }

  MQEmitter.call(this, opts)
}

RealmEmitter.prototype.emit = function emit (message, cb) {
  cb = cb || noop

  if (this.closed) {
    return cb(new Error('mqemitter is closed'))
  }

  try {
    if (this._topics.includes(message.topic)) {
      const timestamp = Date.now()

      this._messages.push(message)

      if (
        !this._isCompacting &&
        (timestamp - this._lastSyncTimestamp) * 0.001 > this._syncInterval) {
        eventEmitter.emit(
          SYNC_MESSAGES,
          this._realms,
          this._messages,
          this._topics,
          this._partitionValues,
          this._transformers,
          this.schemaName
        )
        this._messages = []
        this._lastSyncTimestamp = timestamp
      }
    }
  } catch (error) {
    console.log('[MQEmitter-Realm] Emit messages failed', error)
  }

  // The above was just a hook to capture the message, now we pass it on to
  // the real emitter so it can be passed on to other subscribers
  MQEmitter.prototype.emit.call(this, message, cb)
  return this
}

RealmEmitter.prototype.close = function close (cb) {
  for (let i = 0; i < this._partitionValues.length; i += 1) {
    this._realms[this._partitionValues[i]].removeAllListeners()
    this._realms[this._partitionValues[i]].close()
  }

  if (realmUtils.app.currentUser) {
    realmUtils.app.currentUser.logOut()
  }

  this.closed = true
  setImmediate(cb)

  return this
}

inherits(RealmEmitter, MQEmitter)

RealmEmitter.prototype.startCleanup = function startCleanup () {
  this._cleanupIntervalInstance = setInterval(
    () =>
      eventEmitter.emit(
        SYNC_MESSAGES,
        this._realms,
        this._messages,
        this._topics,
        this._partitionValues,
        this._transformers,
        this.schemaName
      ),
    this._cleanupInterval * 1000
  )
}

function prepareBulkWrite (realm, messages, topic, transformer, schemaName) {
  let payload = ''

  for (const message of messages) {
    if (message.topic === topic) {
      payload = transformer(message.payload)
      realm.create(schemaName, payload)
    }
  }
}

function syncMessages (
  realms,
  messages,
  topics,
  partitionValues,
  transformers,
  schemaName
) {
  try {
    for (let i = 0; i < partitionValues.length; i += 1) {
      const realm = realms[String(partitionValues[i])]
      if (realm && messages.length > 0) {
        realm.write(() =>
          prepareBulkWrite(
            realm,
            messages,
            topics[i],
            transformers[i],
            schemaName
          )
        )
      }
    }
  } catch (error) {
    console.log('[MQEmitter-Realm] Sync messages failed', error)
  }
}

function noop () {}

module.exports = RealmEmitter
