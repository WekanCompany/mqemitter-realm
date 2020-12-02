'use strict';

const realmEmitter = require('mqemitter-realm');
const sensorSchema = require('./models/sensor');
const utils = require('./utils');

const main = async () => {

  try {
    const user = await utils.realm.loginEmailPassword(
      process.env.AEDES_REALM_EMAIL,
      process.env.AEDES_REALM_PASSWORD
    );

    const aedes = require('aedes')({

      mq: realmEmitter({
        realmUser: user,
        app: utils.realm.app,
        schema: sensorSchema,
        // Size in mb
        // compactionThreshold: 50,
        topics: [
          {
            name: 'temp/sensor-1',
            transformer: utils.transformers.temperature,
            partitionValue: 'temperature-1',
          },
          {
            name: 'temp/sensor-2',
            transformer: utils.transformers.temperature,
            partitionValue: 'temperature-2',
          },
          {
            name: 'humid/sensor-1',
            transformer: utils.transformers.humidity,
            partitionValue: 'humidity-1',
          },
        ],
      }),
    });

    const server = require('net').createServer(aedes.handle);
    const port = 1883;

    server.listen(port, () => {
      console.log('Server started and listening on port ', port);
    });
  } catch(error) {
    console.log("Failed to initialize broker", error)    
  }
};

main();
