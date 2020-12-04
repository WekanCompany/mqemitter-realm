# mqemitter-realm 

MongoDB Realm powered [MQEmitter](https://github.com/WekanCompany/mqemitter-realm).

## Install

```bash
$ npm install mqemitter-realm
```

## Example

```javascript
const realmEmitter = require('mqemitter-realm');

const aedes = require('aedes')({
  mq: realmEmitter({
    appId: process.env.AEDES_REALM_APP_ID,
    email: process.env.AEDES_REALM_EMAIL,
    password: process.env.AEDES_REALM_PASSWORD,
    schema: sensorSchema,
    compactionThreshold: 20,
    topics: [
      {
        name: 'temp/sensor-1',
        transformer: utils.transformers.temperature,
        partitionValue: 'temperature-1',
      },
      {
        name: 'humid/sensor-1',
        transformer: utils.transformers.humidity,
        partitionValue: 'humidity-1',
      },
    ],
  }),
});
```

The `examples/broker` folder provides a simple broker that uses `mqemitter-realm` to sync messages to a MongoDB server on the Atlas

## API

### realmEmitter(opts)

Create a new instance of mqemitter-mongodb.

#### Options

- `appId`: a realm app id

- `email`: the realm app user's email 
- `password`: the realm app user's password

*We currently only support Email / Password authentication, but we will be adding the remaining authentication providers in the future.*

- `schema`: an object schema defining the model to which the messages are saved

*Take a look at [SensorSchema](examples/broker/src/models/sensor.js) to see an example of an object schema*

- `compactionThreshold`: 50

*The size is defined in MB. Defaults to 100 MB if not provided.*

- `topics`: An array of objects representing the data to save and where to save it.
  - `name`: a topic to listen to for incoming messages
  - `transformer`: Optional callback used to transform the message payload before saving it into realm
  - `partitionValue`: Value used to partition and group data with the same value into a separate realm

## License

MIT
